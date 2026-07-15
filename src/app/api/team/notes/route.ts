import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, CommentNote } from "@/database/db";

/**
 * GET /api/team/notes?commentId=xxx - List notes for a comment
 * POST /api/team/notes - Add a note to a comment
 */
export async function GET(req: NextRequest) {
  const db = await getDB();
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");

  let notes = db.commentNotes || [];
  if (commentId) {
    notes = notes.filter((n) => n.commentId === commentId);
  }
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, author, content } = body;

    if (!commentId || !content) {
      return NextResponse.json({ error: "commentId and content are required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.commentNotes) db.commentNotes = [];

    const note: CommentNote = {
      id: `cn-${Date.now()}`,
      commentId,
      author: author || db.userSession?.name || "Creator",
      text: content,
      isInternal: true,
      createdAt: new Date().toISOString(),
    };

    db.commentNotes.push(note);
    await saveDB(db);

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
