import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/approvals/decide
 * Authorize or reject a pending human-in-the-loop side effect request
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { approvalId, decision, reason } = body;

    if (!approvalId || !decision) {
      return NextResponse.json(
        { error: "Approval ID and decision are required." },
        { status: 400 }
      );
    }

    const db = await getDB(tenantId);
    if (!db.approvalRequests) db.approvalRequests = [];

    const reqIdx = db.approvalRequests.findIndex(
      (a: any) => a.id === approvalId && a.tenantId === tenantId
    );

    if (reqIdx === -1) {
      return NextResponse.json(
        { error: "Approval request not found." },
        { status: 404 }
      );
    }

    const item = db.approvalRequests[reqIdx];
    item.status = decision === "APPROVED" ? "APPROVED" : "REJECTED";
    item.decidedBy = session.email;
    item.decidedAt = new Date().toISOString();
    item.decisionReason = reason || "";

    db.approvalRequests[reqIdx] = item;
    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: item.workspaceId || `ws_${tenantId}`,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "approval.decision",
      resourceType: "approval",
      resourceId: approvalId,
      description: `Human Review: ${decision} for action "${item.actionType}". Reason: ${reason || "None specified"}`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      approvalRequest: item,
      resumedStatus: decision === "APPROVED" ? "RESUMING" : "ABORTED",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit decision." },
      { status: 500 }
    );
  }
}
