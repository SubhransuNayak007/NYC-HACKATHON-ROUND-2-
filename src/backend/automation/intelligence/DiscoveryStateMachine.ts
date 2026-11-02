/**
 * QuickReply AI Automation Operating System — Discovery State Machine
 * src/backend/automation/intelligence/DiscoveryStateMachine.ts
 *
 * Implements Engine 1–4 Lifecycle Orchestration of Master Prompt V2:
 * Strict state transitions from initial unstructured user prompt through
 * requirement extraction, connector investigation, plan synthesis, user approval,
 * workflow construction, and production activation.
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

export class DiscoveryStateMachine {
  /**
   * Process an incoming user message within a persistent conversation lifecycle
   */
  static async handleTurn(params: {
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
        const found = db.automationConversations.find((c) => c.id === conversationId);
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
    // 2. Handle Plan Approval Actions
    // ─────────────────────────────────────────────────────────────────────────
    if (approvalAction === "APPROVE" || message.toLowerCase() === "approve and build" || message.toLowerCase() === "approve") {
      let planToApprove: AutomationPlan | undefined;
      try {
        const db = await getDB(tenantId);
        if (db.automationPlans && conv.activePlanId) {
          planToApprove = db.automationPlans.find((p) => p.id === conv.activePlanId);
        }
      } catch {}

      if (planToApprove) {
        const { approvedPlan } = await PlanApprovalManager.approvePlan({
          plan: planToApprove,
          userId: tenantId,
          tenantId,
        });

        conv.state = "WORKFLOW_CONSTRUCTION";
        conv.updatedAt = now;

        const reply = `Plan approved! Freezing blueprint snapshot (v${approvedPlan.version}) with cryptographic verification. Building your workflow on the canvas now.`;

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
          plan: approvedPlan,
          readyToBuild: true,
        };
      }
    }

    if (approvalAction === "CANCEL" || message.toLowerCase() === "don't build this" || message.toLowerCase() === "cancel") {
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
        readyToBuild: false,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Extraction & Clarification
    // ─────────────────────────────────────────────────────────────────────────
    conv.state = "REQUIREMENT_EXTRACTION";

    const reqDoc = IntentRequirementsEngine.extractRequirements({
      prompt: message,
      connectedApps,
    });
    conv.activeRequirementDocId = reqDoc.id;

    // Check for Ambiguous Request or Missing Requirements
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
        requirementDoc: reqDoc,
        readyToBuild: false,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Connector Onboarding Check
    // ─────────────────────────────────────────────────────────────────────────
    for (const act of reqDoc.actions) {
      if (!connectedApps.includes(act.service)) {
        const onboarding = DynamicConnectorOnboarding.getOnboardingPlan(act.service);
        if (onboarding) {
          conv.state = "AUTHENTICATION";
          conv.updatedAt = now;

          const reply = `I have understood your objective to automate ${act.service.toUpperCase()}. Before we build the workflow, we need to connect your ${onboarding.title}.\n\n${onboarding.description}`;

          conv.turns.push({
            id: `turn_${Date.now()}_a`,
            role: "assistant",
            content: reply,
            stage: "AUTHENTICATION",
            onboardingCard: onboarding,
            timestamp: now,
          });

          await this.persistConversation(conv);

          return {
            conversation: conv,
            replyText: reply,
            state: "AUTHENTICATION",
            onboardingStep: onboarding,
            requirementDoc: reqDoc,
            readyToBuild: false,
          };
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Plan Generation & Approval Gate
    // ─────────────────────────────────────────────────────────────────────────
    conv.state = "PLAN_GENERATION";

    const plan = WorkflowPlanner.generatePlan({
      conversationId: conv.id,
      tenantId,
      workspaceId,
      requirementDoc: reqDoc,
      connectedApps,
      userOverrides,
    });

    conv.activePlanId = plan.id;
    conv.state = "USER_APPROVAL";
    conv.updatedAt = now;

    // Persist plan in DB
    try {
      const db = await getDB(tenantId);
      if (!db.automationPlans) db.automationPlans = [];
      const idx = db.automationPlans.findIndex((p) => p.id === plan.id);
      if (idx >= 0) db.automationPlans[idx] = plan;
      else db.automationPlans.push(plan);
      await saveDB(db, tenantId);
    } catch {}

    const reply = `I've prepared a complete implementation plan for: **${plan.title}**.\n\nPlease review the execution steps, verified connections, and data mapping in the plan below. Once you approve, I will construct the workflow on the visual canvas.`;

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
      plan,
      requirementDoc: reqDoc,
      readyToBuild: false,
    };
  }

  private static async persistConversation(conv: AutomationConversation): Promise<void> {
    try {
      const db = await getDB(conv.tenantId);
      if (!db.automationConversations) db.automationConversations = [];
      const idx = db.automationConversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) db.automationConversations[idx] = conv;
      else db.automationConversations.push(conv);
      await saveDB(db, conv.tenantId);
    } catch {
      // In-memory fallback
    }
  }
}
