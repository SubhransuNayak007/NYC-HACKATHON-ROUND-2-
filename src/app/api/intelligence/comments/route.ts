import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { CommentIntelligenceService } from "@/backend/intelligence/CommentIntelligenceService";

export const dynamic = "force-dynamic";

/**
 * GET /api/intelligence/comments
 * Query and filter multi-channel comments with smart queues and spam scores
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const searchParams = req.nextUrl.searchParams;

    const platform = searchParams.get("platform") || undefined;
    const contentId = searchParams.get("contentId") || undefined;
    const searchKeyword = searchParams.get("search") || undefined;
    const intent = searchParams.get("intent") || undefined;
    const queueCategory = searchParams.get("queue") || undefined;
    const sentiment = searchParams.get("sentiment") || undefined;
    const unansweredOnly = searchParams.get("unanswered") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await CommentIntelligenceService.searchComments(tenantId, {
      platform,
      contentId,
      searchKeyword,
      intent,
      queueCategory,
      sentiment,
      unansweredOnly,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      intentDistribution: result.intentDistribution,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to query comment intelligence" }, { status: 500 });
  }
}
