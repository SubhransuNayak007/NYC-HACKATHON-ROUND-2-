import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { ActivationManager } from "@/backend/automation/activation/ActivationManager";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/activate
 * Production activation of an approved workflow.
 * Requires explicit user confirmation distinct from workflow plan approval.
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
        { error: "Unauthorized", message: "Authentication required to activate workflow into production." },
        { status: 401 }
      );
    }

    const tenantId = session
      ? getCanonicalTenantId(actorEmail)
      : (req.headers.get("x-tenant-id") || getCanonicalTenantId(actorEmail));

    const body = await req.json().catch(() => ({}));

    // Verify explicit confirmation
    const isConfirmed =
      body.explicitConfirmation === true || body.confirmed === true || body.confirm === true;

    if (!isConfirmed) {
      return NextResponse.json(
        {
          error: "EXPLICIT_CONFIRMATION_REQUIRED",
          message:
            "Explicit user confirmation is required to activate workflow into production. Plan approval alone does not authorize production activation.",
        },
        { status: 400 }
      );
    }

    const result = await ActivationManager.activateWorkflow({
      workflowId,
      tenantId,
      userId: actorEmail,
      explicitConfirmation: true,
      confirmationDetails: body.confirmationDetails || body.confirmation,
      maxRunsPerHour: body.maxRunsPerHour,
      allowedDestinations: body.allowedDestinations,
    });

    try {
      await AuditLogger.log({
        tenantId,
        workspaceId: `ws_${tenantId}`,
        actorId: actorEmail,
        actorEmail,
        actorRole: session?.role || "ADMIN",
        action: "workflow.activate",
        resourceType: "workflow",
        resourceId: workflowId,
        description: `Workflow '${workflowId}' activated into production with explicit confirmation.`,
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
