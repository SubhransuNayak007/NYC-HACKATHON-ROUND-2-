import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { RuleSimulator } from "@/backend/rules/RuleSimulator";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation-engine/simulate
 * Run a dry-run test simulation and return step-by-step decision explainability
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { commentText, authorName, platform, videoId, videoTitle, customerTags, leadScore } = body;

    if (!commentText || !commentText.trim()) {
      return NextResponse.json({ error: "Comment text is required for simulation." }, { status: 400 });
    }

    const result = await RuleSimulator.simulate({
      tenantId,
      commentText,
      authorName,
      platform,
      videoId,
      videoTitle,
      customerTags,
      leadScore,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Simulation failed" }, { status: 500 });
  }
}
