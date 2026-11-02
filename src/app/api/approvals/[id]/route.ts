import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { ApprovalService } from "@/backend/approval/ApprovalService";

export const dynamic = "force-dynamic";

/**
 * POST /api/approvals/[id]
 * Approves or Rejects a pending human-review request
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { action, rejectionReason, modifiedAction } = body;

    if (action === "approve") {
      const result = await ApprovalService.approve({
        requestId: id,
        tenantId,
        actorEmail: session.email,
        actorRole: "ADMIN",
        modifiedAction,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Action approved and resumed.",
        request: result.request,
      });
    }

    if (action === "reject") {
      const result = await ApprovalService.reject({
        requestId: id,
        tenantId,
        actorEmail: session.email,
        actorRole: "ADMIN",
        rejectionReason: rejectionReason || "Rejected by reviewer",
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Action rejected and execution cancelled.",
        request: result.request,
      });
    }

    return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process approval" }, { status: 500 });
  }
}
