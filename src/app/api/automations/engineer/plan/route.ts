import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { PlanApprovalManager } from "@/backend/automation/intelligence/PlanApprovalManager";
import { WorkflowCompiler } from "@/backend/automation/compiler/WorkflowCompiler";
import { getDB, saveDB } from "@/database/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, planId, modifications } = body;

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    const plan = db.automationPlans?.find((p) => p.id === planId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    if (action === "APPROVE") {
      const { approvedPlan, approvalRecord } = await PlanApprovalManager.approvePlan({
        plan,
        userId: session?.email || "anonymous_user",
        tenantId,
      });

      // Compile into canvas workflow
      const compiled = WorkflowCompiler.compileFromPlan(approvedPlan);

      if (!db.workflowSpecs) db.workflowSpecs = [];
      db.workflowSpecs.push(compiled.spec);
      await saveDB(db, tenantId);

      return NextResponse.json({
        success: true,
        action: "APPROVED",
        plan: approvedPlan,
        approvalRecord,
        canvasWorkflow: compiled.canvasWorkflow,
        spec: compiled.spec,
      });
    }

    if (action === "MODIFY") {
      const updatedPlan = PlanApprovalManager.modifyPlan({
        existingPlan: plan,
        modifications: modifications || {},
      });

      const idx = db.automationPlans!.findIndex((p) => p.id === planId);
      if (idx >= 0) db.automationPlans![idx] = updatedPlan;
      await saveDB(db, tenantId);

      return NextResponse.json({
        success: true,
        action: "MODIFIED",
        plan: updatedPlan,
      });
    }

    if (action === "CANCEL") {
      const idx = db.automationPlans!.findIndex((p) => p.id === planId);
      if (idx >= 0) {
        db.automationPlans![idx].isApproved = false;
        await saveDB(db, tenantId);
      }

      return NextResponse.json({
        success: true,
        action: "CANCELLED",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
