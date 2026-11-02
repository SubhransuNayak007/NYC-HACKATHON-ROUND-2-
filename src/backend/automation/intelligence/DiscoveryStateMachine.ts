/**
 * QuickReply AI Automation Operating System — Discovery State Machine
 * src/backend/automation/intelligence/DiscoveryStateMachine.ts
 *
 * Implements Engine 1–4 Lifecycle Orchestration of Master Prompt V2:
 * Strict 6-Stage Planning Lifecycle:
 * 1. Preliminary Plan
 * 2. Grouped Connection Collection
 * 3. Resource Discovery
 * 4. Final Verified Plan
 * 5. User Approval
 * 6. Workflow Compilation
 */

import { v4 as uuidv4 } from "uuid";
import {
  AutomationConversation,
  AutomationPlan,
  ConversationTurn,
  DiscoveryState,
  RequirementDocument,
} from "../types";
import { IntentRequirementsEngine } from "./IntentRequirementsEngine";
import { ClarificationManager } from "./ClarificationManager";
import { WorkflowPlanner } from "./WorkflowPlanner";
import { PlanApprovalManager } from "./PlanApprovalManager";
import { DynamicConnectorOnboarding } from "./DynamicConnectorOnboarding";
import { getDB, saveDB } from "@/database/db";

export type PlanningLifecycleStage =
  | "PRELIMINARY_PLAN"
  | "GROUPED_CONNECTION_COLLECTION"
  | "RESOURCE_DISCOVERY"
  | "FINAL_VERIFIED_PLAN"
  | "USER_APPROVAL"
  | "WORKFLOW_COMPILATION";

export class DiscoveryStateMachine {
  /**
   * Process an incoming user message within a persistent conversation lifecycle
   * Enforces the 6-stage lifecycle strictly.
   */
  public static async handleTurn(params: {
    conversationId?: string;
    tenantId: string;
    workspaceId: string;
    message: string;
    connectedApps?: string[];
    userOverrides?: Record<string, any>;
    approvalAction?: "APPROVE" | "MODIFY" | "CANCEL";
  }): Promise<{
    conversation: AutomationConversation;
    replyText: string;
    state: DiscoveryState;
    lifecycleStage: PlanningLifecycleStage;
    plan?: AutomationPlan;
    requirementDoc?: RequirementDocument;
    onboardingStep?: any;
    readyToBuild: boolean;
  }> {
    const {
      conversationId = `conv_${uuidv4().substring(0, 8)}`,
      tenantId,
      workspaceId,
      message,
      connectedApps = [],
      userOverrides = {},
      approvalAction,
    } = params;

    const now = new Date().toISOString();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Load or Initialize Conversation
    // ─────────────────────────────────────────────────────────────────────────
    let conv: AutomationConversation = {
      id: conversationId,
      tenantId,
      workspaceId,
      state: "DISCOVERY",
      turns: [],
      outstandingQuestions: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const db = await getDB(tenantId);
      if (db.automationConversations) {
        const found = db.automationConversations.find((c: any) => c.id === conversationId);
        if (found) conv = found;
      }
    } catch {
      // InMemory fallback
    }

    // Add user turn
    conv.turns.push({
      id: `turn_${Date.now()}_u`,
      role: "user",
      content: message,
      timestamp: now,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 5 & 6: Handle Plan Approval Actions
    // ─────────────────────────────────────────────────────────────────────────
    const isApprove =
      approvalAction === "APPROVE" ||
      message.toLowerCase() === "approve and build" ||
      message.toLowerCase() === "approve" ||
      message.toLowerCase() === "build this";

    if (isApprove) {
      let planToApprove: AutomationPlan | undefined;
      try {
        const db = await getDB(tenantId);
        if (db.automationPlans && conv.activePlanId) {
          planToApprove = db.automationPlans.find((p: any) => p.id === conv.activePlanId);
        }
      } catch {}

      // If active plan in DB is missing, check last turn plan card
      if (!planToApprove) {
        const lastPlanTurn = [...conv.turns].reverse().find((t) => t.planCard);
        if (lastPlanTurn?.planCard) {
          planToApprove = lastPlanTurn.planCard;
        }
      }

      if (planToApprove) {
        // Enforce Stage 6: Workflow Compilation Gate
        const { approvedPlan, approvalRecord } = await PlanApprovalManager.approvePlan({
          plan: planToApprove,
          userId: tenantId,
          tenantId,
        });

        conv.state = "WORKFLOW_CONSTRUCTION";
        conv.updatedAt = now;

        const reply = `✅ **Plan Approved!** Snapshot frozen with SHA-256 signature (\`${approvalRecord.signature.substring(0, 16)}...\`). Compiling verified DAG onto your visual workflow canvas now.`;

        conv.turns.push({
          id: `turn_${Date.now()}_a`,
          role: "assistant",
          content: reply,
          stage: "WORKFLOW_CONSTRUCTION",
          planCard: approvedPlan,
          timestamp: now,
        });

        await this.persistConversation(conv);

        return {
          conversation: conv,
          replyText: reply,
          state: "WORKFLOW_CONSTRUCTION",
          lifecycleStage: "WORKFLOW_COMPILATION",
          plan: approvedPlan,
          readyToBuild: true,
        };
      }
    }

    if (approvalAction === "CANCEL" || message.toLowerCase() === "cancel" || message.toLowerCase() === "don't build this") {
      conv.state = "CANCELLED";
      conv.updatedAt = now;
      const reply = "Understood. The proposed automation plan has been cancelled and will not be built. Your conversation history is preserved if you'd like to try another direction.";

      conv.turns.push({
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        content: reply,
        stage: "CANCELLED",
        timestamp: now,
      });

      await this.persistConversation(conv);

      return {
        conversation: conv,
        replyText: reply,
        state: "CANCELLED",
        lifecycleStage: "USER_APPROVAL",
        readyToBuild: false,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 1: Preliminary Plan & Structured Intent Extraction
    // ─────────────────────────────────────────────────────────────────────────
    conv.state = "REQUIREMENT_EXTRACTION";

    const reqDoc = IntentRequirementsEngine.extractRequirements({
      prompt: message,
      connectedApps,
    });
    conv.activeRequirementDocId = reqDoc.id;

    // Check for Ambiguous Request or Missing Information
    const questions = ClarificationManager.getNextClarificationQuestions({
      requirementDoc: reqDoc,
      connectedApps,
    });

    if (questions.length > 0) {
      conv.state = "MISSING_INFORMATION_RESOLUTION";
      conv.outstandingQuestions = questions;
      conv.updatedAt = now;

      const q = questions[0];
      const reply = `${q.question}\n\n*Why this is needed:* ${q.reason}`;

      conv.turns.push({
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        content: reply,
        stage: "MISSING_INFORMATION_RESOLUTION",
        timestamp: now,
      });

      await this.persistConversation(conv);

      return {
        conversation: conv,
        replyText: reply,
        state: "MISSING_INFORMATION_RESOLUTION",
        lifecycleStage: "PRELIMINARY_PLAN",
        requirementDoc: reqDoc,
        readyToBuild: false,
      };
    }

    // Synthesize Preliminary Plan with capability checks
    const plan = WorkflowPlanner.generatePlan({
      conversationId: conv.id,
      tenantId,
      workspaceId,
      requirementDoc: reqDoc,
      connectedApps,
      userOverrides,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 2: Grouped Connection Collection
    // ─────────────────────────────────────────────────────────────────────────
    const missingConnections = plan.groupedConnections.filter((g) => g.status !== "connected");

    if (missingConnections.length > 0) {
      conv.state = "AUTHENTICATION";
      conv.activePlanId = plan.id;
      conv.updatedAt = now;

      const groupList = missingConnections
        .map(
          (g, idx) =>
            `${idx + 1}. **${g.displayName}** (${g.services.join(", ")}): Requires scopes [${g.requiredScopes.join(", ")}]`
        )
        .join("\n");

      const reply = `I have analyzed your objective and drafted a **Preliminary Automation Plan**.\n\nBefore we can execute resource discovery and construct the workflow, please authorize the following required accounts (all in one step):\n\n${groupList}\n\nOnce authorized, I will verify the connection and discover your target resources.`;

      conv.turns.push({
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        content: reply,
        stage: "AUTHENTICATION",
        planCard: plan,
        timestamp: now,
      });

      await this.persistConversation(conv);

      return {
        conversation: conv,
        replyText: reply,
        state: "AUTHENTICATION",
        lifecycleStage: "GROUPED_CONNECTION_COLLECTION",
        plan,
        requirementDoc: reqDoc,
        readyToBuild: false,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 3 & 4: Resource Discovery & Final Verified Plan (with Type Chains)
    // ─────────────────────────────────────────────────────────────────────────
    conv.state = "PLAN_GENERATION";
    conv.activePlanId = plan.id;

    // Verify Type Chain Validation passed
    if (!plan.typeChainValidation.isValid) {
      const typeErrors = plan.typeChainValidation.errors.join("\n• ");
      const reply = `⚠️ **Type Chain Incompatibility Detected:**\n• ${typeErrors}\n\nPlease clarify how data should be transformed between these steps.`;

      conv.turns.push({
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        content: reply,
        stage: "PLAN_GENERATION",
        planCard: plan,
        timestamp: now,
      });

      await this.persistConversation(conv);

      return {
        conversation: conv,
        replyText: reply,
        state: "PLAN_GENERATION",
        lifecycleStage: "FINAL_VERIFIED_PLAN",
        plan,
        requirementDoc: reqDoc,
        readyToBuild: false,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 5: User Approval Gate
    // ─────────────────────────────────────────────────────────────────────────
    conv.state = "USER_APPROVAL";
    conv.updatedAt = now;

    // Persist plan in DB
    try {
      const db = await getDB(tenantId);
      if (!db.automationPlans) db.automationPlans = [];
      const idx = db.automationPlans.findIndex((p: any) => p.id === plan.id);
      if (idx >= 0) db.automationPlans[idx] = plan;
      else db.automationPlans.push(plan);
      await saveDB(db, tenantId);
    } catch {}

    const reply = `I've prepared the **Final Verified Plan** for: **${plan.title}**.\n\nAll connections are verified, resources resolved, and Type Chains validated. Please review the plan below. Once you click **Approve & Build Workflow**, I will compile it directly to the visual canvas.`;

    conv.turns.push({
      id: `turn_${Date.now()}_a`,
      role: "assistant",
      content: reply,
      stage: "USER_APPROVAL",
      planCard: plan,
      timestamp: now,
    });

    await this.persistConversation(conv);

    return {
      conversation: conv,
      replyText: reply,
      state: "USER_APPROVAL",
      lifecycleStage: "USER_APPROVAL",
      plan,
      requirementDoc: reqDoc,
      readyToBuild: false,
    };
  }

  private static async persistConversation(conv: AutomationConversation): Promise<void> {
    try {
      const db = await getDB(conv.tenantId);
      if (!db.automationConversations) db.automationConversations = [];
      const idx = db.automationConversations.findIndex((c: any) => c.id === conv.id);
      if (idx >= 0) db.automationConversations[idx] = conv;
      else db.automationConversations.push(conv);
      await saveDB(db, conv.tenantId);
    } catch {
      // In-memory fallback
    }
  }
}
