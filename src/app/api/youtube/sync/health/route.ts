/**
 * /api/youtube/sync/health
 * GET — real sync state per video from yt_sync_state collection
 * Returns actual last sync times, failure counts, worker heartbeats.
 * No mock data. If not syncing yet, returns empty arrays.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/database/db";
import {
  getYTSyncStateCollection,
  getYTWorkerHeartbeatCollection,
  getYTOutboxCollection,
  ensureYouTubeIndexes,
} from "@/database/youtube-collections";

async function getWorkspaceId(req: NextRequest): Promise<string | null> {
  try {
    const session = req.cookies.get("qr_session")?.value;
    if (session) {
      const db = await getDB();
      if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
      return "default_workspace";
    }
    const db = await getDB();
    if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
  } catch {}
  return "default_workspace";
}

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureYouTubeIndexes();
    const now = Date.now();

    // Sync states for all videos in this workspace
    const syncStatesCol = await getYTSyncStateCollection();
    const syncStates = syncStatesCol
      ? await syncStatesCol
          .find({ workspaceId })
          .sort({ updatedAt: -1 })
          .limit(50)
          .toArray()
      : [];

    // Worker heartbeats (all workers, not workspace-scoped)
    const heartbeatsCol = await getYTWorkerHeartbeatCollection();
    const heartbeats = heartbeatsCol
      ? await heartbeatsCol
          .find({ lastHeartbeatAt: { $gt: new Date(now - 2 * 60_000).toISOString() } }) // alive in last 2 min
          .toArray()
      : [];

    // Recent outbox events count (last 5 min)
    const outboxCol = await getYTOutboxCollection();
    const recentEventCount = outboxCol
      ? await outboxCol.countDocuments({
          workspaceId,
          createdAt: { $gt: new Date(now - 5 * 60_000).toISOString() },
        })
      : 0;

    // Compute aggregate health
    const errorCount = syncStates.filter((s) => s.status === "error").length;
    const staleCount = syncStates.filter((s) => {
      if (!s.lastSuccessfulSyncAt) return false;
      return now - new Date(s.lastSuccessfulSyncAt).getTime() > 10 * 60_000;
    }).length;
    const healthyCount = syncStates.filter((s) => s.status === "healthy").length;
    const hasWorker = heartbeats.length > 0;

    let overallStatus: "healthy" | "degraded" | "error" | "idle";
    if (syncStates.length === 0) {
      overallStatus = "idle";
    } else if (errorCount > 0 || staleCount > syncStates.length / 2) {
      overallStatus = "error";
    } else if (staleCount > 0 || !hasWorker) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return NextResponse.json({
      status: overallStatus,
      summary: {
        totalVideos: syncStates.length,
        healthyVideos: healthyCount,
        staleVideos: staleCount,
        errorVideos: errorCount,
        recentEvents: recentEventCount,
        activeWorkers: heartbeats.length,
        hasWorker,
      },
      videos: syncStates.map((s) => ({
        videoId: s.videoId,
        channelId: s.channelId,
        status: s.status,
        lastSuccessfulSyncAt: s.lastSuccessfulSyncAt || null,
        lastError: s.lastError || null,
        consecutiveFailures: s.consecutiveFailures,
        nextPollAt: s.nextPollAt,
        pollIntervalMs: s.pollIntervalMs,
        automationEnabled: s.automationEnabled,
        commentsIngestedTotal: s.commentsIngestedTotal,
      })),
      workers: heartbeats.map((h) => ({
        workerId: h.workerId,
        type: h.workerType,
        status: h.status,
        lastHeartbeatAt: h.lastHeartbeatAt,
        ageMs: now - new Date(h.lastHeartbeatAt).getTime(),
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[YT-Health] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch sync health" }, { status: 500 });
  }
}

