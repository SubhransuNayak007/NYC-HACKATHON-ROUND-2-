import { NextRequest, NextResponse } from "next/server";
import { pollAndReply } from "@/backend/scheduler";
import { runDiscoveryIfNeeded, writeHeartbeat } from "@/backend/cron_manager";
import { syncQuotaLedger, getQuotaRemaining } from "@/backend/youtube";

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
  if (cronSecret) {
    const urlToken = req.nextUrl.searchParams.get("token");
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (urlToken !== cronSecret && bearerToken !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized: invalid cron token" },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();
  const selfMode = req.nextUrl.searchParams.get("self") === "true";

  // Hydrate the persistent quota ledger (cold-start safe)
  await syncQuotaLedger();

  // 1. Run comment polling and KB-only auto-reply
  const pollResult = await pollAndReply();

  // 2. Run video discovery if due (every 30 minutes)
  const discovery = await runDiscoveryIfNeeded();

  // 3. Write health heartbeat
  await writeHeartbeat();

  const response = {
    source: selfMode ? "self-triggered" : "cron",
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
    nextScheduled: selfMode ? "~30 seconds (self-triggered chain)" : null,
  };

  // 4. Self-triggering: chain the next invocation after 30 seconds
  //    Uses waitUntil when available (Vercel), otherwise fetch-and-forget
  if (selfMode) {
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const nextUrl = `${protocol}://${host}/api/cron/poll?self=true${
      cronSecret ? `&token=${cronSecret}` : ""
    }`;

    const scheduleNext = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      try {
        const res = await fetch(nextUrl, { signal: AbortSignal.timeout(25_000) });
        const text = await res.text();
        console.log(`[SelfCron] Chained poll result (${res.status}): ${text.slice(0, 100)}`);
      } catch (err: any) {
        console.error(`[SelfCron] Chained poll failed: ${err.message}`);
        // Retry once after 10 seconds on failure
        try {
          await new Promise((resolve) => setTimeout(resolve, 10_000));
          await fetch(nextUrl, { signal: AbortSignal.timeout(25_000) });
        } catch (retryErr: any) {
          console.error(`[SelfCron] Retry also failed: ${retryErr.message}`);
        }
      }
    };

    // Try to use Vercel's waitUntil if available, otherwise fire-and-forget
    try {
      const vercel = globalThis as any;
      if (typeof vercel.waitUntil === "function") {
        vercel.waitUntil(scheduleNext());
      } else {
        scheduleNext().catch(() => {});
      }
    } catch {
      scheduleNext().catch(() => {});
    }
  }

  return NextResponse.json(response);
}
