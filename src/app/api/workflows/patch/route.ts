import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import {
  WorkflowPatchEngine,
  GraphPatchOperation,
} from "@/backend/compiler/WorkflowPatchEngine";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/patch
 * Applies minimal, non-destructive graph patch operations to an existing workflow AST.
 * Supports direct atomic operations as well as natural-language conversational instructions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workflowId,
      workflow,
      operations,
      instruction,
      tenantId: bodyTenantId,
    } = body;

    const session = getSessionUser(req);
    const tenantId = session
      ? getCanonicalTenantId(session.email)
      : bodyTenantId || "guest_demo";

    let currentWorkflow = workflow;

    // Load from database if workflowId provided but workflow body omitted
    if (!currentWorkflow && workflowId) {
      const db = await getDB(tenantId);
      const found =
        (db.workflows || []).find((w: any) => w.id === workflowId) ||
        (db.workflowSpecs || []).find((w: any) => w.id === workflowId);

      if (found) {
        currentWorkflow = found;
      }
    }

    if (!currentWorkflow || !Array.isArray(currentWorkflow.nodes)) {
      return NextResponse.json(
        {
          error:
            "Invalid workflow: a workflow object with a 'nodes' array or a valid 'workflowId' is required.",
        },
        { status: 400 }
      );
    }

    // Determine operations: either passed directly or parsed from conversational instruction
    let opsToApply: GraphPatchOperation[] = operations || [];
    if (instruction && typeof instruction === "string" && opsToApply.length === 0) {
      opsToApply = WorkflowPatchEngine.parseConversationalPatch(
        instruction,
        currentWorkflow
      );
    }

    if (!opsToApply || opsToApply.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid patch operations found or derived from instruction.",
        },
        { status: 400 }
      );
    }

    // Apply the patch non-destructively
    let patchedWorkflow: any;
    try {
      patchedWorkflow = WorkflowPatchEngine.applyPatch(currentWorkflow, opsToApply);
    } catch (patchErr: any) {
      return NextResponse.json(
        {
          error: `Failed to apply graph patch: ${patchErr.message}`,
        },
        { status: 422 }
      );
    }

    // If workflow has an ID, persist update to database
    if (patchedWorkflow.id) {
      try {
        const db = await getDB(tenantId);
        if (!db.workflowSpecs) db.workflowSpecs = [];
        if (!db.workflows) db.workflows = [];

        const specIdx = db.workflowSpecs.findIndex(
          (w: any) => w.id === patchedWorkflow.id
        );
        if (specIdx >= 0) {
          db.workflowSpecs[specIdx] = {
            ...db.workflowSpecs[specIdx],
            ...patchedWorkflow,
            updatedAt: new Date().toISOString(),
          };
        }

        const wfIdx = db.workflows.findIndex(
          (w: any) => w.id === patchedWorkflow.id
        );
        if (wfIdx >= 0) {
          db.workflows[wfIdx] = {
            ...db.workflows[wfIdx],
            ...patchedWorkflow,
            updatedAt: new Date().toISOString(),
          };
        }

        await saveDB(db, tenantId);
      } catch {
        // InMemory fallback
      }
    }

    return NextResponse.json({
      success: true,
      workflow: patchedWorkflow,
      operationsApplied: opsToApply,
      version: patchedWorkflow.version,
      updatedAt: patchedWorkflow.updatedAt,
      message: `Successfully applied ${opsToApply.length} patch operation(s).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Workflow patch request failed.", details: err.message },
      { status: 500 }
    );
  }
}
