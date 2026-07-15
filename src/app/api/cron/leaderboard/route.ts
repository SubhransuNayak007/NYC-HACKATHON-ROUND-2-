import { NextRequest, NextResponse } from "next/server";
import { calculateLeaderboard, applyLeaderboardRewards, shouldRunLeaderboard } from "@/backend/leaderboard";

/**
 * Leaderboard cron endpoint - runs weekly (Monday) and monthly (1st of month)
 * to calculate rankings and award plan upgrades.
 *
 * Designed to be called by:
 *   - Vercel Cron Jobs (vercel.json)
 *   - cron-job.org
 *   - GitHub Actions
 *   - Any external scheduler
 *
 * Auth: Set CRON_SECRET env var to require token.
 *
 * Usage:
 *   GET /api/cron/leaderboard
 *   GET /api/cron/leaderboard?token=<CRON_SECRET>
 *   GET /api/cron/leaderboard with Authorization: Bearer <CRON_SECRET>
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
  const now = new Date();

  // Determine which leaderboards to run
  const runWeekly = shouldRunLeaderboard("weekly");
  const runMonthly = shouldRunLeaderboard("monthly");

  const results = {
    timestamp: now.toISOString(),
    durationMs: 0,
    weekly: { ran: false, success: false, entries: 0, message: "" },
    monthly: { ran: false, success: false, entries: 0, message: "" },
  };

  // Run weekly leaderboard (every Monday)
  if (runWeekly) {
    try {
      console.log("[Leaderboard Cron] Running weekly leaderboard...");
      const leaderboard = await calculateLeaderboard("weekly");
      const rewardResult = await applyLeaderboardRewards(leaderboard);
      results.weekly = {
        ran: true,
        success: rewardResult.applied,
        entries: leaderboard.length,
        message: rewardResult.message,
      };
    } catch (error) {
      console.error("[Leaderboard Cron] Weekly leaderboard failed:", error);
      results.weekly = {
        ran: true,
        success: false,
        entries: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Run monthly leaderboard (1st of month)
  if (runMonthly) {
    try {
      console.log("[Leaderboard Cron] Running monthly leaderboard...");
      const leaderboard = await calculateLeaderboard("monthly");
      const rewardResult = await applyLeaderboardRewards(leaderboard);
      results.monthly = {
        ran: true,
        success: rewardResult.applied,
        entries: leaderboard.length,
        message: rewardResult.message,
      };
    } catch (error) {
      console.error("[Leaderboard Cron] Monthly leaderboard failed:", error);
      results.monthly = {
        ran: true,
        success: false,
        entries: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // If neither ran, return early
  if (!runWeekly && !runMonthly) {
    return NextResponse.json({
      ...results,
      message: "No leaderboard period triggered at this time",
      nextWeeklyCheck: "Next Monday 00:00-00:10 UTC",
      nextMonthlyCheck: "1st of next month 00:00-00:10 UTC",
    });
  }

  results.durationMs = Date.now() - startTime;

  return NextResponse.json(results);
}