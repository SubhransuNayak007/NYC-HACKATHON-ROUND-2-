import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, CommentAssignment } from "@/database/db";

/**
 * GET /api/team/assignments - List all assignments
 * POST /api/team/assignments - Assign a comment to a team member
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.commentAssignments || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, assignedTo, assignedBy, note } = body;

    if (!commentId || !assignedTo) {
      return NextResponse.json({ error: "commentId and assignedTo are required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.commentAssignments) db.commentAssignments = [];

    // Update existing or create new
    const existingIdx = db.commentAssignments.findIndex((a) => a.commentId === commentId);
    const assignment: CommentAssignment = {
      commentId,
      assignedTo,
      assignedBy: assignedBy || db.userSession?.name || "Creator",
      assignedAt: new Date().toISOString(),
      status: "pending",
      note: note || "",
      priority: "normal",
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.commentAssignments[existingIdx] = assignment;
    } else {
      db.commentAssignments.push(assignment);
    }

    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Assigned comment to ${assignedTo}`);

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}
