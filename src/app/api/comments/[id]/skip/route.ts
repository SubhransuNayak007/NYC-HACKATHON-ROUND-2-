import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const index = db.comments.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const comment = db.comments[index];

    db.comments[index] = {
      ...comment,
      status: "skipped",
      delayRemainingSeconds: 0,
    };

    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Skipped auto-reply for '${comment.author}'`);

    return NextResponse.json(db.comments[index]);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to skip comment" }, { status: 500 });
  }
}
