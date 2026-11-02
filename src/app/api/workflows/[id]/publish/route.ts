import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { WorkflowDefinition, WorkflowEngine } from "@/backend/workflows/WorkflowEngine";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/publish
 * Validate DAG graph integrity and publish an immutable workflow version
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const workflow: WorkflowDefinition = (db.workflows || []).find((w: WorkflowDefinition) => w.id === id);

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // 1. Validate DAG Graph
    const validation = WorkflowEngine.validateGraph(workflow);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Graph Validation Failed",
          validationErrors: validation.errors,
        },
        { status: 422 }
      );
    }

    // 2. Publish New Immutable Version
    const now = new Date().toISOString();
    workflow.status = "PUBLISHED";
    workflow.version = (workflow.version || 1) + 1;
    workflow.publishedAt = now;
    workflow.updatedAt = now;

    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: workflow.workspaceId,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "workflow.publish",
      resourceType: "workflow",
      resourceId: id,
      description: `Workflow "${workflow.name}" published at Version ${workflow.version}.`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: `Workflow published successfully (v${workflow.version}).`,
      workflow,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to publish workflow" }, { status: 500 });
  }
}
