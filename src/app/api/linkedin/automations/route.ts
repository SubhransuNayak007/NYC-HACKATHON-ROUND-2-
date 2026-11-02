/**
 * ============================================================================
 *  QuickReply — LinkedIn Automation Workflow Builder API
 *  src/app/api/linkedin/automations/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, getCanonicalTenantId, type LinkedInAutomation } from "@/database/db";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);
  const automations = db.linkedinAutomations || [];

  return NextResponse.json({
    success: true,
    total: automations.length,
    automations,
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const body = await req.json().catch(() => ({}));
  const { name, trigger, scheduleCron, topic, tone, formatType, requiresApproval = true, cooldownMs = 86400000 } = body;

  if (!name || !trigger) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAM", message: "name and trigger are required." } },
      { status: 400 }
    );
  }

  const db = await getDB(session.email);
  const tenantId = getCanonicalTenantId(session.email);

  const newAuto: LinkedInAutomation = {
    id: `li_auto_${crypto.randomBytes(6).toString("hex")}`,
    tenantId,
    name: name.trim(),
    isActive: true,
    trigger,
    scheduleCron,
    topic,
    tone,
    formatType,
    requiresApproval: Boolean(requiresApproval),
    cooldownMs: Number(cooldownMs) || 86400000,
    executionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.linkedinAutomations) db.linkedinAutomations = [];
  db.linkedinAutomations.push(newAuto);
  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    automation: newAuto,
  });
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "ADMIN");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAM", message: "id is required." } },
      { status: 400 }
    );
  }

  const db = await getDB(session.email);
  const idx = (db.linkedinAutomations || []).findIndex((a) => a.id === id);

  if (idx === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Automation not found." } },
      { status: 404 }
    );
  }

  db.linkedinAutomations!.splice(idx, 1);
  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    message: "Automation removed successfully.",
  });
}
