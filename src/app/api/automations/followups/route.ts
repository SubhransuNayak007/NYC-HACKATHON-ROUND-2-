import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, FollowUpSequence } from "@/database/db";

/**
 * Feature 6: Follow-up Sequences
 * GET /api/automations/followups - List all
 * POST /api/automations/followups - Create a new sequence
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.followUpSequences || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, sequence, escalateAfterSteps, escalateTo } = body;

    if (!commentId || !sequence?.length) {
      return NextResponse.json({ error: "Missing commentId or sequence" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.followUpSequences) db.followUpSequences = [];

    const newSequence: FollowUpSequence = {
      id: `fu-${Date.now()}`,
      commentId,
      sequence: sequence.map((s: any, idx: number) => ({
        step: idx + 1,
        delayHours: s.delayHours || 24,
        message: s.message || "",
        status: "pending" as const,
      })),
      escalateAfterSteps: escalateAfterSteps || 3,
      escalateTo: escalateTo || "",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    db.followUpSequences.push(newSequence);
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Created follow-up sequence for comment`);

    return NextResponse.json(newSequence, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create follow-up" }, { status: 500 });
  }
}
