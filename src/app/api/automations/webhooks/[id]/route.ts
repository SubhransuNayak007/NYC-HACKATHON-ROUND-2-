import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

/**
 * Feature 6: Webhook Trigger CRUD (single)
 * GET/PUT/DELETE /api/automations/webhooks/[id]
 * POST /api/automations/webhooks/[id]/test - Test fire
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  const wh = (db.webhookTriggers || []).find((w) => w.id === id);
  if (!wh) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wh);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.webhookTriggers) db.webhookTriggers = [];

    const idx = db.webhookTriggers.findIndex((w) => w.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.webhookTriggers[idx] = { ...db.webhookTriggers[idx], ...body, id };
    await saveDB(db);
    return NextResponse.json(db.webhookTriggers[idx]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  if (!db.webhookTriggers) db.webhookTriggers = [];

  const wh = db.webhookTriggers.find((w) => w.id === id);
  if (!wh) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.webhookTriggers = db.webhookTriggers.filter((w) => w.id !== id);
  await saveDB(db);
  await logActivity(db.userSession?.name || "Creator", `Deleted webhook '${wh.name}'`);

  return NextResponse.json({ success: true });
}
