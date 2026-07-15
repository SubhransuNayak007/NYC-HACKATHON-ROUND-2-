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
    const author = comment.author;

    // Add to blocked users list if not already there
    if (!db.workspace.settings.blockedUsers.includes(author)) {
      db.workspace.settings.blockedUsers.push(author);
    }

    // Skip all current comments by this author
    db.comments = db.comments.map((c) => {
      if (c.author === author && (c.status === "matched" || c.status === "review")) {
        return {
          ...c,
          status: "skipped",
          delayRemainingSeconds: 0,
        };
      }
      return c;
    });

    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Blocked user '${author}' and cancelled all queued replies`);

    // Return the specific updated comment
    const updatedComment = db.comments.find((c) => c.id === id);
    return NextResponse.json(updatedComment);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}
