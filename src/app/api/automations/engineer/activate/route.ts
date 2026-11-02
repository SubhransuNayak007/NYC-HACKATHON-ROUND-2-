import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { ActivationManager } from "@/backend/automation/activation/ActivationManager";
import { getDB } from "@/database/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, maxRunsPerHour } = body;

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required." }, { status: 400 });
    }

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";
    const userId = session?.email || "owner@workspace.local";

    const db = await getDB(tenantId);
    const spec = db.workflowSpecs?.find((w) => w.id === workflowId);

    const preflight = spec ? ActivationManager.getPreflightSummary(spec) : undefined;

    const { success, record } = await ActivationManager.activateWorkflow({
      workflowId,
      tenantId,
      userId,
      maxRunsPerHour,
    });

    return NextResponse.json({
      success,
      record,
      preflight,
      status: "ACTIVE",
      activatedAt: record.activatedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
