import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB, InstagramAutomation } from "@/database/db";

/**
 * GET /api/instagram/automations
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    if (!db.instagramAutomations || db.instagramAutomations.length === 0) {
      db.instagramAutomations = [
        {
          id: "ig_aut_global_catchall",
          tenantId,
          name: "⚡ Global AI Copilot: Auto-Reply to Every Comment",
          status: "ACTIVE",
          trigger: "NEW_COMMENT",
          conditions: [{ type: "contains_keyword", value: "*" }],
          actions: [
            { type: "REPLY_COMMENT", payload: "Grounded in store FAQ and product catalog with sub-second latency" },
            { type: "UPDATE_LEAD_SCORE", scoreDelta: 5 },
          ],
          priority: 1,
          cooldownMs: 5000,
          maxExecutionsPerHour: 500,
          approvalMode: "AUTO_EXECUTE",
          executionCount: 142,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "ig_aut_comment_to_dm_price",
          tenantId,
          name: "Comment-to-DM: Pricing & Buy Link Dispatch",
          status: "ACTIVE",
          trigger: "COMMENT_KEYWORD",
          conditions: [{ type: "contains_keyword", value: "price, cost, link, buy, size, how much" }],
          actions: [
            { type: "REPLY_COMMENT", payload: "Hey @{username}! Check your DM for direct checkout link & sizing guide! 🛍️" },
            { type: "SEND_DM", payload: "Hi! Thanks for asking about our collection. You can order directly here with free shipping: quickreply.ai/shop ✨" },
            { type: "ADD_CRM_TAG", tag: "HOT_LEAD" },
          ],
          priority: 10,
          cooldownMs: 15000,
          maxExecutionsPerHour: 200,
          approvalMode: "AUTO_EXECUTE",
          executionCount: 89,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "ig_aut_promo_discount_drop",
          tenantId,
          name: "VIP Promo Drop: Comment 'DISCOUNT' or 'PROMO'",
          status: "ACTIVE",
          trigger: "COMMENT_KEYWORD",
          conditions: [{ type: "contains_keyword", value: "discount, promo, coupon, sale, offer" }],
          actions: [
            { type: "REPLY_COMMENT", payload: "Sent you our exclusive 20% off code in your DM! 🎟️" },
            { type: "SEND_DM", payload: "Here is your exclusive coupon code: INSTA20 for 20% off at checkout!" },
            { type: "ADD_CRM_TAG", tag: "PROMO_USER" },
          ],
          priority: 10,
          cooldownMs: 30000,
          maxExecutionsPerHour: 100,
          approvalMode: "AUTO_EXECUTE",
          executionCount: 34,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      await saveDB(db, session.email);
    }

    const automations = (db.instagramAutomations || []).filter((a) => a.tenantId === tenantId);
    const executions = (db.instagramExecutions || []).filter((e) => e.tenantId === tenantId);

    return NextResponse.json({
      success: true,
      automations,
      rules: automations,
      executions: executions.slice(-20).reverse(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load automations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/automations
 * Creates or updates a WHEN/IF/THEN automation workflow
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, trigger, conditions, actions, priority, cooldownMs, maxExecutionsPerHour, approvalMode, status } = body;

    if (!name || !trigger) {
      return NextResponse.json({ error: "Missing automation name or trigger" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    if (!db.instagramAutomations) db.instagramAutomations = [];

    if (id) {
      const existing = db.instagramAutomations.find((a) => a.id === id && a.tenantId === tenantId);
      if (!existing) {
        return NextResponse.json({ error: "Automation not found" }, { status: 404 });
      }
      existing.name = name;
      existing.trigger = trigger;
      existing.conditions = conditions || [];
      existing.actions = actions || [];
      existing.priority = priority ?? 10;
      existing.cooldownMs = cooldownMs ?? 60000;
      existing.maxExecutionsPerHour = maxExecutionsPerHour ?? 100;
      existing.approvalMode = approvalMode || "AUTO_EXECUTE";
      existing.status = status || existing.status;
      existing.updatedAt = new Date().toISOString();

      await saveDB(db, session.email);
      return NextResponse.json({ success: true, automation: existing });
    }

    const newAutomation: InstagramAutomation = {
      id: `ig_aut_${uuidv4().substring(0, 8)}`,
      tenantId,
      name,
      status: status || "ACTIVE",
      trigger: trigger || "NEW_COMMENT",
      conditions: conditions || [],
      actions: actions || [{ type: "REPLY_COMMENT", payload: "Thanks for reaching out! 🙌" }],
      priority: priority ?? 10,
      cooldownMs: cooldownMs ?? 60000,
      maxExecutionsPerHour: maxExecutionsPerHour ?? 100,
      approvalMode: approvalMode || "AUTO_EXECUTE",
      executionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.instagramAutomations.push(newAutomation);
    await saveDB(db, session.email);

    return NextResponse.json({ success: true, automation: newAutomation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save automation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instagram/automations
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member access required" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing automation id" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    if (db.instagramAutomations) {
      db.instagramAutomations = db.instagramAutomations.filter((a) => !(a.id === id && a.tenantId === tenantId));
      await saveDB(db, session.email);
    }

    return NextResponse.json({ success: true, message: "Automation deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete automation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/instagram/automations
 * Toggles status or fields of an automation rule
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, name, trigger, conditions, actions } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing automation id" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const rule = (db.instagramAutomations || []).find((a) => a.id === id && a.tenantId === tenantId);
    if (!rule) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    if (status !== undefined) rule.status = status;
    if (name !== undefined) rule.name = name;
    if (trigger !== undefined) rule.trigger = trigger;
    if (conditions !== undefined) rule.conditions = conditions;
    if (actions !== undefined) rule.actions = actions;
    rule.updatedAt = new Date().toISOString();

    await saveDB(db, session.email);
    return NextResponse.json({ success: true, automation: rule });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update automation" },
      { status: 500 }
    );
  }
}
