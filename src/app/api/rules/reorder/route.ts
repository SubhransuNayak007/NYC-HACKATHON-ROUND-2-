import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ruleIds } = body; // Array of rule IDs in the new order

    if (!ruleIds || !Array.isArray(ruleIds)) {
      return NextResponse.json({ error: "Missing or invalid ruleIds array" }, { status: 400 });
    }

    const db = await getDB();
    
    // Set priority based on order in ruleIds array
    ruleIds.forEach((id, index) => {
      const rule = db.rules.find((r) => r.id === id);
      if (rule) {
        rule.priority = index + 1;
      }
    });

    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", "Reordered rules priority hierarchy");

    return NextResponse.json({ success: true, rules: db.rules.sort((a, b) => a.priority - b.priority) });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to reorder rules" }, { status: 500 });
  }
}
