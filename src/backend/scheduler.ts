/**
 * Background Scheduler for Quick Reply
 *
 * Runs a 24/7/365 comment polling loop on the server side.
 * Fetches new YouTube comments and hands them to the processing
 * engine (src/backend/engine.ts), which owns the per-comment pipeline:
 * dedup → safety → rule matching → intent → RAG → confidence → reply.
 *
 * Key behavior: If a comment doesn't match any FAQ/knowledge base entry,
 * it is SKIPPED. No reply is posted.
 *
 * Uses videoQueue-based tiered polling for YouTube API quota efficiency,
 * plus golden-hour priority (videos published within the last 60 minutes
 * are polled first). External cron endpoints also trigger this for
 * serverless reliability.
 *
 * A durable distributed lock (Redis → MongoDB → in-memory) prevents two
 * serverless instances from double-polling (and therefore double-replying)
 * when a cron + client poll overlap.
 */

import {
  getDB,
  saveDB,
  getAllTenantEmails,
  VideoQueueEntry,
  SystemEvent,
  DBData,
  acquireLock,
  releaseLock,
} from "@/database/db";
import {
  fetchVideoComments,
  postCommentReply,
  canAffordApiCall,
  hydrateQuota,
  syncQuotaLedger,
  getQuotaUsedToday,
} from "@/backend/youtube";
import {
  processIncomingComment,
  type IncomingComment,
  type EngineContext,
} from "./engine";
import type { FAQEntry } from "@/backend/rag";
import { getVideoPollingTier } from "@/backend/rag_types";
import { emitCommentEvent } from "./events";

// --- Re-export the event bus for backward compatibility ---
// The bus now lives in ./events so the engine can emit events without a
// circular import. scheduler.ts re-exports the same symbols it used to own.
export { commentEventBus, emitCommentEvent, type CommentEvent } from "./events";

// --- Poll Summary Shape ---

interface PollSummary {
  checkedCount: number;
  matchedCount: number;
  repliedCount: number;
  skippedCount: number;
  ragMatched: number;
  aiReplied: number;
  limitReached: boolean;
  repliesToday: number;
  maxDailyLimit: number;
  quotaError: boolean;
}

const EMPTY_SUMMARY: PollSummary = {
  checkedCount: 0,
  matchedCount: 0,
  repliedCount: 0,
  skippedCount: 0,
  ragMatched: 0,
  aiReplied: 0,
  limitReached: false,
  repliesToday: 0,
  maxDailyLimit: 200,
  quotaError: false,
};

/**
 * Log a system event for the audit trail and dashboard.
 */
async function logSystemEvent(
  type: SystemEvent["type"],
  message: string,
  metadata?: Record<string, any>
) {
  try {
    const db = await getDB();
    if (!db.systemEvents) db.systemEvents = [];

    db.systemEvents.unshift({
      id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Cap at 200 events
    if (db.systemEvents.length > 200) {
      db.systemEvents = db.systemEvents.slice(0, 200);
    }

    await saveDB(db);
  } catch {
    // Non-critical — don't let logging break the scheduler
  }
}

/**
 * Get videos from the videoQueue that are due for polling.
 *
 * Golden-hour priority: videos published within the last 60 minutes are
 * promoted to priority 0 and polled first, before the tier-based sort.
 * Returns videos sorted by priority (lower number = higher priority)
 * and then by staleness (least recently polled first).
 */
function getDueVideos(videoQueue: VideoQueueEntry[]): VideoQueueEntry[] {
  const now = Date.now();
  const goldenHourCutoff = now - 60 * 60 * 1000;

  return videoQueue
    .filter((v) => {
      if (v.status === "error") return false;
      const tier = getVideoPollingTier(v.publishedAt);
      const lastPolled = v.lastPolledAt ? new Date(v.lastPolledAt).getTime() : 0;
      const timeSincePoll = now - lastPolled;
      return timeSincePoll >= tier.intervalMs;
    })
    .sort((a, b) => {
      // Golden-hour videos (published within the last 60 minutes) get priority 0
      const aPublishedMs = new Date(a.publishedAt).getTime();
      const bPublishedMs = new Date(b.publishedAt).getTime();
      const aPriority = aPublishedMs >= goldenHourCutoff ? 0 : a.priority;
      const bPriority = bPublishedMs >= goldenHourCutoff ? 0 : b.priority;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Then by staleness (least recently polled first)
      const aLast = a.lastPolledAt ? new Date(a.lastPolledAt).getTime() : 0;
      const bLast = b.lastPolledAt ? new Date(b.lastPolledAt).getTime() : 0;
      return aLast - bLast;
    });
}

/**
 * Retry failed auto-replies that are still salvageable.
 *
 * Scans db.comments for status="failed" comments that carry an autoReplyText
 * and have been retried fewer than 3 times, then re-posts them with
 * postCommentReply using a simulated exponential backoff (a simple await
 * between attempts). Failed comments are updated on success. Returns the
 * number of replies successfully posted.
 */
async function retryFailedReplies(db: DBData): Promise<number> {
  const failed = db.comments.filter(
    (c) =>
      c.status === "failed" &&
      !!c.autoReplyText &&
      (c.retryCount ?? 0) < 3
  );

  if (failed.length === 0) return 0;

  console.log(`[Scheduler] Retrying ${failed.length} failed replies...`);
  let retried = 0;

  for (const comment of failed) {
    const attempt = comment.retryCount ?? 0;

    // Exponential backoff simulation: 1s, 2s, 4s (capped at 8s)
    const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
    if (backoffMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }

    const replyText = comment.autoReplyText as string;
    const ytResponse = await postCommentReply(
      comment.channelId,
      comment.id,
      replyText
    );

    comment.retryCount = attempt + 1;
    comment.lastAttemptAt = new Date().toISOString();

    if (ytResponse) {
      comment.status = "replied";
      comment.replyFiredAt = new Date().toISOString();
      retried++;
      emitCommentEvent({ type: "replied", comment });
      console.log(`[Scheduler] Retry succeeded for comment ${comment.id}`);
    } else {
      console.warn(
        `[Scheduler] Retry ${attempt + 1}/3 failed for comment ${comment.id}`
      );
    }
  }

  return retried;
}

/**
 * Main polling function. Fetches comments and delegates per-comment
 * processing to the engine (src/backend/engine.ts), which auto-replies
 * Poll and process comments for a specific tenant workspace.
 */
export async function pollSingleTenant(
  tenantEmail?: string
): Promise<{ success: boolean; summary: PollSummary }> {
  const safeTenant = tenantEmail?.toLowerCase().trim() || "";
  const lockKey = `poll_${safeTenant || "default"}`;
  const lockToken = await acquireLock(lockKey, 55_000);

  if (!lockToken) {
    console.log(`[Scheduler] Poll skipped for ${safeTenant || "default"} - lock active`);
    return { success: false, summary: { ...EMPTY_SUMMARY } };
  }

  try {
    const db = await getDB(safeTenant);

    // Update system status
    if (db.systemStatus) {
      db.systemStatus.lastPollRunAt = new Date().toISOString();
      db.systemStatus.youtubeQuotaUsedToday = getQuotaUsedToday();
    }

    if (!db.videoQueue) db.videoQueue = [];

    // Migrate legacy automatedVideos
    const hasLegacyVideos = db.channels.some(
      (c) => c.automatedVideos && c.automatedVideos.length > 0
    );
    if (hasLegacyVideos) {
      const existingIds = new Set(db.videoQueue.map((v) => v.videoId));
      for (const channel of db.channels) {
        for (const videoId of channel.automatedVideos || []) {
          if (existingIds.has(videoId)) continue;
          db.videoQueue.push({
            id: `vq-migrated-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channelId: channel.id,
            videoId,
            title: "Migrated Video",
            publishedAt: new Date().toISOString(),
            discoveredAt: new Date().toISOString(),
            lastPolledAt: null,
            status: "active",
            pollCount: 0,
            commentCount: 0,
            repliedCount: 0,
            priority: 2,
            error: null,
          });
          existingIds.add(videoId);
        }
      }
    }

    const channels = db.channels || [];
    if (channels.length === 0) {
      return { success: true, summary: { ...EMPTY_SUMMARY } };
    }

    const channelsWithAuth = channels.filter(
      (c) => c.status === "active" && (c.refreshToken || c.accessToken)
    );

    if (channelsWithAuth.length === 0) {
      return { success: true, summary: { ...EMPTY_SUMMARY } };
    }

    const activeUser = db.userSession || {
      email: safeTenant,
      name: "Creator",
      username: "creator",
      tier: "free" as const,
      repliesToday: 0,
      lastResetDate: new Date().toISOString().split("T")[0],
    };

    const maxDailyLimit = activeUser.tier === "pro" ? 25000 : activeUser.tier === "premium" ? 5000 : 500;
    const todayStr = new Date().toISOString().split("T")[0];
    if (activeUser.lastResetDate !== todayStr) {
      activeUser.repliesToday = 0;
      activeUser.lastResetDate = todayStr;
    }

    if (activeUser.repliesToday >= maxDailyLimit) {
      return {
        success: true,
        summary: {
          ...EMPTY_SUMMARY,
          limitReached: true,
          repliesToday: activeUser.repliesToday,
          maxDailyLimit,
        },
      };
    }

    if (!canAffordApiCall("commentThreads.list")) {
      await logSystemEvent("error", "YouTube API quota exhausted for today");
      return {
        success: true,
        summary: {
          ...EMPTY_SUMMARY,
          repliesToday: activeUser.repliesToday,
          maxDailyLimit,
          quotaError: true,
        },
      };
    }

    let checkedCount = 0;
    let matchedCount = 0;
    let repliedCount = 0;
    let skippedCount = 0;
    let ragMatched = 0;
    let aiReplied = 0;
    let limitReached = false;
    let quotaError = false;

    const faqs: FAQEntry[] = db.faqs || [];
    const processedCommentIds = new Set(db.comments.map((c) => c.id));

    const engineContext: EngineContext = {
      db,
      activeUser,
      maxDailyLimit,
      processedCommentIds,
      faqs,
    };

    const dueVideos = getDueVideos(db.videoQueue);

    for (const videoEntry of dueVideos) {
      if (activeUser.repliesToday >= maxDailyLimit) {
        limitReached = true;
        break;
      }
      await syncQuotaLedger();

      const channel = db.channels.find((c) => c.id === videoEntry.channelId);
      if (!channel || channel.status === "quota_error") continue;

      try {
        const ytComments = await fetchVideoComments(
          videoEntry.channelId,
          videoEntry.videoId
        );

        videoEntry.lastPolledAt = new Date().toISOString();
        videoEntry.pollCount++;
        videoEntry.status = "active";

        for (const item of ytComments) {
          const topComment = item.snippet?.topLevelComment;
          if (!topComment) continue;

          const incoming: IncomingComment = {
            commentId: topComment.id,
            author: topComment.snippet?.authorDisplayName || "Viewer",
            authorAvatar: topComment.snippet?.authorChannelImageUrl || "",
            text: topComment.snippet?.textDisplay || "",
            publishedAt: topComment.snippet?.publishedAt || new Date().toISOString(),
            videoId: videoEntry.videoId,
            videoTitle: videoEntry.title || "Video",
            videoThumbnail: "",
            channelId: videoEntry.channelId,
            channelName: channel.name || "Channel",
          };

          checkedCount++;

          const result = await processIncomingComment(incoming, engineContext);

          if (result.replied) repliedCount++;
          if (result.reviewed) matchedCount++;
          if (result.skipped) skippedCount++;
          if (result.ruleMatched) matchedCount++;
          if (result.limitHit) limitReached = true;
          if (result.comment?.replySource === "rag") ragMatched++;
          if (result.comment?.replySource === "ai") aiReplied++;
        }
      } catch (err: any) {
        console.error(`[Scheduler] Error polling video ${videoEntry.videoId}:`, err);
      }
    }

    if (db.systemStatus) {
      db.systemStatus.youtubeQuotaUsedToday = getQuotaUsedToday();
    }

    db.userSession = activeUser;
    await saveDB(db, safeTenant);

    emitCommentEvent({
      type: "poll_complete",
      summary: {
        checkedCount,
        matchedCount,
        repliedCount,
        ragMatched,
        aiReplied,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      summary: {
        checkedCount,
        matchedCount,
        repliedCount,
        skippedCount,
        ragMatched,
        aiReplied,
        limitReached,
        repliesToday: activeUser.repliesToday,
        maxDailyLimit,
        quotaError,
      },
    };
  } catch (err) {
    console.error(`[Scheduler] Poll error for ${safeTenant}:`, err);
    await logSystemEvent("error", `Poll error for ${safeTenant}: ${err}`);
    return { success: false, summary: { ...EMPTY_SUMMARY } };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}

/**
 * Main polling function. Dispatches polling for a single tenant or all active tenants.
 */
export async function pollAndReply(targetEmail?: string): Promise<{
  success: boolean;
  summary: PollSummary;
}> {
  await hydrateQuota();

  if (targetEmail) {
    return pollSingleTenant(targetEmail);
  }

  // Multi-tenant iteration
  const tenantEmails = await getAllTenantEmails();
  if (tenantEmails.length === 0) {
    return pollSingleTenant();
  }

  let aggregatedSummary: PollSummary = { ...EMPTY_SUMMARY };

  for (const email of tenantEmails) {
    try {
      const res = await pollSingleTenant(email);
      if (res.success) {
        aggregatedSummary.checkedCount += res.summary.checkedCount;
        aggregatedSummary.matchedCount += res.summary.matchedCount;
        aggregatedSummary.repliedCount += res.summary.repliedCount;
        aggregatedSummary.skippedCount += res.summary.skippedCount;
        aggregatedSummary.ragMatched += res.summary.ragMatched;
        aggregatedSummary.aiReplied += res.summary.aiReplied;
      }
    } catch (err) {
      console.warn(`[Scheduler] Multi-tenant poll failed for ${email}:`, err);
    }
  }

  return { success: true, summary: aggregatedSummary };
}

// --- In-Process Background Scheduler ---

const POLL_INTERVAL_MS = 30_000;
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let schedulerStarted = false;

/**
 * Start the background polling scheduler.
 * Call this once from the Next.js instrumentation hook.
 * Polls every 30 seconds even when no browser is open.
 */
export function startBackgroundScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("[Scheduler] Starting background comment poller (30s interval)...");

  // Run first poll after a short delay
  setTimeout(() => {
    pollAndReply().catch((err) =>
      console.error("[Scheduler] Initial poll failed:", err)
    );
  }, 5_000);

  // Then poll every 30 seconds
  schedulerInterval = setInterval(() => {
    pollAndReply().catch((err) =>
      console.error("[Scheduler] Periodic poll failed:", err)
    );
  }, POLL_INTERVAL_MS);

  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
}

/**
 * Stop the background scheduler (for graceful shutdown)
 */
export function stopBackgroundScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    schedulerStarted = false;
    console.log("[Scheduler] Background poller stopped.");
  }
}
