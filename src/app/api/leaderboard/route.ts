import { NextRequest, NextResponse } from "next/server";
import { calculateLeaderboard, getLeaderboardData, applyLeaderboardRewards, shouldRunLeaderboard, LEADERBOARD_REWARDS } from "@/backend/leaderboard";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as "weekly" | "monthly") || "weekly";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const action = searchParams.get("action");

    // Handle manual reward application (admin only in production)
    if (action === "apply-rewards") {
      const leaderboard = await calculateLeaderboard(period);
      const result = await applyLeaderboardRewards(leaderboard);
      return NextResponse.json({ success: result.applied, message: result.message, leaderboard });
    }

    // Handle manual trigger (admin only in production)
    if (action === "run-now") {
      const leaderboard = await calculateLeaderboard(period);
      const result = await applyLeaderboardRewards(leaderboard);
      return NextResponse.json({ success: result.applied, message: result.message, leaderboard });
    }

    // Get leaderboard data for display
    const leaderboard = await getLeaderboardData(period, limit);

    return NextResponse.json({
      success: true,
      leaderboard,
      period,
      rewards: LEADERBOARD_REWARDS,
      shouldRun: shouldRunLeaderboard(period),
    });
  } catch (error) {
    console.error("[Leaderboard API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { period = "weekly", action } = body;

    if (action === "apply-rewards") {
      const leaderboard = await calculateLeaderboard(period);
      const result = await applyLeaderboardRewards(leaderboard);
      return NextResponse.json({ success: result.applied, message: result.message, leaderboard });
    }

    if (action === "run-now") {
      const leaderboard = await calculateLeaderboard(period);
      const result = await applyLeaderboardRewards(leaderboard);
      return NextResponse.json({ success: result.applied, message: result.message, leaderboard });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Leaderboard API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process leaderboard action" },
      { status: 500 }
    );
  }
}