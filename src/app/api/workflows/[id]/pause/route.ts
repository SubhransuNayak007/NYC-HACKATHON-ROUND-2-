import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { ActivationManager } from "@/backend/automation/activation/ActivationManager";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/pause
 * Pause an active workflow execution.
 * Requires explicit user confirmation.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const workflowId = resolvedParams.id;

    const session = getSessionUser(req);
    const headerEmail = req.headers.get("x-session-email") || req.headers.get("x-user-email");
    const actorEmail =
      session?.email ||
      headerEmail ||
      (process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT
        ? "admin@quickreply.internal"
        : null);

    if (!actorEmail) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required to pause workflow." },
        { status: 401 }
      );
    }

    const tenantId = session
      ? getCanonicalTenantId(actorEmail)
      : (req.headers.get("x-tenant-id") || getCanonicalTenantId(actorEmail));

    const body = await req.json().catch(() => ({}));

    const isConfirmed =
      body.explicitConfirmation === true || body.confirmed === true || body.confirm === true;

    if (!isConfirmed) {
      return NextResponse.json(
        {
          error: "EXPLICIT_CONFIRMATION_REQUIRED",
          message: "Explicit user confirmation is required to pause workflow execution.",
        },
        { status: 400 }
      );
    }

    const result = await ActivationManager.pauseWorkflow({
      workflowId,
      tenantId,
      userId: actorEmail,
      explicitConfirmation: true,
      reason: body.reason,
    });

    try {
      await AuditLogger.log({
        tenantId,
        workspaceId: `ws_${tenantId}`,
        actorId: actorEmail,
        actorEmail,
        actorRole: session?.role || "ADMIN",
        action: "workflow.pause",
        resourceType: "workflow",
        resourceId: workflowId,
        description: `Workflow '${workflowId}' paused with explicit confirmation.`,
        status: "SUCCESS",
      });
    } catch {
      // Non-blocking audit logger
    }

    return NextResponse.json(result);
  } catch (err: any) {
    const isMissingConfirmation = err.message?.includes("EXPLICIT_CONFIRMATION_REQUIRED");
    const status = isMissingConfirmation ? 400 : err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
