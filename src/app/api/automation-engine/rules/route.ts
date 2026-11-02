import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { AutomationRule } from "@/backend/rules/types";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/automation-engine/rules
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const rules: AutomationRule[] = db.automationRules || [];

    return NextResponse.json({
      success: true,
      rules,
      total: rules.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load rules" }, { status: 500 });
  }
}

/**
 * POST /api/automation-engine/rules
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { name, description, mode, priority, scope, conditions, intentConfig, ragConfig, actionPlan, schedule, delays, stopConditions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Rule name is required." }, { status: 400 });
    }

    const ruleId = `rule_${uuidv4()}`;
    const now = new Date().toISOString();

    const newRule: AutomationRule = {
      id: ruleId,
      tenantId,
      workspaceId: `ws_${tenantId}`,
      name: name.trim(),
      description: description || "",
      mode: mode || "TAG",
      status: "PUBLISHED",
      version: 1,
      priority: typeof priority === "number" ? priority : 50,
      scope: scope || { targetType: "ALL_CONTENT", targetIds: [], platforms: ["youtube", "instagram"] },
      conditions: conditions || { type: "leaf", field: "comment.text", operator: "always_pass", value: "" },
      intentConfig,
      ragConfig,
      actionPlan: actionPlan || { actionType: "reply_comment", templateText: "Thanks for your comment!" },
      schedule,
      delays,
      stopConditions: stopConditions || { stopAfterMatch: true, stopIfActionSucceeds: true, stopIfHighRisk: true, maxActionsPerComment: 1 },
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      executionStats: {
        timesEvaluated: 0,
        timesMatched: 0,
        actionsExecuted: 0,
        actionsBlocked: 0,
        avgLatencyMs: 0,
      },
    };

    const db = await getDB(tenantId);
    if (!db.automationRules) db.automationRules = [];
    db.automationRules.unshift(newRule);

    // Also mirror into db.rules for universal compatibility
    if (!db.rules) db.rules = [];
    const conditionKeyword =
      conditions?.children?.[0]?.value ||
      (conditions?.field === "comment.text" ? conditions?.value : "") ||
      intentConfig?.expectedIntent ||
      "";

    db.rules.unshift({
      id: ruleId,
      name: newRule.name,
      isActive: true,
      priority: newRule.priority,
      colorLabel: "blue",
      conditions: [{ id: `c_${ruleId}`, type: "contains", value: String(conditionKeyword) }],
      operator: "OR",
      filters: { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" },
      templateId: "",
      delaySeconds: delays?.seconds || 60,
      dailyLimit: 100,
      customVariable1: actionPlan?.templateText || "Auto-reply from QuickReply",
      customVariable2: "",
      customVariable3: "",
      approvalMode: "autonomous",
    });

    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: newRule.workspaceId,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "rule.created",
      resourceType: "workflow",
      resourceId: ruleId,
      description: `Rule "${newRule.name}" created in ${newRule.mode} mode (Priority: ${newRule.priority}).`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create rule" }, { status: 500 });
  }
}

/**
 * PATCH /api/automation-engine/rules
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ error: "Rule ID is required." }, { status: 400 });

    const db = await getDB(tenantId);
    let found = false;

    if (db.automationRules) {
      const idx = db.automationRules.findIndex((r) => r.id === id);
      if (idx !== -1) {
        if (status) db.automationRules[idx].status = status;
        db.automationRules[idx].updatedAt = new Date().toISOString();
        found = true;
      }
    }

    if (db.rules) {
      const rIdx = db.rules.findIndex((r) => r.id === id);
      if (rIdx !== -1) {
        db.rules[rIdx].isActive = status === "PUBLISHED" || status === "active" || status === "ACTIVE";
        found = true;
      }
    }

    if (found) {
      await saveDB(db, tenantId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update rule" }, { status: 500 });
  }
}

/**
 * DELETE /api/automation-engine/rules
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Rule ID is required." }, { status: 400 });

    const db = await getDB(tenantId);
    if (db.automationRules) {
      db.automationRules = db.automationRules.filter((r) => r.id !== id);
    }
    if (db.rules) {
      db.rules = db.rules.filter((r) => r.id !== id);
    }
    await saveDB(db, tenantId);

    return NextResponse.json({ success: true, deleted: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete rule" }, { status: 500 });
  }
}
