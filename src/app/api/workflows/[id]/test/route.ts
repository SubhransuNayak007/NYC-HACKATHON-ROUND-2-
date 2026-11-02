import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB } from "@/database/db";
import { ExecutionProviderFactory } from "@/backend/automation/runtime/ExecutionProviderFactory";
import { WorkflowSpec } from "@/backend/automation/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/test
 * Run sandboxed dry-run verification against synthetic test cases
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);

    const body = await req.json().catch(() => ({}));
    const testInput = body.testInput || {
      vendor: "Acme Industrial Supplies",
      invoiceNumber: "INV-2026-9041",
      amount: 24500,
      dueDate: "2026-11-15",
    };

    // Find spec in database
    const spec: WorkflowSpec | undefined = (db.workflowSpecs || []).find(
      (w: any) => (w.id === id || w.conversationId === id) && w.tenantId === tenantId
    );

    if (!spec) {
      return NextResponse.json(
        { error: "Workflow specification not found." },
        { status: 404 }
      );
    }

    // Execute dry-run through execution provider
    const provider = ExecutionProviderFactory.getProvider(spec.runtimeTarget || "n8n");
    const testResult = await provider.executeDryRun(spec, testInput);

    return NextResponse.json({
      success: true,
      workflowId: spec.id,
      runtimeTarget: spec.runtimeTarget,
      testResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Test verification failed." },
      { status: 500 }
    );
  }
}
