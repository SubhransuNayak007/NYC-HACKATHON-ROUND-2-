import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  joinedAt: string;
  lastActive?: string;
}

/**
 * GET /api/team/members - List all team members
 * POST /api/team/members - Add a team member
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.teamMembers || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.teamMembers) db.teamMembers = [];

    // Check duplicate
    if (db.teamMembers.some((m) => m.email === email)) {
      return NextResponse.json({ error: "Member with this email already exists" }, { status: 409 });
    }

    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name,
      email,
      role: role || "viewer",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0038FF&color=fff&bold=true`,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    db.teamMembers.push(newMember);
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Added team member '${name}' as ${role}`);

    return NextResponse.json(newMember, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
