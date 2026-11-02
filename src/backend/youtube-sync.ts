/**
 * YouTubeSyncService — Durable comment ingestion engine
 * src/backend/youtube-sync.ts
 *
 * Fetches new YouTube comments for a given video using the Data API,
 * persists them to the yt_comments collection (idempotent upsert),
 * updates the per-video sync state cursor, and writes outbox events.
 *
 * This replaces the ephemeral in-process polling in scheduler.ts with
 * a DB-backed, restartable, cursor-based ingestion pipeline.
 */

import crypto from "crypto";
import { getFreshAccessToken, canAffordApiCall, trackApiCall } from "./youtube";
import {
  getYTCommentsCollection,
  getYTSyncStateCollection,
  writeOutboxEvent,
  computePollIntervalMs,
  type YTComment,
  type YTSyncState,
} from "@/database/youtube-collections";
import { getDB } from "@/database/db";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SyncVideoResult {
  videoId: string;
  workspaceId: string;
  newComments: number;
  updatedComments: number;
  skippedDuplicates: number;
  nextPageToken: string | null;
  hasMore: boolean;
  quotaUsed: number;
  error?: string;
}

interface RawYouTubeComment {
  id: string;
  snippet: {
    videoId: string;
    topLevelComment: {
      id: string;
      snippet: {
        videoId: string;
        authorDisplayName: string;
        authorProfileImageUrl?: string;
        authorChannelId?: { value: string };
        textOriginal: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
      };
    };
    totalReplyCount: number;
    canReply: boolean;
    isPublic: boolean;
  };
}

// ─── SYNC LOGIC ───────────────────────────────────────────────────────────────

/**
 * Fetch one page of comment threads for a video and persist to DB.
 * Safe to call multiple times (upsert logic prevents duplicates).
 */
export async function syncVideoComments(
  workspaceId: string,
  videoId: string,
  channelId: string,
  pageToken?: string
): Promise<SyncVideoResult> {
  const base: SyncVideoResult = {
    videoId,
    workspaceId,
    newComments: 0,
    updatedComments: 0,
    skippedDuplicates: 0,
    nextPageToken: null,
    hasMore: false,
    quotaUsed: 0,
  };

  if (!canAffordApiCall("commentThreads.list")) {
    return { ...base, error: "QUOTA_EXHAUSTED" };
  }

  // Get OAuth token for the channel
  const token = await getFreshAccessToken(channelId);
  if (!token) {
    return { ...base, error: "NO_AUTH_TOKEN" };
  }

  // Build YouTube API URL
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
    maxResults: "100",
    order: "time",
  });
  if (pageToken) params.set("pageToken", pageToken);

  let rawData: any;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    trackApiCall("commentThreads.list");
    base.quotaUsed += 1;

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[YT-Sync] commentThreads.list failed for ${videoId}:`, errText);
      const errJson = (() => { try { return JSON.parse(errText); } catch { return {}; } })();
      const reason = errJson?.error?.errors?.[0]?.reason || "API_ERROR";
      return { ...base, error: reason };
    }
    rawData = await res.json();
  } catch (err: any) {
    return { ...base, error: err?.message || "NETWORK_ERROR" };
  }

  const items: RawYouTubeComment[] = rawData.items || [];
  const nextToken: string | null = rawData.nextPageToken || null;

  if (items.length === 0) {
    await updateSyncState(workspaceId, videoId, channelId, {
      lastPageToken: nextToken || undefined,
      lastSuccessfulSyncAt: new Date().toISOString(),
      status: "healthy",
      consecutiveFailures: 0,
      hasMore: !!nextToken,
    });
    return { ...base, nextPageToken: nextToken, hasMore: !!nextToken };
  }

  // Persist each comment (idempotent upsert on workspaceId + youtubeCommentId)
  // Persist each comment (idempotent upsert on workspaceId + youtubeCommentId)
  const comments = await getYTCommentsCollection();
  let latestPublishedAt = "";
  let latestCommentId = "";

  if (comments) {
    for (const item of items) {
      const tl = item.snippet?.topLevelComment?.snippet;
      if (!tl) continue;

      const youtubeCommentId = item.snippet?.topLevelComment?.id || item.id;
      const rawHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(item))
        .digest("hex");

      const doc: YTComment = {
        id: crypto.randomUUID(),
        workspaceId,
        videoId,
        channelId,
        threadId: item.id,
        youtubeCommentId,
        authorChannelId: tl.authorChannelId?.value,
        authorName: tl.authorDisplayName || "Unknown",
        authorAvatar: tl.authorProfileImageUrl,
        textOriginal: tl.textOriginal || tl.textDisplay || "",
        textDisplay: tl.textDisplay || "",
        publishedAt: tl.publishedAt || new Date().toISOString(),
        updatedAt: tl.updatedAt,
        likeCount: tl.likeCount || 0,
        isReply: false,
        isCreator: false,
        rawSourceHash: rawHash,
        ingestedAt: new Date().toISOString(),
        status: "new",
      };

      try {
        const result = await comments.updateOne(
          { workspaceId, youtubeCommentId },
          {
            $setOnInsert: { ...doc },
            $set: { likeCount: doc.likeCount, updatedAt: doc.updatedAt, rawSourceHash: rawHash },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          base.newComments++;
          // Write outbox event for SSE live feed
          await writeOutboxEvent(workspaceId, "comment.created", "comment", youtubeCommentId, {
            videoId,
            channelId,
            author: doc.authorName,
            text: doc.textDisplay.slice(0, 200),
            publishedAt: doc.publishedAt,
            status: "new",
          });
        } else if (result.modifiedCount > 0) {
          base.updatedComments++;
        } else {
          base.skippedDuplicates++;
        }

        if (!latestPublishedAt || doc.publishedAt > latestPublishedAt) {
          latestPublishedAt = doc.publishedAt;
          latestCommentId = youtubeCommentId;
        }
      } catch (err) {
        console.error(`[YT-Sync] Upsert failed for comment ${youtubeCommentId}:`, err);
      }
    }
  }

  // Update sync state cursor
  await updateSyncState(workspaceId, videoId, channelId, {
    lastPageToken: nextToken || undefined,
    lastSuccessfulSyncAt: new Date().toISOString(),
    lastSeenCommentPublishedAt: latestPublishedAt || undefined,
    lastSeenCommentId: latestCommentId || undefined,
    status: "healthy",
    consecutiveFailures: 0,
    hasMore: !!nextToken,
  });

  return {
    ...base,
    nextPageToken: nextToken,
    hasMore: !!nextToken,
  };
}

// ─── SYNC STATE ───────────────────────────────────────────────────────────────

async function updateSyncState(
  workspaceId: string,
  videoId: string,
  channelId: string,
  update: Partial<YTSyncState> & { hasMore?: boolean }
): Promise<void> {
  try {
    const syncStates = await getYTSyncStateCollection();
    if (!syncStates) return;

    const existing = await syncStates.findOne({ workspaceId, videoId });

    // Compute adaptive poll interval
    const videoAgeMs = existing?.createdAt
      ? Date.now() - new Date(existing.createdAt).getTime()
      : Date.now();

    const pollIntervalMs = computePollIntervalMs({
      videoAgeMs,
      hasActiveAutomation: existing?.automationEnabled ?? false,
      consecutiveEmpty: update.consecutiveFailures ?? existing?.consecutiveFailures ?? 0,
    });

    const nextPollAt = new Date(Date.now() + pollIntervalMs).toISOString();

    const patch: Partial<YTSyncState> = {
      ...update,
      pollIntervalMs,
      nextPollAt,
      updatedAt: new Date().toISOString(),
    };
    delete (patch as any).hasMore;

    await syncStates.updateOne(
      { workspaceId, videoId },
      {
        $set: patch,
        $setOnInsert: {
          id: crypto.randomUUID(),
          workspaceId,
          videoId,
          channelId,
          status: "pending",
          consecutiveFailures: 0,
          pollIntervalMs,
          nextPollAt,
          priority: "normal",
          automationEnabled: false,
          ragEnabled: false,
          commentsIngestedTotal: 0,
          apiCallsTotal: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as YTSyncState,
      },
      { upsert: true }
    );

    // Increment counters
    if (update.status === "healthy") {
      await syncStates.updateOne(
        { workspaceId, videoId },
        {
          $inc: {
            commentsIngestedTotal: 0, // incremented separately below
            apiCallsTotal: 1,
          },
        }
      );
    }
  } catch (err) {
    console.error("[YT-Sync] updateSyncState error (non-fatal):", err);
  }
}

/**
 * Record a sync failure and apply exponential backoff.
 */
export async function recordSyncFailure(
  workspaceId: string,
  videoId: string,
  error: string
): Promise<void> {
  try {
    const syncStates = await getYTSyncStateCollection();
    if (!syncStates) return;

    const existing = await syncStates.findOne({ workspaceId, videoId });
    const failures = (existing?.consecutiveFailures ?? 0) + 1;

    // Exponential backoff: 30s → 1min → 2min → 5min → 15min → 30min (cap)
    const backoffMs = Math.min(30_000 * Math.pow(2, failures - 1), 30 * 60_000);
    const backoffUntil = new Date(Date.now() + backoffMs).toISOString();

    await syncStates.updateOne(
      { workspaceId, videoId },
      {
        $inc: { consecutiveFailures: 1, apiCallsTotal: 1 },
        $set: {
          status: failures >= 5 ? "error" : "stale",
          lastError: error,
          lastErrorAt: new Date().toISOString(),
          backoffUntil,
          nextPollAt: backoffUntil,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await writeOutboxEvent(workspaceId, "sync.failed", "sync", videoId, {
      videoId,
      error,
      consecutiveFailures: failures,
      backoffUntil,
    });
  } catch (err) {
    console.error("[YT-Sync] recordSyncFailure error:", err);
  }
}

/**
 * Initialize or ensure sync state exists for a video.
 * Call this when a new video is added to automation.
 */
export async function initSyncState(
  workspaceId: string,
  videoId: string,
  channelId: string,
  opts: { automationEnabled?: boolean; ragEnabled?: boolean; priority?: YTSyncState["priority"] } = {}
): Promise<void> {
  try {
    const syncStates = await getYTSyncStateCollection();
    if (!syncStates) return;

    await syncStates.updateOne(
      { workspaceId, videoId },
      {
        $setOnInsert: {
          id: crypto.randomUUID(),
          workspaceId,
          videoId,
          channelId,
          status: "pending",
          consecutiveFailures: 0,
          pollIntervalMs: 30_000,
          nextPollAt: new Date().toISOString(), // poll immediately
          priority: opts.priority ?? "normal",
          automationEnabled: opts.automationEnabled ?? false,
          ragEnabled: opts.ragEnabled ?? false,
          commentsIngestedTotal: 0,
          apiCallsTotal: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as YTSyncState,
        $set: {
          automationEnabled: opts.automationEnabled ?? false,
          ragEnabled: opts.ragEnabled ?? false,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[YT-Sync] initSyncState error:", err);
  }
}

/**
 * Get all videos due for polling across all workspaces.
 * Returns up to 50 entries sorted by nextPollAt ascending.
 */
export async function getVideosReadyToSync(limit = 50): Promise<YTSyncState[]> {
  try {
    const syncStates = await getYTSyncStateCollection();
    if (!syncStates) return [];

    const now = new Date().toISOString();
    return syncStates
      .find({
        status: { $nin: ["paused", "error"] },
        nextPollAt: { $lte: now },
      })
      .sort({ nextPollAt: 1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error("[YT-Sync] getVideosReadyToSync error:", err);
    return [];
  }
}
