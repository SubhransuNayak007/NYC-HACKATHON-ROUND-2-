/**
 * ============================================================================
 * QuickReply — Automation Simulator & Explainability Debugger
 * src/backend/rules/RuleSimulator.ts
 *
 * Allows users to test automation rules with real or synthetic comment inputs
 * in Dry-Run mode without sending live external API calls.
 * Exposes the full decision trace ("WHY DID THIS RUN?").
 * ============================================================================
 */

import { NormalizedEvent, EventNormalizer } from "@/backend/events/EventNormalizer";
import { ContextBuilder } from "./ContextBuilder";
import { MatchingEngine } from "./MatchingEngine";
import { PriorityEngine } from "./PriorityEngine";
import { AutomationRule, MatchDecision } from "./types";
import { getDB } from "@/database/db";

export interface SimulationInput {
  tenantId: string;
  commentText: string;
  authorName?: string;
  platform?: "youtube" | "instagram" | "whatsapp" | "telegram";
  videoId?: string;
  videoTitle?: string;
  customerTags?: string[];
  leadScore?: number;
}

export interface SimulationResult {
  hasMatch: boolean;
  winnerRule?: {
    id: string;
    name: string;
    priority: number;
    mode: string;
  };
  decisionTrace: string[];
  intentDetected?: string;
  intentConfidence?: number;
  ragMatch?: {
    question: string;
    answer: string;
    confidence: number;
  };
  policyOutcome: "PASS" | "REQUIRE_APPROVAL" | "BLOCKED";
  simulatedAction?: {
    actionType: string;
    replyText?: string;
    dynamicTags?: string[];
  };
  conflictsDetected?: string[];
  totalLatencyMs: number;
}

export class RuleSimulator {
  /**
   * Run Dry-Run Simulation against current tenant rules
   */
  static async simulate(input: SimulationInput): Promise<SimulationResult> {
    const startTime = Date.now();
    const tenantId = input.tenantId;

    // 1. Create Normalized Test Event
    const testEvent: NormalizedEvent = {
      id: `sim_${Date.now()}`,
      tenantId,
      workspaceId: `ws_${tenantId}`,
      platform: input.platform || "youtube",
      eventType: "comment.created",
      actor: {
        id: `user_sim_${Date.now()}`,
        name: input.authorName || "Alex Morgan",
        username: (input.authorName || "alex").toLowerCase().replace(/\s+/g, ""),
      },
      target: {
        videoId: input.videoId || "vid_sim_101",
      },
      content: input.commentText,
      rawPayload: {
        videoTitle: input.videoTitle || "Product Launch Showcase",
        tags: ["launch", "demo", input.platform || "youtube"],
      },
      timestamp: new Date().toISOString(),
      idempotencyKey: `sim_key_${Date.now()}`,
    };

    // 2. Build Assembled Context
    const ctx = await ContextBuilder.buildContext(testEvent);
    if (input.customerTags && ctx.customer) {
      ctx.customer.tags = [...ctx.customer.tags, ...input.customerTags];
    }
    if (input.leadScore !== undefined && ctx.customer) {
      ctx.customer.leadScore = input.leadScore;
    }

    // 3. Fetch Tenant Published Rules
    const db = await getDB(tenantId);
    const rules: AutomationRule[] = (db.automationRules || []).filter(
      (r: AutomationRule) => r.status === "PUBLISHED"
    );

    if (rules.length === 0) {
      return {
        hasMatch: false,
        decisionTrace: [
          "1. Received inbound test event",
          "2. Assembled customer and content context",
          "3. No published automation rules found in workspace.",
        ],
        policyOutcome: "PASS",
        totalLatencyMs: Date.now() - startTime,
      };
    }

    // 4. Evaluate Matching Engine across all rules
    const matchDecisions: MatchDecision[] = [];
    const rulesMap = new Map<string, AutomationRule>();

    for (const rule of rules) {
      rulesMap.set(rule.id, rule);
      const decision = await MatchingEngine.evaluateRule(rule, ctx);
      if (decision.matched) {
        matchDecisions.push(decision);
      }
    }

    if (matchDecisions.length === 0) {
      return {
        hasMatch: false,
        decisionTrace: [
          `✓ Evaluated ${rules.length} published rules`,
          "✗ No rules matched the given scope, tags, or intent.",
        ],
        policyOutcome: "PASS",
        totalLatencyMs: Date.now() - startTime,
      };
    }

    // 5. Resolve Rule Priorities & Conflicts
    const resolution = PriorityEngine.resolve(matchDecisions, rulesMap);
    if (!resolution) {
      return {
        hasMatch: false,
        decisionTrace: ["Evaluated rules but priority resolution returned no winner."],
        policyOutcome: "PASS",
        totalLatencyMs: Date.now() - startTime,
      };
    }

    const winner = resolution.winner;
    const decisionTrace: string[] = [
      `1. Evaluated ${rules.length} published rules — ${matchDecisions.length} candidate(s) matched`,
      ...winner.matchReasons.map((r, i) => `2.${i + 1} ${r}`),
      `3. Selected Winner: "${winner.ruleName}" (Priority: ${winner.rulePriority}, Mode: ${winner.executionModeUsed})`,
    ];

    const conflicts = resolution.conflictsDetected.map((c) => `${c.ruleA} vs ${c.ruleB}: ${c.reason} (${c.resolution})`);

    return {
      hasMatch: true,
      winnerRule: {
        id: winner.ruleId,
        name: winner.ruleName,
        priority: winner.rulePriority,
        mode: winner.executionModeUsed,
      },
      decisionTrace,
      intentDetected: winner.intentDetected,
      intentConfidence: winner.intentConfidence,
      ragMatch: winner.ragMatches && winner.ragMatches[0] ? {
        question: winner.ragMatches[0].question,
        answer: winner.ragMatches[0].answer,
        confidence: winner.ragMatches[0].confidence,
      } : undefined,
      policyOutcome: winner.requiresHumanApproval ? "REQUIRE_APPROVAL" : "PASS",
      simulatedAction: winner.actionPayload ? {
        actionType: winner.actionPayload.actionType,
        replyText: winner.actionPayload.replyText,
        dynamicTags: winner.actionPayload.dynamicTags,
      } : undefined,
      conflictsDetected: conflicts.length > 0 ? conflicts : undefined,
      totalLatencyMs: Date.now() - startTime,
    };
  }
}
