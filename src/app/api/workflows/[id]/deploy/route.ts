import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { ExecutionProviderFactory } from "@/backend/automation/runtime/ExecutionProviderFactory";
import { WorkflowSpec, RuntimeTarget } from "@/backend/automation/types";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/deploy
 * Deploy validated and approved workflow to production runtime
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required to deploy workflows to production runtimes." },
        { status: 401 }
      );
    }

    const tenantId = getCanonicalTenantId(session.email);
    const actorEmail = session.email;

    const db = await getDB(tenantId);
    if (!db.workflowSpecs) db.workflowSpecs = [];

    let specIdx = db.workflowSpecs.findIndex(
      (w: any) =>
        (w.id === id || w.conversationId === id) &&
        w.tenantId === tenantId
    );

    // If not found in user's tenant, check if it's a guest draft being adopted
    if (specIdx === -1) {
      const guestDb = await getDB("guest_demo");
      const guestSpecs = guestDb.workflowSpecs || [];
      const guestIdx = guestSpecs.findIndex(
        (w: any) => w.id === id || w.conversationId === id
      );
      if (guestIdx !== -1) {
        const adoptedSpec: WorkflowSpec = {
          ...guestSpecs[guestIdx],
          tenantId,
          workspaceId: `ws_${tenantId}`,
        };
        db.workflowSpecs.push(adoptedSpec);
        specIdx = db.workflowSpecs.length - 1;
      }
    }

    if (specIdx === -1) {
      return NextResponse.json(
        { error: "Workflow specification not found." },
        { status: 404 }
      );
    }

    const spec: WorkflowSpec = db.workflowSpecs[specIdx];

    // Parse runtimeTarget and options from request body safely
    const body = await req.json().catch(() => ({}));
    const runtimeTarget: RuntimeTarget = body.runtimeTarget || spec.runtimeTarget || "n8n";
    spec.runtimeTarget = runtimeTarget;
    if (!spec.tenantId) {
      spec.tenantId = tenantId;
    }

    // Deploy to target execution runtime
    const provider = ExecutionProviderFactory.getProvider(runtimeTarget);
    const deployment = await provider.deploy(spec, body.options || {});

    // Update spec status
    spec.status = "ACTIVE";
    spec.deployedAt = new Date().toISOString();
    db.workflowSpecs[specIdx] = spec;

    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: spec.workspaceId || `ws_${tenantId}`,
      actorId: actorEmail,
      actorEmail: actorEmail,
      actorRole: session ? "ADMIN" : "GUEST",
      action: "workflow.deploy",
      resourceType: "workflow",
      resourceId: spec.id,
      description: `Workflow "${spec.name}" deployed to ${runtimeTarget} runtime (Deployment ID: ${deployment.deploymentId}).`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      deployment,
      workflowSpec: spec,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Deployment failed." },
      { status: 500 }
    );
  }
}
