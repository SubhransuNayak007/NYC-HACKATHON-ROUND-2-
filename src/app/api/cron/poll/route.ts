import { NextRequest, NextResponse } from "next/server";
import { pollAndReply } from "@/backend/scheduler";
import { runDiscoveryIfNeeded, writeHeartbeat } from "@/backend/cron_manager";
import { syncQuotaLedger, getQuotaRemaining } from "@/backend/youtube";
import { getVideosReadyToSync, syncVideoComments, recordSyncFailure } from "@/backend/youtube-sync";
import { processNewCommentsForVideo } from "@/backend/youtube-automation-runtime";
import { getDB } from "@/database/db";

/**
 * Cron-triggered endpoint - the single entry point for 24/7 operation.
 *
 * Designed to be called every 30 seconds by:
 *   - Vercel Cron Jobs (vercel.json — Pro plan)
 *   - cron-job.org (free, recommended for Netlify/Hobby)
 *   - GitHub Actions
 *   - UptimeRobot / BetterStack
 *
 * Vercel self-triggering:
 *   Pass ?self=true to enable auto-chaining: the endpoint calls itself
 *   again after 30 seconds via fetch(). This works on Vercel Hobby
 *   by chaining serverless invocations.
 *
 * Each invocation:
 *   1. Runs comment polling (KB-only auto-reply)
 *   2. Runs video discovery if 30 minutes have passed since last discovery
 *   3. Writes a health heartbeat for the dashboard
 *   4. If ?self=true, schedules the next chained invocation
 *
 * Auth: Set CRON_SECRET env var to require token. If unset, endpoint is open.
 *
 * Usage:
 *   GET /api/cron/poll
 *   GET /api/cron/poll?token=<CRON_SECRET>
 *   GET /api/cron/poll?self=true (auto-chain mode for Vercel Hobby)
 *   GET /api/cron/poll with Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const urlToken = req.nextUrl.searchParams.get("token");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Strict Cron authentication: In production, CRON_SECRET is strictly required
  if (cronSecret) {
    if (urlToken !== cronSecret && bearerToken !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized: invalid or missing cron token" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized: CRON_SECRET environment variable is required in production" },
      { status: 500 }
    );
  }

  const startTime = Date.now();

  // Hydrate the persistent quota ledger (cold-start safe)
  await syncQuotaLedger();

  // 1. Run comment polling and KB-only auto-reply (legacy scheduler — kept for backward compat)
  const pollResult = await pollAndReply();

  // 1b. Run durable sync for videos tracked in yt_sync_state collection
  //     This is the new production path — persists to dedicated MongoDB collections.
  let durableSyncSummary = { processed: 0, newComments: 0, errors: 0, automationReplies: 0 };
  try {
    const db = await getDB();
    const workspaceId = db.userSession?.email?.toLowerCase().trim();
    if (workspaceId) {
      const due = await getVideosReadyToSync(10); // Up to 10 videos per cron tick
      for (const syncState of due) {
        const result = await syncVideoComments(
          workspaceId,
          syncState.videoId,
          syncState.channelId,
          syncState.lastPageToken
        );
        durableSyncSummary.processed++;
        if (result.error) {
          await recordSyncFailure(workspaceId, syncState.videoId, result.error);
          durableSyncSummary.errors++;
        } else {
          durableSyncSummary.newComments += result.newComments;
          // Run automation runtime against newly ingested comments
          if (result.newComments > 0) {
            const runtimeResult = await processNewCommentsForVideo(workspaceId, syncState.videoId);
            durableSyncSummary.automationReplies += runtimeResult.replied;
          }
        }
      }
    }
  } catch (syncErr) {
    console.error("[Cron] Durable sync error:", syncErr);
  }

  // 2. Run video discovery if due (every 30 minutes)
  const discovery = await runDiscoveryIfNeeded();

  // 3. Write health heartbeat
  await writeHeartbeat();

  const response = {
    source: "cron",
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    polling: {
      success: pollResult.success,
      checked: pollResult.summary.checkedCount,
      replied: pollResult.summary.repliedCount,
      skipped: pollResult.summary.skippedCount,
      ragMatched: pollResult.summary.ragMatched,
      quotaError: pollResult.summary.quotaError,
    },
    durableSync: durableSyncSummary,
    discovery: {
      ran: discovery.ran,
      ...(discovery.summary
        ? {
            newVideos: discovery.summary.totalDiscovered,
            channels: discovery.summary.channelsChecked,
          }
        : {}),
    },
    quota: {
      used: await syncQuotaLedger(),
      remaining: getQuotaRemaining(),
    },
    nextScheduled: "Managed by Cron runner (Vercel / external runner)",
  };

  // Scheduled execution should be handled by external Cron (Vercel Cron Jobs or cron-job.org)
  // Recursive in-process self-invocation has been disabled to prevent runaway lambda charges.

  return NextResponse.json(response);
}
