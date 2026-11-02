import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB } from "@/database/db";
import { TraceService } from "@/backend/observability/TraceService";

export const dynamic = "force-dynamic";

/**
 * GET /api/executions
 * Returns real workflow execution traces and aggregate observability metrics
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const executions = db.workflowExecutions || [];

    const metrics = await TraceService.computeMetrics(tenantId);

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");

    let filtered = executions;
    if (status) {
      filtered = filtered.filter((e: any) => e.status === status);
    }
    if (workflowId) {
      filtered = filtered.filter((e: any) => e.workflowId === workflowId);
    }

    return NextResponse.json({
      success: true,
      metrics,
      executions: filtered.slice(0, 100),
      total: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load executions" }, { status: 500 });
  }
}
