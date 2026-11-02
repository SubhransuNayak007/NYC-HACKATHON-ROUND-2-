import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { ApprovalService } from "@/backend/approval/ApprovalService";

export const dynamic = "force-dynamic";

/**
 * GET /api/approvals
 * Returns pending human-review approval requests
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const pending = await ApprovalService.listPending(tenantId);

    return NextResponse.json({
      success: true,
      approvals: pending,
      totalPending: pending.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load approvals" }, { status: 500 });
  }
}
