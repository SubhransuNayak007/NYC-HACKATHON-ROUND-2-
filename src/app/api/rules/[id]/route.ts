import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();
  const rule = db.rules.find((r) => r.id === id);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  return NextResponse.json(rule);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDB();
    const index = db.rules.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updatedRule = {
      ...db.rules[index],
      ...body,
      // Ensure ID and priority don't change by accident through body updates
      id: db.rules[index].id,
      priority: db.rules[index].priority,
    };

    db.rules[index] = updatedRule;
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Edited rule '${updatedRule.name}'`);

    return NextResponse.json(updatedRule);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const rule = db.rules.find((r) => r.id === id);

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    db.rules = db.rules.filter((r) => r.id !== id);
    // Readjust priorities to be sequential (filter() already created a new array, so sorting is safe)
    db.rules.sort((a, b) => a.priority - b.priority);
    db.rules.forEach((r, idx) => {
      r.priority = idx + 1;
    });

    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Deleted rule '${rule.name}'`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
