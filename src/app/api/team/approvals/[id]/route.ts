import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

/**
 * GET/PUT/DELETE /api/team/approvals/[id]
 * PUT with { status: "approved" | "rejected" | "sent" } to advance the workflow
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  const wf = (db.approvalWorkflows || []).find((w) => w.id === id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wf);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.approvalWorkflows) db.approvalWorkflows = [];

    const idx = db.approvalWorkflows.findIndex((w) => w.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const wf = db.approvalWorkflows[idx];
    const approver = body.approvedBy || db.userSession?.name || "Creator";
    const note = body.note || "";

    if (body.status) {
      wf.status = body.status;
      const actionMap: Record<string, string> = {
        pending_review: "submitted_for_review",
        approved: "approved",
        rejected: "rejected",
        sent: "reply_sent",
      };
      if (!wf.history) wf.history = [];
      wf.history.push({
        action: actionMap[body.status] || body.status,
        by: approver,
        at: new Date().toISOString(),
        note,
      });
    }
    if (body.draftReply) wf.draftReply = body.draftReply;
    if (body.assignedApprover) wf.assignedApprover = body.assignedApprover;

    db.approvalWorkflows[idx] = wf;
    await saveDB(db);
    await logActivity(approver, `${body.status || 'updated'} approval for comment`);

    return NextResponse.json(wf);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  if (!db.approvalWorkflows) db.approvalWorkflows = [];

  db.approvalWorkflows = db.approvalWorkflows.filter((w) => w.id !== id);
  await saveDB(db);
  return NextResponse.json({ success: true });
}
