import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, AutomationChain } from "@/database/db";

/**
 * Feature 6: Workflow Automations — Conditional Chains
 * GET /api/automations/chains - List all chains
 * POST /api/automations/chains - Create a new chain
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.automationChains || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, conditions, operator, actions } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing chain name" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.automationChains) db.automationChains = [];

    const maxPriority = db.automationChains.reduce((max, c) => c.priority > max ? c.priority : max, 0);

    const newChain: AutomationChain = {
      id: `chain-${Date.now()}`,
      name,
      isActive: true,
      priority: maxPriority + 1,
      conditions: conditions || [],
      operator: operator || "AND",
      actions: actions || [],
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    };

    db.automationChains.push(newChain);
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Created automation chain '${name}'`);

    return NextResponse.json(newChain, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to create chain" }, { status: 500 });
  }
}
