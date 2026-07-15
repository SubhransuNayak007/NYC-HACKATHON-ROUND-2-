import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, ApprovalWorkflow } from "@/database/db";

/**
 * GET /api/team/approvals - List all approval workflows
 * POST /api/team/approvals - Create a draft for approval
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.approvalWorkflows || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, draftReply, createdBy, assignedApprover } = body;

    if (!commentId || !draftReply) {
      return NextResponse.json({ error: "commentId and draftReply are required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.approvalWorkflows) db.approvalWorkflows = [];

    const workflow: ApprovalWorkflow = {
      id: `aw-${Date.now()}`,
      commentId,
      draftReply,
      draftedBy: createdBy || db.userSession?.name || "Creator",
      status: "draft" as const,
      createdBy: createdBy || db.userSession?.name || "Creator",
      assignedApprover: assignedApprover || "",
      history: [
        {
          action: "draft_created",
          by: createdBy || db.userSession?.name || "Creator",
          at: new Date().toISOString(),
          note: "Draft created for review",
        },
      ],
      createdAt: new Date().toISOString(),
    };

    db.approvalWorkflows.push(workflow);
    await saveDB(db);

    return NextResponse.json(workflow, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create approval" }, { status: 500 });
  }
}
