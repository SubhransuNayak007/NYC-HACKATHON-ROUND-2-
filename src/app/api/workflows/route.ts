import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { WorkflowDefinition, WorkflowEngine } from "@/backend/workflows/WorkflowEngine";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/workflows
 * List workflows for authenticated tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const workflows: WorkflowDefinition[] = db.workflows || [];

    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load workflows" }, { status: 500 });
  }
}

/**
 * POST /api/workflows
 * Create a new visual DAG workflow
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { name, description, nodes, edges } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Workflow name is required." }, { status: 400 });
    }

    const workflowId = `wf_${uuidv4()}`;
    const now = new Date().toISOString();

    const newWorkflow: WorkflowDefinition = {
      id: workflowId,
      tenantId,
      workspaceId: `ws_${tenantId}`,
      name: name.trim(),
      description: description || "",
      status: "DRAFT",
      version: 1,
      nodes: nodes || [
        {
          id: "node_trigger",
          type: "trigger.event",
          label: "Inbound Comment / DM",
          config: { platform: "all", eventType: "comment.created" },
        },
      ],
      edges: edges || [],
      createdBy: session.email,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDB(tenantId);
    if (!db.workflows) db.workflows = [];

    db.workflows.unshift(newWorkflow);
    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: newWorkflow.workspaceId,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "workflow.create",
      resourceType: "workflow",
      resourceId: workflowId,
      description: `Workflow "${newWorkflow.name}" created.`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      workflow: newWorkflow,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create workflow" }, { status: 500 });
  }
}
