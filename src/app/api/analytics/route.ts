import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

export async function GET(req: NextRequest) {
  const db = await getDB();
  
  // Calculate 100% real stats from actual db comments
  const liveReplied = db.comments.filter((c) => c.status === "replied").length;
  const liveSkipped = db.comments.filter((c) => c.status === "skipped").length;
  const liveReview = db.comments.filter((c) => c.status === "review").length;
  const liveFailed = db.comments.filter((c) => c.status === "failed").length;
  const liveMatched = db.comments.filter((c) => c.status === "matched").length;
  
  const totalReplied = liveReplied;
  const totalProcessed = db.comments.length;
  
  // Hours saved: 2.5 minutes per reply
  const hoursSaved = totalReplied > 0 ? parseFloat(((totalReplied * 2.5) / 60).toFixed(1)) : 0;
  
  // Calculate accuracy: (Replied + Skipped + Review) / Checked. 
  // If no comments checked, default to 100%.
  let matchAccuracy = 100;
  if (totalProcessed > 0) {
    const validMatches = totalProcessed - liveFailed;
    matchAccuracy = parseFloat(((validMatches / totalProcessed) * 100).toFixed(1));
  }

  // 1. Line chart: Auto-replies sent per day (last 30 days) from real timestamps
  const repliesPerDay = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    // Filter comments replied on this day
    const dayStartStr = d.toISOString().split("T")[0];
    const repliesOnDay = db.comments.filter((c) => {
      if (c.status !== "replied" || !c.replyFiredAt) return false;
      return c.replyFiredAt.split("T")[0] === dayStartStr;
    }).length;

    repliesPerDay.push({ date: dateLabel, replies: repliesOnDay });
  }

  // 2. Bar chart: Triggered keywords in comments
  const keywordsMap: { [key: string]: number } = {
    price: 0,
    cost: 0,
    "how much": 0,
    discount: 0,
    coupon: 0,
    support: 0,
    broken: 0,
    promo: 0,
    error: 0,
    help: 0
  };

  db.comments.forEach((c) => {
    const textLower = c.text.toLowerCase();
    Object.keys(keywordsMap).forEach((kw) => {
      if (textLower.includes(kw)) {
        keywordsMap[kw]++;
      }
    });
  });

  const topKeywords = Object.keys(keywordsMap).map((kw) => ({
    keyword: kw,
    count: keywordsMap[kw]
  })).sort((a, b) => b.count - a.count);

  // 3. Donut chart: Reply outcome breakdown
  const outcomeBreakdown = [
    { name: "Sent (Auto)", value: totalReplied, color: "#1A73E8" },
    { name: "Skipped", value: liveSkipped, color: "#5F6368" },
    { name: "Needs Review", value: liveReview, color: "#FBBC04" },
    { name: "Failed / Quota", value: liveFailed, color: "#EA4335" }
  ];

  // 4. Table: Rule performance
  const rulePerformance = db.rules.map((rule) => {
    const matchCount = db.comments.filter((c) => c.matchedRuleId === rule.id).length;
    const repliedMatches = db.comments.filter((c) => c.matchedRuleId === rule.id && c.status === "replied").length;
    
    let ruleAccuracy = 100;
    if (matchCount > 0) {
      ruleAccuracy = Math.round((repliedMatches / matchCount) * 100);
    }
    
    return {
      id: rule.id,
      name: rule.name,
      triggerCount: matchCount,
      confidence: rule.isActive ? `${ruleAccuracy}%` : "—",
      replyRate: rule.isActive ? `${ruleAccuracy}%` : "0%"
    };
  });

  // Sentiment Breakdown
  const sentimentBreakdown = {
    positive: db.comments.filter((c) => c.sentiment === "positive").length,
    neutral: db.comments.filter((c) => c.sentiment === "neutral").length,
    negative: db.comments.filter((c) => c.sentiment === "negative").length,
    question: db.comments.filter((c) => c.sentiment === "question").length,
    spam: db.comments.filter((c) => c.sentiment === "spam").length,
  };

  // Sentiment Trend (30 days)
  const sentimentTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStartStr = d.toISOString().split("T")[0];
    const dayComments = db.comments.filter((c) => {
      const createdDate = c.matchedAt || c.replyFiredAt || "";
      return createdDate.split("T")[0] === dayStartStr;
    });
    sentimentTrend.push({
      date: dateLabel,
      positive: dayComments.filter((c) => c.sentiment === "positive").length,
      neutral: dayComments.filter((c) => c.sentiment === "neutral").length,
      negative: dayComments.filter((c) => c.sentiment === "negative").length,
    });
  }

  // Golden-hour stats: comments that arrived within 60 min of video publish
  const goldenHourComments = db.comments.filter(c => {
    if (!c.publishedAt || !c.fetchedAt) return false;
    const publishMs = new Date(c.publishedAt).getTime();
    const fetchMs = new Date(c.fetchedAt).getTime();
    return fetchMs - publishMs <= 60 * 60 * 1000 && fetchMs - publishMs >= 0;
  });
  const goldenHourReplied = goldenHourComments.filter(c => c.status === "replied").length;
  const goldenHourTotal = goldenHourComments.length;
  const goldenHourRate = goldenHourTotal > 0 ? Math.round((goldenHourReplied / goldenHourTotal) * 100) : 0;

  // Average reply latency (fetchedAt → replyFiredAt) in seconds
  const repliedComments = db.comments.filter(c => c.status === "replied" && c.fetchedAt && c.replyFiredAt);
  const avgReplyLatency = repliedComments.length > 0
    ? repliedComments.reduce((sum, c) => sum + (new Date(c.replyFiredAt!).getTime() - new Date(c.fetchedAt!).getTime()), 0) / repliedComments.length / 1000
    : 0;

  return NextResponse.json({
    kpis: {
      commentsProcessed: totalProcessed.toLocaleString(),
      matchAccuracy: `${matchAccuracy}%`,
      hoursSaved: `${hoursSaved} hrs`,
      repliesSent: totalReplied.toLocaleString()
    },
    repliesPerDay,
    topKeywords,
    outcomeBreakdown,
    rulePerformance,
    sentimentBreakdown,
    sentimentTrend,
    goldenHourStats: {
      total: goldenHourTotal,
      replied: goldenHourReplied,
      rate: goldenHourRate,
      firstHourAnswerRate: goldenHourRate,
      commentsLastHour: db.comments.filter((c) => c.fetchedAt && Date.now() - new Date(c.fetchedAt).getTime() <= 60 * 60 * 1000).length,
    },
    avgReplyLatencySeconds: Math.round(avgReplyLatency),
    ragStats: {
      totalFAQs: (db.faqs || []).length,
      ragReplies: db.comments.filter((c) => c.matchedRuleId?.startsWith("rag_")).length,
      ragCategories: [...new Set((db.faqs || []).map((f) => f.category))].length
    }
  });
}
