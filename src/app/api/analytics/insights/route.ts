import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

/**
 * Feature 5: Smart Analytics & Insights Engine
 * GET /api/analytics/insights
 *
 * Returns: top commenters, peak engagement hours, ROI data,
 * response time impact analysis, weekly digest data.
 */
export async function GET(req: NextRequest) {
  const db = await getDB();
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section"); // "top-commenters" | "peak-hours" | "roi" | "response-time" | "digest" | null (=all)

  // ── Top Commenters Leaderboard ──
  const commenterMap = new Map<string, {
    author: string;
    authorAvatar: string;
    commentCount: number;
    repliesReceived: number;
    subscriberCount: number;
    channels: Set<string>;
    sentimentScores: number[];
    lastCommentAt: string;
  }>();

  db.comments.forEach((c) => {
    const existing = commenterMap.get(c.author);
    const sentimentScore =
      c.sentiment === "positive" ? 1 :
      c.sentiment === "neutral" ? 0 :
      c.sentiment === "negative" ? -1 : 0;

    if (existing) {
      existing.commentCount++;
      if (c.status === "replied") existing.repliesReceived++;
      existing.sentimentScores.push(sentimentScore);
      if (!existing.channels.has(c.channelId)) existing.channels.add(c.channelId);
      if (c.publishedAt > existing.lastCommentAt) existing.lastCommentAt = c.publishedAt;
    } else {
      commenterMap.set(c.author, {
        author: c.author,
        authorAvatar: c.authorAvatar,
        commentCount: 1,
        repliesReceived: c.status === "replied" ? 1 : 0,
        subscriberCount: parseInt(c.authorSubscribers) || 0,
        channels: new Set([c.channelId]),
        sentimentScores: [sentimentScore],
        lastCommentAt: c.publishedAt,
      });
    }
  });

  const topCommenters = Array.from(commenterMap.values())
    .map((c) => ({
      author: c.author,
      authorAvatar: c.authorAvatar,
      commentCount: c.commentCount,
      repliesReceived: c.repliesReceived,
      subscriberCount: c.subscriberCount,
      avgSentiment: c.sentimentScores.reduce((a, b) => a + b, 0) / c.sentimentScores.length,
      isSuperfan: c.commentCount >= 3,
      channelCount: c.channels.size,
      lastCommentAt: c.lastCommentAt,
    }))
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 20);

  // ── Peak Engagement Hours Heatmap ──
  const hourlyData: Record<string, { comments: number; replies: number; totalTime: number; count: number }> = {};

  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      hourlyData[`${day}-${hour}`] = { comments: 0, replies: 0, totalTime: 0, count: 0 };
    }
  }

  db.comments.forEach((c) => {
    const date = new Date(c.publishedAt);
    const hour = date.getHours();
    const day = date.getDay();
    const key = `${day}-${hour}`;
    if (hourlyData[key]) {
      hourlyData[key].comments++;
      if (c.status === "replied") {
        hourlyData[key].replies++;
        if (c.replyTimeMinutes) {
          hourlyData[key].totalTime += c.replyTimeMinutes;
          hourlyData[key].count++;
        }
      }
    }
  });

  const peakHours = Object.entries(hourlyData).map(([key, data]) => {
    const [day, hour] = key.split("-").map(Number);
    return {
      dayOfWeek: day,
      hour,
      commentCount: data.comments,
      replyCount: data.replies,
      avgResponseTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
    };
  });

  // Simple peak hours summary
  const hourTotals = new Array(24).fill(0);
  peakHours.forEach((p) => { hourTotals[p.hour] += p.commentCount; });
  const peakHoursSummary = hourTotals
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Response Time Impact Analysis ──
  const repliedComments = db.comments.filter((c) => c.status === "replied" && c.replyTimeMinutes);
  let avgResponseTime = 0;
  let fastReplies = 0;
  let slowReplies = 0;
  let fastRepliesWithEngagement = 0;
  let slowRepliesWithEngagement = 0;

  if (repliedComments.length > 0) {
    const totalTime = repliedComments.reduce((sum, c) => sum + (c.replyTimeMinutes || 0), 0);
    avgResponseTime = Math.round(totalTime / repliedComments.length);

    const medianThreshold = 5; // minutes
    repliedComments.forEach((c) => {
      const rt = c.replyTimeMinutes || 0;
      if (rt <= medianThreshold) {
        fastReplies++;
        if ((c.engagementAfterReply || 0) > 0) fastRepliesWithEngagement++;
      } else {
        slowReplies++;
        if ((c.engagementAfterReply || 0) > 0) slowRepliesWithEngagement++;
      }
    });
  }

  const fastEngagementRate = fastReplies > 0 ? Math.round((fastRepliesWithEngagement / fastReplies) * 100) : 0;
  const slowEngagementRate = slowReplies > 0 ? Math.round((slowRepliesWithEngagement / slowReplies) * 100) : 0;

  // Algorithmic impact score (0-100) based on response time
  const algorithmicBoostScore = Math.min(100, Math.round(
    fastReplies > 0
      ? (fastEngagementRate * 0.6 + (100 - Math.min(avgResponseTime * 5, 100)) * 0.4)
      : 50
  ));

  // ── ROI Calculator ──
  const allTimeReplied = db.comments.filter((c) => c.status === "replied").length;
  const allTimeHoursSaved = parseFloat(((allTimeReplied * 2.5) / 60).toFixed(1));
  const hourlyRate = db.roiData?.hourlyRate || 25;
  const allTimeMoneySaved = Math.round(allTimeHoursSaved * hourlyRate);

  // This week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeekReplied = db.comments.filter((c) => {
    if (c.status !== "replied" || !c.replyFiredAt) return false;
    return new Date(c.replyFiredAt) >= weekStart;
  }).length;

  const thisMonthReplied = db.comments.filter((c) => {
    if (c.status !== "replied" || !c.replyFiredAt) return false;
    return new Date(c.replyFiredAt) >= monthStart;
  }).length;

  const roiData = {
    repliesThisWeek: thisWeekReplied,
    hoursSavedThisWeek: parseFloat(((thisWeekReplied * 2.5) / 60).toFixed(1)),
    hourlyRate,
    moneySavedThisWeek: Math.round(((thisWeekReplied * 2.5) / 60) * hourlyRate),
    repliesThisMonth: thisMonthReplied,
    hoursSavedThisMonth: parseFloat(((thisMonthReplied * 2.5) / 60).toFixed(1)),
    moneySavedThisMonth: Math.round(((thisMonthReplied * 2.5) / 60) * hourlyRate),
    allTimeReplies: allTimeReplied,
    allTimeHoursSaved: allTimeHoursSaved,
    allTimeMoneySaved: allTimeMoneySaved,
  };

  // ── Weekly Digest Data ──
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const weekComments = db.comments.filter((c) => new Date(c.publishedAt) >= weekAgo);
  const weekReplied = weekComments.filter((c) => c.status === "replied").length;

  // Top keywords this week
  const keywordsMap: Record<string, number> = {};
  weekComments.forEach((c) => {
    const words = c.text.toLowerCase().split(/\s+/);
    words.forEach((w) => {
      if (w.length > 3) keywordsMap[w] = (keywordsMap[w] || 0) + 1;
    });
  });
  const topWeekKeywords = Object.entries(keywordsMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  // Milestones
  const milestones = db.milestones || [];
  const newMilestones: { label: string; value: number }[] = [];
  const replyMilestones = [10, 50, 100, 500, 1000, 5000, 10000];
  replyMilestones.forEach((m) => {
    if (allTimeReplied >= m && !milestones.find((ms) => ms.type === "replies_count" && ms.value === m)) {
      newMilestones.push({ label: `Auto-replied to ${m.toLocaleString()} comments!`, value: m });
    }
  });

  const weeklyDigest = {
    periodStart: weekAgo.toISOString(),
    periodEnd: now.toISOString(),
    totalComments: weekComments.length,
    autoReplies: weekReplied,
    reviewQueue: weekComments.filter((c) => c.status === "review").length,
    hoursSaved: parseFloat(((weekReplied * 2.5) / 60).toFixed(1)),
    moneySaved: Math.round(((weekReplied * 2.5) / 60) * hourlyRate),
    topKeywords: topWeekKeywords,
    topCommenters: topCommenters.slice(0, 5),
    peakHours: peakHoursSummary,
    rulePerformance: db.rules.map((rule) => {
      const triggers = db.comments.filter((c) => c.matchedRuleId === rule.id).length;
      const successes = db.comments.filter((c) => c.matchedRuleId === rule.id && c.status === "replied").length;
      return {
        name: rule.name,
        triggers,
        accuracy: triggers > 0 ? Math.round((successes / triggers) * 100) : 0,
      };
    }),
    milestones: newMilestones,
  };

  // Save ROI data back
  db.roiData = roiData;
  const { saveDB } = await import("@/database/db");
  await saveDB(db);

  // Return filtered results based on section param
  if (section === "top-commenters") return NextResponse.json({ topCommenters });
  if (section === "peak-hours") return NextResponse.json({ peakHours: peakHoursSummary, heatmap: peakHours });
  if (section === "roi") return NextResponse.json({ roiData });
  if (section === "response-time") return NextResponse.json({
    avgResponseTime,
    fastReplies,
    slowReplies,
    fastEngagementRate,
    slowEngagementRate,
    algorithmicBoostScore,
    impactSummary: `Fast replies (≤5min) get ${fastEngagementRate}% engagement vs ${slowEngagementRate}% for slower replies. Your average response time is ${avgResponseTime} minutes, giving an algorithmic boost score of ${algorithmicBoostScore}/100.`
  });
  if (section === "digest") return NextResponse.json({ weeklyDigest });

  // Return all
  return NextResponse.json({
    topCommenters,
    peakHours: peakHoursSummary,
    heatmap: peakHours,
    roiData,
    responseTime: {
      avgResponseTime,
      fastReplies,
      slowReplies,
      fastEngagementRate,
      slowEngagementRate,
      algorithmicBoostScore,
    },
    weeklyDigest,
  });
}
