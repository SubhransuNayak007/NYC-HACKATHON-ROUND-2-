/**
 * Leaderboard System for Quick Reply
 *
 * Tracks user reply counts and awards plan upgrades:
 * - 1st place: Max plan for 6 months
 * - 2nd place: Pro plan for 3 months
 * - 3rd place: Premium plan for 1 month
 *
 * Runs on a scheduled basis (weekly/monthly).
 */

import { getMongoClient } from "@/database/db";
import { logActivity } from "@/database/db";

// Leaderboard entry interface
export interface LeaderboardEntry {
  email: string;
  name: string;
  username: string;
  totalReplies: number;
  periodReplies: number;  // Replies in current period (weekly/monthly)
  tier: "free" | "premium" | "pro";
  rank?: number;
  period: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
}

// Reward tiers
export const LEADERBOARD_REWARDS = {
  1: { plan: "pro" as const, durationMonths: 6, label: "Max Plan" }, // Max plan = Pro in our system
  2: { plan: "pro" as const, durationMonths: 3, label: "Pro Plan" },
  3: { plan: "premium" as const, durationMonths: 1, label: "Premium Plan" },
} as const;

export type RewardRank = 1 | 2 | 3;

// Calculate leaderboard for a specific period
export async function calculateLeaderboard(
  period: "weekly" | "monthly" = "weekly"
): Promise<LeaderboardEntry[]> {
  const allUsers = await getAllUsersForLeaderboard();
  const now = new Date();
  const periodStart = getPeriodStart(now, period);
  const periodEnd = getPeriodEnd(now, period);

  // Filter and sort users by period replies
  const entries: LeaderboardEntry[] = allUsers
    .filter(user => user.totalReplies > 0) // Only users with some activity
    .map(user => ({
      email: user.email,
      name: user.name,
      username: user.username,
      totalReplies: user.totalReplies,
      periodReplies: user.periodReplies || 0,
      tier: user.tier,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }))
    .sort((a, b) => b.periodReplies - a.periodReplies)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return entries;
}

// Get all users for leaderboard from MongoDB
async function getAllUsersForLeaderboard(): Promise<Array<{
  email: string;
  name: string;
  username: string;
  totalReplies: number;
  periodReplies: number;
  tier: "free" | "premium" | "pro";
}>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[Leaderboard] MONGODB_URI not configured, returning empty leaderboard");
    return [];
  }

  try {
    const client = await getMongoClient();
    const db = client.db("quickreply");
    const collection = db.collection("users");

    // Query all users with userSession data
    const documents = await collection.find(
      { "userSession.email": { $exists: true } },
      { projection: { "userSession": 1, "roiData": 1 } }
    ).toArray();

    return documents.map(doc => {
      const session = doc.userSession || {};
      const roiData = doc.roiData || {};
      return {
        email: session.email || "",
        name: session.name || "Unknown",
        username: session.username || session.name?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
        totalReplies: roiData.allTimeReplies || 0,
        periodReplies: roiData.repliesThisWeek || 0, // For weekly, use weekly data; for monthly, use monthly
        tier: session.tier || "free",
      };
    }).filter(user => user.email); // Only users with email
  } catch (error) {
    console.error("[Leaderboard] Error fetching users:", error);
    return [];
  }
}

// Apply rewards to top 3 users
export async function applyLeaderboardRewards(
  leaderboard: LeaderboardEntry[]
): Promise<{ applied: boolean; message: string }> {
  try {
    for (const entry of leaderboard) {
      const rank = entry.rank as RewardRank;
      if (rank && rank <= 3 && LEADERBOARD_REWARDS[rank]) {
        const reward = LEADERBOARD_REWARDS[rank];
        await applyRewardToUser(entry.email, reward.plan, reward.durationMonths, rank);
      }
    }
    return { applied: true, message: "Rewards applied successfully" };
  } catch (error) {
    console.error("[Leaderboard] Error applying rewards:", error);
    return { applied: false, message: "Failed to apply rewards" };
  }
}

// Apply a specific plan reward to a user
async function applyRewardToUser(
  email: string,
  plan: "premium" | "pro",
  durationMonths: number,
  rank: number
): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[Leaderboard] MONGODB_URI not configured, cannot apply reward");
    return;
  }

  try {
    const client = await getMongoClient();
    const db = client.db("quickreply");
    const collection = db.collection("users");

    // Get current user data
    const doc = await collection.findOne({ "userSession.email": email });
    if (!doc) {
      console.warn(`[Leaderboard] User ${email} not found for reward`);
      return;
    }

    const currentTier = (doc.userSession?.tier || "free") as "free" | "premium" | "pro";

    // Only upgrade if the new plan is better than current
    const tierOrder: Record<"free" | "premium" | "pro", number> = { free: 0, premium: 1, pro: 2 };
    if (tierOrder[plan] > tierOrder[currentTier]) {
      // Update user tier
      await collection.updateOne(
        { "userSession.email": email },
        { $set: { "userSession.tier": plan } }
      );

      // Store reward info for reference
      const reward = {
        rank,
        plan,
        durationMonths,
        awardedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await collection.updateOne(
        { "userSession.email": email },
        { $push: { leaderboardRewards: reward } } as any
      );

      await logActivity(
        "System",
        `[Leaderboard] Awarded ${plan} plan for ${durationMonths} months to ${email} (Rank ${rank})`
      );
    }
  } catch (error) {
    console.error(`[Leaderboard] Failed to apply reward to ${email}:`, error);
  }
}

// Get leaderboard data for display
export async function getLeaderboardData(
  period: "weekly" | "monthly" = "weekly",
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const leaderboard = await calculateLeaderboard(period);
  return leaderboard.slice(0, limit);
}

// Check if leaderboard should run (e.g., every Monday for weekly, 1st of month for monthly)
export function shouldRunLeaderboard(period: "weekly" | "monthly"): boolean {
  const now = new Date();
  if (period === "weekly") {
    // Run on Monday (day 1)
    return now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() < 10;
  } else {
    // Run on 1st of month
    return now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() < 10;
  }
}

// Get period start date
function getPeriodStart(date: Date, period: "weekly" | "monthly"): Date {
  const d = new Date(date);
  if (period === "weekly") {
    // Start of week (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
  } else {
    // Start of month
    d.setDate(1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get period end date
function getPeriodEnd(date: Date, period: "weekly" | "monthly"): Date {
  const d = new Date(date);
  if (period === "weekly") {
    // End of week (Sunday)
    const day = d.getDay();
    const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
    d.setDate(diff);
  } else {
    // End of month
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

// Leaderboard reward record
export interface LeaderboardReward {
  rank: number;
  plan: "premium" | "pro";
  durationMonths: number;
  awardedAt: string;
  expiresAt: string;
}

// Extend DBData to include leaderboard rewards
declare module "@/database/db" {
  interface DBData {
    leaderboardRewards?: LeaderboardReward[];
  }
}