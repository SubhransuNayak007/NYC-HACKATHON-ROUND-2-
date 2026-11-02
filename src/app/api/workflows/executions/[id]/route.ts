/**
 * GET /api/workflows/executions/[id] — Retrieve execution status & checkpoint inspection
 */

import { NextRequest, NextResponse } from "next/server";
import { globalCheckpointManager } from "@/backend/engine/CheckpointManager";
import { TenantGuard } from "@/backend/security/TenantGuard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const executionId = resolvedParams.id;

    const callerRole = req.headers.get("x-user-role") || "VIEWER";
    TenantGuard.assertPermission(callerRole, "executions.view_logs");

    const checkpoint = await globalCheckpointManager.getCheckpoint(executionId);
    if (!checkpoint) {
      return NextResponse.json(
        { error: `Execution checkpoint '${executionId}' not found` },
        { status: 404 }
      );
    }

    const callerTenantId = req.headers.get("x-tenant-id");
    if (callerTenantId && checkpoint.tenantId) {
      TenantGuard.assertTenantOwnership(checkpoint.tenantId, callerTenantId, "execution", executionId);
    }

    return NextResponse.json(checkpoint);
  } catch (err: any) {
    const status = err.statusCode || (err.name === "ForbiddenError" ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
