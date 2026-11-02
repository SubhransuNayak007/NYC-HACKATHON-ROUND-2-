/**
 * ============================================================================
 *  QuickReply — LinkedIn Real Analytics & Telemetry API
 *  src/app/api/linkedin/analytics/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB } from "@/database/db";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);
  const { searchParams } = req.nextUrl;
  const timeRange = searchParams.get("range") || "30d";

  const posts = db.linkedinPosts || [];
  const published = posts.filter((p) => p.status === "PUBLISHED");

  // Calculate actual aggregate metrics
  const totalImpressions = published.reduce((sum, p) => sum + (p.impressions || 0), 0);
  const totalReactions = published.reduce((sum, p) => sum + (p.reactions || p.likes || 0), 0);
  const totalComments = published.reduce((sum, p) => sum + (p.comments || 0), 0);
  const totalShares = published.reduce((sum, p) => sum + (p.shares || 0), 0);
  const totalEngagements = totalReactions + totalComments + totalShares;
  const avgEngagementRate =
    totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) : "0.00";

  // Top performing posts
  const topPosts = [...published]
    .sort((a, b) => (b.reactions + b.comments) - (a.reactions + a.comments))
    .slice(0, 5);

  // Content format breakdown
  const formatStats: Record<string, { count: number; totalReactions: number }> = {};
  for (const post of published) {
    const fmt = post.media?.type || (post.article ? "article" : "text");
    if (!formatStats[fmt]) formatStats[fmt] = { count: 0, totalReactions: 0 };
    formatStats[fmt].count++;
    formatStats[fmt].totalReactions += post.reactions || 0;
  }

  return NextResponse.json({
    success: true,
    timeRange,
    summary: {
      totalPostsPublished: published.length,
      totalImpressions,
      totalReactions,
      totalComments,
      totalShares,
      totalEngagements,
      avgEngagementRate: `${avgEngagementRate}%`,
    },
    formatBreakdown: Object.entries(formatStats).map(([format, stats]) => ({
      format,
      postsCount: stats.count,
      avgReactions: stats.count > 0 ? (stats.totalReactions / stats.count).toFixed(1) : "0",
    })),
    topPosts: topPosts.map((p) => ({
      id: p.id,
      content: p.content.slice(0, 100) + (p.content.length > 100 ? "..." : ""),
      publishedAt: p.publishedAt,
      impressions: p.impressions,
      reactions: p.reactions,
      comments: p.comments,
      shares: p.shares,
      providerPostUrn: p.providerPostUrn,
    })),
  });
}
