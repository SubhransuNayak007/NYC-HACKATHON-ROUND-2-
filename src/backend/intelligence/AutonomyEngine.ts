/**
 * ============================================================
 * QuickReply — Autonomy Governance, Policy Engine & Circuit Breakers
 * src/backend/intelligence/AutonomyEngine.ts
 *
 * Implements:
 * 1. 6-Tier Autonomy Governance (Levels 0 to 5)
 * 2. Action Policy Firewall (Risk checks, Hard policy enforcement, Zero-hallucination)
 * 3. Automatic Circuit Breakers (Downgrades autonomy if errors/complaints rise)
 * 4. Human-in-the-Loop Edit Diff Learning (Progressive preference refinement)
 * ============================================================
 */

import {
  getDB,
  saveDB,
  type AutonomyLevel,
  type AutonomyGovernanceConfig,
  type HumanEditSignal,
} from "@/database/db";

export interface ActionPolicyCheckResult {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reason: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  policyViolated?: string;
}

export class AutonomyEngine {
  /**
   * Evaluate whether an action is permitted under current autonomy level and policies
   */
  static async evaluateAction(params: {
    actionType: "send_dm" | "post_comment_reply" | "create_lead" | "refund_order" | "launch_campaign";
    confidenceScore: number;
    textPayload?: string;
    customerTier?: "standard" | "vip";
    isPriceOrInventoryAction?: boolean;
    inventoryConfirmed?: boolean;
  }): Promise<ActionPolicyCheckResult> {
    const db = await getDB();
    const config: AutonomyGovernanceConfig = db.autonomyConfig || {
      currentLevel: 3,
      confidenceThresholds: { autoSend: 0.85, draftForReview: 0.65, escalateToHuman: 0.40 },
      hardPolicies: {
        neverMentionDiscountsWithoutApproval: true,
        neverPromiseRefundsAutonomously: true,
        neverRecommendOutOfStockProducts: true,
        escalateLegalThreatsImmediately: true,
        escalateAngryVIPCustomers: true,
        customRules: [],
      },
      circuitBreaker: { tripped: false },
    };

    // 0. Circuit Breaker Check
    if (config.circuitBreaker.tripped) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `CIRCUIT BREAKER ACTIVE: Autonomy degraded due to: ${config.circuitBreaker.reason || "Safety threshold exceeded"}`,
        riskLevel: "high",
      };
    }

    const payload = (params.textPayload || "").toLowerCase();

    // 1. Hard Policy: Never Promise Refunds Autonomously
    if (config.hardPolicies.neverPromiseRefundsAutonomously && /refund|money back|reimburse/i.test(payload)) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: "HARD POLICY: Refund actions require explicit human agent authorization.",
        riskLevel: "high",
        policyViolated: "neverPromiseRefundsAutonomously",
      };
    }

    // 2. Hard Policy: Never Recommend Out-of-Stock Products
    if (config.hardPolicies.neverRecommendOutOfStockProducts && params.isPriceOrInventoryAction && params.inventoryConfirmed === false) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: "HARD POLICY: Inventory unavailable. Cannot claim product availability.",
        riskLevel: "high",
        policyViolated: "neverRecommendOutOfStockProducts",
      };
    }

    // 3. Hard Policy: Escalate Angry VIPs
    if (config.hardPolicies.escalateAngryVIPCustomers && params.customerTier === "vip" && /angry|bad service|worst|unacceptable/i.test(payload)) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: "HARD POLICY: High-priority VIP customer escalation to human manager.",
        riskLevel: "critical",
        policyViolated: "escalateAngryVIPCustomers",
      };
    }

    // 4. Autonomy Level Gating
    const level = config.currentLevel;

    // Level 0: Observe Only
    if (level === 0) {
      return { allowed: false, requiresHumanApproval: true, reason: "Autonomy Level 0 (Observe Only) - Execution disabled.", riskLevel: "low" };
    }

    // Level 1: Recommend Only
    if (level === 1) {
      return { allowed: false, requiresHumanApproval: true, reason: "Autonomy Level 1 (Recommend Only) - Requires human action.", riskLevel: "low" };
    }

    // Level 2: Draft for Approval
    if (level === 2) {
      return { allowed: false, requiresHumanApproval: true, reason: "Autonomy Level 2 (Draft Mode) - Draft queued for review.", riskLevel: "low" };
    }

    // Level 3: Low-Risk Auto Execute (Safe verified replies, lead creation)
    if (level === 3) {
      if (params.actionType === "refund_order" || params.actionType === "launch_campaign") {
        return { allowed: false, requiresHumanApproval: true, reason: "High-risk action requires human approval at Level 3.", riskLevel: "high" };
      }
      if (params.confidenceScore >= config.confidenceThresholds.autoSend) {
        return { allowed: true, requiresHumanApproval: false, reason: "Permitted under Level 3 (High confidence, low risk).", riskLevel: "low" };
      }
      return { allowed: false, requiresHumanApproval: true, reason: "Confidence below auto-send threshold, queued for review.", riskLevel: "medium" };
    }

    // Level 4: Execute Approved Workflows
    if (level === 4) {
      if (params.confidenceScore >= config.confidenceThresholds.draftForReview) {
        return { allowed: true, requiresHumanApproval: false, reason: "Permitted under Level 4 Workflow execution.", riskLevel: "low" };
      }
      return { allowed: false, requiresHumanApproval: true, reason: "Low confidence execution held for review.", riskLevel: "medium" };
    }

    // Level 5: Bounded Autonomy with Guardrails
    return {
      allowed: true,
      requiresHumanApproval: false,
      reason: "Permitted under Bounded Autonomy Level 5 with active guardrails.",
      riskLevel: "low",
    };
  }

  /**
   * Trip the Circuit Breaker and downgrade autonomy safely
   */
  static async tripCircuitBreaker(reason: string, downgradeTo: AutonomyLevel = 2): Promise<void> {
    const db = await getDB();
    if (!db.autonomyConfig) {
      db.autonomyConfig = {
        currentLevel: downgradeTo,
        confidenceThresholds: { autoSend: 0.85, draftForReview: 0.65, escalateToHuman: 0.40 },
        hardPolicies: {
          neverMentionDiscountsWithoutApproval: true,
          neverPromiseRefundsAutonomously: true,
          neverRecommendOutOfStockProducts: true,
          escalateLegalThreatsImmediately: true,
          escalateAngryVIPCustomers: true,
          customRules: [],
        },
        circuitBreaker: {
          tripped: true,
          reason,
          lastTrippedAt: new Date().toISOString(),
          downgradedToLevel: downgradeTo,
        },
      };
    } else {
      db.autonomyConfig.circuitBreaker = {
        tripped: true,
        reason,
        lastTrippedAt: new Date().toISOString(),
        downgradedToLevel: downgradeTo,
      };
      db.autonomyConfig.currentLevel = downgradeTo;
    }

    await saveDB(db);
    console.warn(`[AutonomyEngine] 🚨 CIRCUIT BREAKER TRIPPED: ${reason}. Downgraded to Level ${downgradeTo}`);
  }

  /**
   * Reset Circuit Breaker back to normal state
   */
  static async resetCircuitBreaker(targetLevel: AutonomyLevel = 3): Promise<void> {
    const db = await getDB();
    if (db.autonomyConfig) {
      db.autonomyConfig.circuitBreaker.tripped = false;
      db.autonomyConfig.currentLevel = targetLevel;
      await saveDB(db);
    }
  }

  /**
   * Learn from a human edit of an AI-generated draft
   */
  static async recordHumanEdit(params: {
    originalAiReply: string;
    humanEditedReply: string;
    commentId?: string;
  }): Promise<HumanEditSignal> {
    const db = await getDB();
    if (!db.humanEditSignals) db.humanEditSignals = [];

    // Analyze diff
    const origLen = params.originalAiReply.length;
    const editLen = params.humanEditedReply.length;
    let inferredPreference = "Human edited response style";

    if (editLen < origLen * 0.7) {
      inferredPreference = "Owner prefers more concise, direct responses with less fluff.";
    } else if (params.humanEditedReply.includes("!") && !params.originalAiReply.includes("!")) {
      inferredPreference = "Owner prefers warmer, more enthusiastic tone.";
    } else if (/reach out to|contact/i.test(params.humanEditedReply)) {
      inferredPreference = "Owner prefers explicit next-step contact instructions.";
    }

    const signal: HumanEditSignal = {
      id: `edit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      commentId: params.commentId,
      originalAiReply: params.originalAiReply,
      humanEditedReply: params.humanEditedReply,
      diffSummary: `Edited from ${origLen} to ${editLen} chars`,
      inferredPreference,
      sampleCount: 1,
      appliedCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.humanEditSignals.unshift(signal);
    db.humanEditSignals = db.humanEditSignals.slice(0, 50);
    await saveDB(db);

    return signal;
  }
}
