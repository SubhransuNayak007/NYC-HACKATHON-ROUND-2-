import { NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { getQuotaUsedToday, getQuotaRemaining } from "@/backend/youtube";

/**
 * System status endpoint for the dashboard.
 * Returns health, queue stats, quota usage, and recent activity.
 */
export async function GET() {
  try {
    const db = await getDB();
    const videoQueue = db.videoQueue || [];
    const systemEvents = db.systemEvents || [];
    const comments = db.comments || [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Video queue stats
    const queueStats = {
      total: videoQueue.length,
      pending: videoQueue.filter((v) => v.status === "pending").length,
      active: videoQueue.filter((v) => v.status === "active").length,
      stale: videoQueue.filter((v) => v.status === "stale").length,
      error: videoQueue.filter((v) => v.status === "error").length,
    };

    // Today's reply stats
    const todayReplies = comments.filter(
      (c) =>
        c.status === "replied" &&
        c.replyFiredAt &&
        c.replyFiredAt.startsWith(todayStr)
    );
    const todayFailed = comments.filter(
      (c) =>
        c.status === "failed" &&
        c.publishedAt &&
        c.publishedAt.startsWith(todayStr)
    );
    const todaySkipped = comments.filter(
      (c) =>
        c.status === "skipped" &&
        c.publishedAt &&
        c.publishedAt.startsWith(todayStr)
    );

    // Health check: is the latest heartbeat within 3 minutes?
    const latestHeartbeat = systemEvents.find((e) => e.type === "cron_tick");
    const lastHeartbeatAt = latestHeartbeat?.timestamp || null;
    const isHealthy = lastHeartbeatAt
      ? Date.now() - new Date(lastHeartbeatAt).getTime() < 3 * 60 * 1000
      : false;

    // System status
    const systemStatus = db.systemStatus || {
      lastCronRunAt: null,
      lastDiscoveryRunAt: null,
      lastPollRunAt: null,
      startedAt: new Date().toISOString(),
      youtubeQuotaUsedToday: 0,
    };

    // Channel OAuth status — critical for polling to work
    const channelDetails = db.channels.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      status: c.status,
      hasRefreshToken: !!c.refreshToken,
      hasAccessToken: !!c.accessToken,
      canPoll: !!(c.refreshToken || c.accessToken),
      autoDiscover: c.autoDiscoverVideos !== false,
    }));

    const channelsWithOAuth = db.channels.filter(
      (c) => c.status === "active" && (c.refreshToken || c.accessToken)
    );

    // Persistence check: is MongoDB connected or running in fallback?
    const mongoConfigured = !!process.env.MONGODB_URI;
    const isVercel = !!process.env.VERCEL;

    return NextResponse.json({
      healthy: isHealthy,
      lastHeartbeatAt,
      uptime: systemStatus.startedAt,
      persistence: {
        mongoConfigured,
        isVercel,
        persistent: mongoConfigured,
        warning: (!mongoConfigured && isVercel)
          ? "⚠️ No MONGODB_URI — data won't persist on Vercel! Set in Vercel Project Settings."
          : null,
      },
      schedulerActive: isHealthy,
      polling: {
        lastPollRunAt: systemStatus.lastPollRunAt,
        lastDiscoveryRunAt: systemStatus.lastDiscoveryRunAt,
      },
      quota: {
        usedToday: getQuotaUsedToday(),
        remaining: getQuotaRemaining(),
        budget: 8000,
      },
      videoQueue: queueStats,
      today: {
        repliesPosted: todayReplies.length,
        repliesFailed: todayFailed.length,
        commentsSkipped: todaySkipped.length,
        commentsProcessed: todayReplies.length + todayFailed.length + todaySkipped.length,
      },
      channels: {
        total: db.channels.length,
        active: db.channels.filter((c) => c.status === "active").length,
        withOAuth: channelsWithOAuth.length,
        withoutOAuth: db.channels.length - channelsWithOAuth.length,
        quotaError: db.channels.filter((c) => c.status === "quota_error").length,
        details: channelDetails,
      },
      faqs: (db.faqs || []).length,
      totalComments: comments.length,
      ready: channelsWithOAuth.length > 0 && (db.faqs || []).length > 0,
      readyMessage: channelsWithOAuth.length === 0
        ? "No channels with YouTube OAuth. Connect via Platforms → Connect YouTube."
        : (db.faqs || []).length === 0
          ? "No FAQs in Knowledge Base. Add FAQs for auto-replies to work."
          : "System ready for 24/7 auto-reply.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch system status", details: err.message },
      { status: 500 }
    );
  }
}
