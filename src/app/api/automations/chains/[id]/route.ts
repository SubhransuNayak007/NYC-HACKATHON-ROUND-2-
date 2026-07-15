import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

/**
 * Feature 6: Automation Chain CRUD (single)
 * GET /api/automations/chains/[id]
 * PUT /api/automations/chains/[id]
 * DELETE /api/automations/chains/[id]
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  const chain = (db.automationChains || []).find((c) => c.id === id);
  if (!chain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chain);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.automationChains) db.automationChains = [];

    const idx = db.automationChains.findIndex((c) => c.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.automationChains[idx] = { ...db.automationChains[idx], ...body, id };
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Updated automation chain '${db.automationChains[idx].name}'`);

    return NextResponse.json(db.automationChains[idx]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  if (!db.automationChains) db.automationChains = [];

  const chain = db.automationChains.find((c) => c.id === id);
  if (!chain) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.automationChains = db.automationChains.filter((c) => c.id !== id);
  await saveDB(db);
  await logActivity(db.userSession?.name || "Creator", `Deleted automation chain '${chain.name}'`);

  return NextResponse.json({ success: true });
}
