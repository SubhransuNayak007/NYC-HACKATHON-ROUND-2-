import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";
import { postCommentReply } from "@/backend/youtube";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { autoReplyText } = body;

    const db = await getDB();
    const index = db.comments.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const comment = db.comments[index];
    const finalReplyText = autoReplyText || comment.autoReplyText || "Thank you for commenting!";

    // Call official YouTube API to post comment reply
    await postCommentReply(comment.channelId, comment.id, finalReplyText);

    db.comments[index] = {
      ...comment,
      status: "replied",
      autoReplyText: finalReplyText,
      delayRemainingSeconds: 0,
      replyFiredAt: new Date().toISOString(),
    };

    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Manually replied to '${comment.author}'`);

    return NextResponse.json(db.comments[index]);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to fire reply" }, { status: 500 });
  }
}
