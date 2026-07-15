import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, ReplyEdit } from "@/database/db";

/**
 * Feature 8: Track manual edits to auto-generated replies
 * GET /api/ai/edits - List all reply edits
 * POST /api/ai/edits - Record a manual edit
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.replyEdits || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, originalText, editedText, ruleId, editedBy } = body;

    if (!commentId || !editedText) {
      return NextResponse.json({ error: "commentId and editedText required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.replyEdits) db.replyEdits = [];

    const edit: ReplyEdit = {
      id: `re-${Date.now()}`,
      commentId,
      originalReply: originalText || "",
      editedReply: editedText,
      originalText: originalText || "",
      editedText,
      editedBy: editedBy || db.userSession?.name || "Creator",
      editedAt: new Date().toISOString(),
      ruleId: ruleId || undefined,
    };

    db.replyEdits.push(edit);
    await saveDB(db);

    return NextResponse.json(edit, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to record edit" }, { status: 500 });
  }
}
