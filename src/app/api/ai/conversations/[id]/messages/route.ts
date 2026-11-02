import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { AutomationPlannerAgent } from "@/backend/automation/agent/AutomationPlannerAgent";
import { WorkflowCompiler } from "@/backend/automation/compiler/WorkflowCompiler";
import { WorkflowSpec } from "@/backend/automation/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/conversations/[id]/messages
 * Retrieve full persistent message history for this conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);

    const messages = (db.aiMessages || []).filter(
      (m: any) => m.conversationId === id && m.tenantId === tenantId
    );

    return NextResponse.json({
      success: true,
      messages: messages.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations/[id]/messages
 * Process user prompt through AutomationPlannerAgent, extract requirements,
 * compile WorkflowSpec v2.0, generate DAG graph preview, and persist state.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const body = await req.json();
    const content = (body.content || "").trim();
    const clarificationAnswers = body.clarificationAnswers || {};

    if (!content) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const db = await getDB(tenantId);
    if (!db.aiMessages) db.aiMessages = [];
    if (!db.aiConversations) db.aiConversations = [];
    if (!db.workflowSpecs) db.workflowSpecs = [];

    const convIndex = db.aiConversations.findIndex(
      (c: any) => c.id === id && c.tenantId === tenantId
    );
    if (convIndex === -1) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // 1. Record User Message
    const userMsg = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      conversationId: id,
      tenantId,
      role: "user",
      content,
      createdAt: now,
    };
    db.aiMessages.push(userMsg);

    // 2. Run Planner Agent
    const intent = AutomationPlannerAgent.analyzeIntent(content);
    const existingSpec: WorkflowSpec | undefined = db.workflowSpecs.find(
      (w: any) => w.conversationId === id && w.tenantId === tenantId
    );

    const { spec, explanation } = AutomationPlannerAgent.synthesizeWorkflowSpec({
      tenantId,
      workspaceId: `ws_${tenantId}`,
      prompt: content,
      clarificationAnswers,
      existingSpec,
    });

    (spec as any).conversationId = id;

    // Validate graph integrity
    const validation = WorkflowCompiler.validate(spec);

    // Prepare Visual DAG Nodes and Edges for Frontend UI
    let currentX = 100;
    const currentY = 150;

    const dagNodes = [
      {
        id: "trigger",
        type: "triggerNode",
        position: { x: currentX, y: currentY },
        data: {
          label: spec.trigger.type === "schedule" ? "Morning 9:00 AM Cron" : "Inbound Event Trigger",
          appId: spec.trigger.appId,
          type: spec.trigger.type,
          config: spec.trigger.config,
        },
      },
      ...spec.steps.map((step, idx) => {
        currentX += 260;
        return {
          id: step.id,
          type: "actionNode",
          position: { x: currentX, y: currentY },
          data: {
            label: step.label,
            appId: step.appId,
            actionId: step.actionId,
            sideEffect: step.sideEffect,
            approvalRequired: step.approvalRequired,
            approvalCondition: step.approvalCondition,
            parameters: step.parameters,
          },
        };
      }),
    ];

    const dagEdges = spec.steps.map((step, idx) => {
      const sourceId = idx === 0 ? "trigger" : spec.steps[idx - 1].id;
      return {
        id: `e_${sourceId}_${step.id}`,
        source: sourceId,
        target: step.id,
        label: step.approvalCondition || "",
        animated: true,
      };
    });

    // 3. Upsert WorkflowSpec in DB
    const existingSpecIdx = db.workflowSpecs.findIndex(
      (w: any) => (w.id === spec.id || w.conversationId === id) && w.tenantId === tenantId
    );
    if (existingSpecIdx >= 0) {
      db.workflowSpecs[existingSpecIdx] = spec;
    } else {
      db.workflowSpecs.unshift(spec);
    }

    // 4. Record Assistant Message
    const assistantMsg = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      conversationId: id,
      tenantId,
      role: "assistant",
      content: explanation,
      workflowSpec: spec,
      clarifications: intent.missingRequirements,
      validation,
      dagNodes,
      dagEdges,
      syntheticTests: spec.syntheticTests,
      createdAt: new Date().toISOString(),
    };
    db.aiMessages.push(assistantMsg);

    // Update conversation metadata
    db.aiConversations[convIndex].updatedAt = now;
    db.aiConversations[convIndex].lastMessageAt = now;
    if (db.aiConversations[convIndex].title === "New Automation Conversation") {
      db.aiConversations[convIndex].title = spec.name;
    }

    await saveDB(db, tenantId);

    const compiledN8n = WorkflowCompiler.compileToN8n(spec);

    return NextResponse.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      workflowSpec: spec,
      n8nJson: compiledN8n,
      dagPreview: { nodes: dagNodes, edges: dagEdges },
      validation,
      clarifications: intent.missingRequirements,
      syntheticTests: spec.syntheticTests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process message" },
      { status: 500 }
    );
  }
}
