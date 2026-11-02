import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { WorkflowDefinition, WorkflowEngine } from "@/backend/workflows/WorkflowEngine";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/workflows/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const workflow = (db.workflows || []).find((w: WorkflowDefinition) => w.id === id);

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load workflow" }, { status: 500 });
  }
}

/**
 * PUT /api/workflows/[id]
 * Save Draft Changes & Graph Edits
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const db = await getDB(tenantId);

    if (!db.workflows) db.workflows = [];
    const index = db.workflows.findIndex((w: WorkflowDefinition) => w.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const current = db.workflows[index];
    const updated: WorkflowDefinition = {
      ...current,
      name: body.name !== undefined ? body.name : current.name,
      description: body.description !== undefined ? body.description : current.description,
      nodes: body.nodes !== undefined ? body.nodes : current.nodes,
      edges: body.edges !== undefined ? body.edges : current.edges,
      updatedAt: new Date().toISOString(),
    };

    db.workflows[index] = updated;
    await saveDB(db, tenantId);

    return NextResponse.json({ success: true, workflow: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update workflow" }, { status: 500 });
  }
}

/**
 * DELETE /api/workflows/[id]
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);

    if (!db.workflows) db.workflows = [];
    const workflow = db.workflows.find((w: any) => w.id === id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    db.workflows = db.workflows.filter((w: any) => w.id !== id);
    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: workflow.workspaceId,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "workflow.delete",
      resourceType: "workflow",
      resourceId: id,
      description: `Workflow "${workflow.name}" was deleted.`,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, message: "Workflow deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete workflow" }, { status: 500 });
  }
}
