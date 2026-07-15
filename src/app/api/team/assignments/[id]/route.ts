import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

/**
 * PUT /api/team/assignments/[id] - Update assignment status
 * DELETE /api/team/assignments/[id] - Remove assignment
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.commentAssignments) db.commentAssignments = [];

    // id is the commentId
    const idx = db.commentAssignments.findIndex((a) => a.commentId === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.commentAssignments[idx] = { ...db.commentAssignments[idx], ...body };
    await saveDB(db);
    return NextResponse.json(db.commentAssignments[idx]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  if (!db.commentAssignments) db.commentAssignments = [];

  db.commentAssignments = db.commentAssignments.filter((a) => a.commentId !== id);
  await saveDB(db);
  return NextResponse.json({ success: true });
}
