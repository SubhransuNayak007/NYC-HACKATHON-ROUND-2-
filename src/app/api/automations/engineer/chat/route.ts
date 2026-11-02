import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { DiscoveryStateMachine } from "@/backend/automation/intelligence/DiscoveryStateMachine";
import { WorkflowCompiler } from "@/backend/automation/compiler/WorkflowCompiler";
import { getDB } from "@/database/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId,
      message,
      userOverrides,
      approvalAction,
      connectedApps: clientConnectedApps,
    } = body;

    if (!message && !approvalAction) {
      return NextResponse.json(
        { error: "Message or approvalAction is required." },
        { status: 400 }
      );
    }

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";
    const workspaceId = `ws_${tenantId}`;

    // Inspect connected apps from db or request
    let connectedApps: string[] = clientConnectedApps || [];
    try {
      const db = await getDB(tenantId);
      if (db.channels) {
        for (const ch of db.channels) {
          const plat = (ch as any).platform;
          if (plat === "whatsapp") connectedApps.push("whatsapp");
          if (plat === "telegram") connectedApps.push("telegram");
        }
      }
      if (db.socialAccounts) {
        for (const sa of db.socialAccounts) {
          const plat = (sa as any).platform;
          if (plat === "google") {
            connectedApps.push("gmail");
            connectedApps.push("google_sheets");
          }
        }
      }
    } catch {}

    connectedApps = Array.from(new Set(connectedApps));

    const result = await DiscoveryStateMachine.handleTurn({
      conversationId,
      tenantId,
      workspaceId,
      message: message || (approvalAction === "APPROVE" ? "Approve and build" : "Cancel"),
      connectedApps,
      userOverrides,
      approvalAction,
    });

    let canvasWorkflow: any = undefined;
    if (result.readyToBuild && result.plan) {
      const compiled = WorkflowCompiler.compileFromPlan(result.plan);
      canvasWorkflow = compiled.canvasWorkflow;
    }

    return NextResponse.json({
      success: true,
      conversationId: result.conversation.id,
      state: result.state,
      replyText: result.replyText,
      plan: result.plan,
      requirementDoc: result.requirementDoc,
      onboardingStep: result.onboardingStep,
      readyToBuild: result.readyToBuild,
      canvasWorkflow,
      turns: result.conversation.turns,
    });
  } catch (error: any) {
    console.error("[Engineer Chat API] Uncaught error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process automation engineer turn." },
      { status: 500 }
    );
  }
}
