/**
 * Video Auto-Discovery Service for Quick Reply
 *
 * Automatically discovers new videos from connected YouTube channels
 * and adds them to the polling queue. This enables 24/7 operation
 * without the user needing to manually add videos.
 *
 * YouTube Data API v3 quota cost:
 * - channels.list (get uploads playlist): 1 unit per channel
 * - playlistItems.list (get recent videos): 1 unit per channel
 * Total: ~2 units per channel per discovery cycle
 */

import { getDB, saveDB, logActivity, VideoQueueEntry } from "@/database/db";
import { getUploadsPlaylistId, trackApiCall } from "./youtube";

export interface VideoDiscoveryResult {
  channelId: string;
  channelName: string;
  discovered: number;
  alreadyQueued: number;
  errors: string[];
}

export interface DiscoverySummary {
  totalDiscovered: number;
  totalAlreadyQueued: number;
  channelsChecked: number;
  errors: string[];
  timestamp: string;
}

/**
 * Compute video priority tier based on age.
 * Priority 1 = hottest (newest), Priority 4 = coldest (oldest)
 */
function computeVideoPriority(publishedAt: string): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 2) return 1;       // Tier 1: < 2 hours
  if (ageHours < 24) return 2;      // Tier 2: 2-24 hours
  if (ageHours < 168) return 3;     // Tier 3: 1-7 days
  return 4;                          // Tier 4: 7+ days
}

/**
 * Discover new videos for a single channel.
 * Fetches the channel's uploads playlist and compares against the video queue.
 */
export async function discoverNewVideos(
  channelId: string
): Promise<VideoDiscoveryResult> {
  const result: VideoDiscoveryResult = {
    channelId,
    channelName: "",
    discovered: 0,
    alreadyQueued: 0,
    errors: [],
  };

  try {
    const db = await getDB();
    const channel = db.channels.find((c) => c.id === channelId);
    if (!channel) {
      result.errors.push(`Channel ${channelId} not found`);
      return result;
    }

    result.channelName = channel.name;

    // Get the uploads playlist ID (1 API unit)
    const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
    if (!uploadsPlaylistId) {
      result.errors.push(`Could not find uploads playlist for ${channel.name}`);
      return result;
    }

    // Fetch recent videos from the uploads playlist (1 API unit)
    const token = await import("./youtube").then((m) =>
      m.getFreshAccessToken(channelId)
    );
    if (!token) {
      result.errors.push(`No valid token for channel ${channel.name}`);
      return result;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?` +
        `part=snippet,contentDetails&` +
        `playlistId=${uploadsPlaylistId}&` +
        `maxResults=15&` +
        `order=date`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    trackApiCall("playlistItems.list", 1);

    if (!response.ok) {
      const errBody = await response.text();
      result.errors.push(
        `YouTube API error ${response.status}: ${errBody.slice(0, 200)}`
      );
      return result;
    }

    const data = await response.json();
    const items = data.items || [];

    // Ensure videoQueue array exists
    if (!db.videoQueue) db.videoQueue = [];
    const existingIds = new Set(db.videoQueue.map((v) => v.videoId));

    const maxPerChannel = channel.maxVideosPerChannel || 50;
    const channelQueueCount = db.videoQueue.filter(
      (v) => v.channelId === channelId
    ).length;

    for (const item of items) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      if (existingIds.has(videoId)) {
        result.alreadyQueued++;
        continue;
      }

      // Respect per-channel limit
      if (channelQueueCount + result.discovered >= maxPerChannel) break;

      const publishedAt =
        item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || new Date().toISOString();
      const title = item.snippet?.title || "Untitled Video";

      const entry: VideoQueueEntry = {
        id: `vq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channelId,
        videoId,
        title,
        publishedAt,
        discoveredAt: new Date().toISOString(),
        lastPolledAt: null,
        status: "pending",
        pollCount: 0,
        commentCount: 0,
        repliedCount: 0,
        priority: computeVideoPriority(publishedAt),
        error: null,
      };

      db.videoQueue.push(entry);
      existingIds.add(videoId);
      result.discovered++;
    }

    // Update channel's lastDiscoveryAt
    const chIdx = db.channels.findIndex((c) => c.id === channelId);
    if (chIdx >= 0) {
      db.channels[chIdx].lastDiscoveryAt = new Date().toISOString();
    }

    await saveDB(db);
  } catch (err: any) {
    result.errors.push(`Discovery error: ${err.message}`);
  }

  return result;
}

/**
 * Run video discovery for all connected channels with autoDiscover enabled.
 * Staggers API calls by 100ms to avoid burst rate limiting.
 */
export async function runDiscoveryForAllChannels(): Promise<DiscoverySummary> {
  const summary: DiscoverySummary = {
    totalDiscovered: 0,
    totalAlreadyQueued: 0,
    channelsChecked: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    const db = await getDB();
    const channels = db.channels.filter(
      (c) =>
        c.status === "active" &&
        c.autoDiscoverVideos !== false &&
        (c.refreshToken || c.accessToken) // Only channels with OAuth credentials
    );

    if (channels.length === 0) {
      console.log("[Discovery] No channels with YouTube OAuth credentials — skipping discovery");
    }

    for (const channel of channels) {
      const result = await discoverNewVideos(channel.id);
      summary.totalDiscovered += result.discovered;
      summary.totalAlreadyQueued += result.alreadyQueued;
      summary.channelsChecked++;
      summary.errors.push(...result.errors);

      // Log discovery event
      if (result.discovered > 0) {
        await logActivity(
          "System",
          `[Discovery] Found ${result.discovered} new video(s) for ${channel.name}`
        );
      }

      // Stagger: 100ms between channels to avoid YouTube API burst
      await new Promise((r) => setTimeout(r, 100));
    }

    // Update system status
    if (db.systemStatus) {
      db.systemStatus.lastDiscoveryRunAt = summary.timestamp;
    }
    await saveDB(db);
  } catch (err: any) {
    summary.errors.push(`Discovery run error: ${err.message}`);
  }

  console.log(
    `[Discovery] Complete: ${summary.totalDiscovered} new, ${summary.totalAlreadyQueued} queued, ${summary.channelsChecked} channels checked`
  );

  return summary;
}

/**
 * Migrate existing manual `automatedVideos` entries into the videoQueue.
 * Called once on startup to transition from the old system.
 */
export async function migrateAutomatedVideos(): Promise<number> {
  let migrated = 0;

  try {
    const db = await getDB();
    if (!db.videoQueue) db.videoQueue = [];

    const existingVideoIds = new Set(db.videoQueue.map((v) => v.videoId));

    for (const channel of db.channels) {
      const autoVideos = channel.automatedVideos || [];
      for (const videoId of autoVideos) {
        if (existingVideoIds.has(videoId)) continue;

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
        existingVideoIds.add(videoId);
        migrated++;
      }
    }

    if (migrated > 0) {
      await saveDB(db);
      console.log(`[Discovery] Migrated ${migrated} automated videos to videoQueue`);
    }
  } catch (err: any) {
    console.error("[Discovery] Migration failed:", err);
  }

  return migrated;
}
