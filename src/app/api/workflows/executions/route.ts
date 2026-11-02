/**
 * POST /api/workflows/executions — Trigger new execution
 * GET  /api/workflows/executions — List executions
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { globalDurableExecutionEngine, WorkflowDefinitionV3 } from "@/backend/engine/DurableExecutionEngine";
import { globalCheckpointManager } from "@/backend/engine/CheckpointManager";
import { TenantGuard } from "@/backend/security/TenantGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, workflow, triggerPayload, tenantId = "tenant_default", workspaceId = "ws_default" } = body;

    const callerRole = req.headers.get("x-user-role") || "EDITOR";
    TenantGuard.assertPermission(callerRole, "workflows.execute_trigger");

    let targetWorkflow: WorkflowDefinitionV3 | undefined = workflow;

    if (!targetWorkflow && !workflowId) {
      return NextResponse.json(
        { error: "Must provide either 'workflow' definition or 'workflowId'" },
        { status: 400 }
      );
    }

    if (!targetWorkflow) {
      // Create minimal workflow referencing workflowId
      targetWorkflow = {
        id: workflowId,
        version: 1,
        name: `Workflow ${workflowId}`,
        tenantId,
        workspaceId,
        nodes: [
          {
            id: "node_trigger_1",
            type: "trigger",
            label: "Manual Trigger",
            parameters: {},
          },
        ],
        edges: [],
      };
    }

    const executionId = `exec_${crypto.randomUUID()}`;

    // Execute asynchronously via DEE
    globalDurableExecutionEngine
      .executeWorkflow(targetWorkflow, {
        executionId,
        tenantId,
        workspaceId,
        triggerPayload: triggerPayload || {},
      })
      .catch((err) => {
        console.error(`[ExecutionsRoute] Execution ${executionId} failed:`, err);
      });

    return NextResponse.json(
      {
        executionId,
        workflowId: targetWorkflow.id,
        status: "STARTED",
        streamUrl: `/api/workflows/executions/${executionId}/stream`,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    const status = err.statusCode || (err.name === "ForbiddenError" ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const callerRole = req.headers.get("x-user-role") || "VIEWER";
    TenantGuard.assertPermission(callerRole, "executions.view_logs");

    const incomplete = await globalCheckpointManager.listIncompleteCheckpoints(0);
    return NextResponse.json({ executions: incomplete.slice(0, limit) });
  } catch (err: any) {
    const status = err.statusCode || (err.name === "ForbiddenError" ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
