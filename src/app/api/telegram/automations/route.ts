/**
 * ============================================================
 *  GET  /api/telegram/automations
 *  POST /api/telegram/automations
 *  DELETE /api/telegram/automations
 *
 *  Manages Telegram Visual Automation Rules & Execution Records.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, type TelegramAutomation } from "@/database/db";

export async function GET(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    return NextResponse.json({
      success: true,
      automations: db.telegramAutomations || [],
      executions: db.telegramExecutions || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load automations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, trigger, conditions, actions, priority, cooldown, maxExecutions, status } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);
    if (!db.telegramAutomations) db.telegramAutomations = [];

    let rule = db.telegramAutomations.find((r) => r.id === id);

    if (rule) {
      rule.name = name || rule.name;
      rule.trigger = trigger || rule.trigger;
      rule.conditions = conditions || rule.conditions;
      rule.actions = actions || rule.actions;
      rule.priority = priority ?? rule.priority;
      rule.cooldown = cooldown ?? rule.cooldown;
      rule.maxExecutions = maxExecutions ?? rule.maxExecutions;
      rule.status = status || rule.status;
      rule.updatedAt = new Date().toISOString();
    } else {
      rule = {
        id: id || `tgauto_${uuidv4().substring(0, 8)}`,
        tenantId: sessionEmail,
        name: name || "New Telegram Rule",
        status: status || "ACTIVE",
        trigger: trigger || "KEYWORD",
        conditions: conditions || [],
        actions: actions || [],
        priority: priority ?? 10,
        cooldown: cooldown ?? 30,
        maxExecutions: maxExecutions ?? 500,
        approvalMode: "AUTO_EXECUTE",
        executionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.telegramAutomations.unshift(rule);
    }

    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      automation: rule,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save automation rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("id");

    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
    }

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    if (db.telegramAutomations) {
      db.telegramAutomations = db.telegramAutomations.filter((r) => r.id !== ruleId);
      await saveDB(db, sessionEmail);
    }

    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete rule" },
      { status: 500 }
    );
  }
}
