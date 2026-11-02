/**
 * POST /api/workflows/executions/[id]/resume — Resume an execution paused for human approval
 */

import { NextRequest, NextResponse } from "next/server";
import { globalDurableExecutionEngine } from "@/backend/engine/DurableExecutionEngine";
import { TenantGuard } from "@/backend/security/TenantGuard";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const executionId = resolvedParams.id;

    const callerRole = req.headers.get("x-user-role") || "OPERATOR";
    TenantGuard.assertPermission(callerRole, "approvals.approve_reject");

    const body = await req.json().catch(() => ({}));
    const approved =
      body.approved !== undefined
        ? Boolean(body.approved)
        : body.decision === "approve" || body.action === "approve";
    const comment = body.comment || body.reason || "";

    const result = await globalDurableExecutionEngine.resumeApproval(executionId, {
      approved,
      comment,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.statusCode || (err.name === "ForbiddenError" ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
