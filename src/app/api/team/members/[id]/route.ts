import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

/**
 * GET/PUT/DELETE /api/team/members/[id]
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  const member = (db.teamMembers || []).find((m) => m.id === id);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.teamMembers) db.teamMembers = [];

    const idx = db.teamMembers.findIndex((m) => m.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.teamMembers[idx] = { ...db.teamMembers[idx], ...body, id };
    await saveDB(db);
    return NextResponse.json(db.teamMembers[idx]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  if (!db.teamMembers) db.teamMembers = [];

  const member = db.teamMembers.find((m) => m.id === id);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.teamMembers = db.teamMembers.filter((m) => m.id !== id);
  await saveDB(db);
  await logActivity(db.userSession?.name || "Creator", `Removed team member '${member.name}'`);

  return NextResponse.json({ success: true });
}
