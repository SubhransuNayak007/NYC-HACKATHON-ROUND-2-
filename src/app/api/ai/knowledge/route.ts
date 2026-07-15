import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

/**
 * Feature 8: Knowledge base stats and manual entry
 * GET /api/ai/knowledge - Get knowledge base stats
 * POST /api/ai/knowledge - Add a knowledge entry (as FAQ)
 */
export async function GET() {
  const db = await getDB();
  const edits = db.replyEdits || [];
  const effectiveness = db.replyEffectiveness || [];

  const totalEdits = edits.length;
  const avgScore = effectiveness.length > 0
    ? Math.round(effectiveness.reduce((sum, e) => sum + e.effectivenessScore, 0) / effectiveness.length)
    : 0;

  // Extract learnings from recent edits
  const learnings = edits.slice(-50).map((e) => ({
    id: e.id,
    originalText: e.originalText.slice(0, 80) + (e.originalText.length > 80 ? "..." : ""),
    editedText: e.editedText.slice(0, 80) + (e.editedText.length > 80 ? "..." : ""),
    by: e.editedBy,
    ruleId: e.ruleId,
    createdAt: e.editedAt,
  }));

  // Effective patterns
  const effectivePatterns = effectiveness
    .filter((e) => e.effectivenessScore >= 70)
    .slice(-20)
    .map((e) => ({
      commentId: e.commentId,
      score: e.effectivenessScore,
      gotLikes: e.gotLikes,
      likeCount: e.likeCount,
      gotFollowUpReply: e.gotFollowUpReply,
      commenterReturned: e.commenterReturned,
      createdAt: e.trackedAt,
    }));

  return NextResponse.json({
    stats: {
      totalEdits,
      avgEffectiveness: avgScore,
      highScoringReplies: effectiveness.filter((e) => e.effectivenessScore >= 70).length,
      pendingSuggestions: (db.suggestedRules || []).filter((s) => s.status === "pending").length
        + (db.suggestedFAQs || []).filter((s) => s.status === "pending").length,
      totalRules: db.rules.length,
      totalFaqs: (db.faqs || []).length,
    },
    learnings,
    effectivePatterns,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, response, category } = body;

    if (!keyword || !response) {
      return NextResponse.json({ error: "keyword and response required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.faqs) db.faqs = [];

    const newFaq = {
      id: `kb-${Date.now()}`,
      question: keyword,
      answer: response,
      keywords: keyword.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3),
      tone: "friendly" as const,
      useAI: false,
      customReply: response,
      priority: 7,
      tags: ["knowledge-base", category || "manual"],
      variables: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.faqs.push(newFaq as any);
    await saveDB(db);

    return NextResponse.json(newFaq, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add knowledge" }, { status: 500 });
  }
}
