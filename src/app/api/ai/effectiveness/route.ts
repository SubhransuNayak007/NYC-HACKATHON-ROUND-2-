import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, ReplyEffectiveness } from "@/database/db";

/**
 * Feature 8: Reply effectiveness scoring
 * GET /api/ai/effectiveness - List effectiveness scores
 * POST /api/ai/effectiveness - Score a reply
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.replyEffectiveness || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      commentId, replyText, gotLikes, likeCount,
      gotFollowUpReply, followUpSentiment, commenterReturned, effectivenessScore,
    } = body;

    if (!commentId || effectivenessScore === undefined) {
      return NextResponse.json({ error: "commentId and effectivenessScore required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.replyEffectiveness) db.replyEffectiveness = [];

    const entry: ReplyEffectiveness = {
      commentId,
      replyText: replyText || "",
      replyFiredAt: new Date().toISOString(),
      gotLikes: gotLikes || false,
      likeCount: likeCount || 0,
      gotFollowUpReply: gotFollowUpReply || false,
      followUpSentiment: followUpSentiment || undefined,
      commenterReturned: commenterReturned || false,
      effectivenessScore: Math.max(0, Math.min(100, effectivenessScore)),
      trackedAt: new Date().toISOString(),
    };

    db.replyEffectiveness.push(entry);
    await saveDB(db);

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to score reply" }, { status: 500 });
  }
}
