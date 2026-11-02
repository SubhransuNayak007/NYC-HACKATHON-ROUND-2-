/**
 * ============================================================================
 * QuickReply — High-Performance Matching Engine (TAG, RAG & HYBRID Modes)
 * src/backend/rules/MatchingEngine.ts
 *
 * Implements deterministic TAG matching, semantic RAG matching, and cost-saving
 * HYBRID mode with explainable decision recording.
 * ============================================================================
 */

import { AutomationRule, AssembledContext, MatchDecision } from "./types";
import { ScopeMatcher } from "./ScopeMatcher";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
import { IntentLibrary } from "./IntentLibrary";

export class MatchingEngine {
  /**
   * Evaluate a single AutomationRule against AssembledContext
   */
  static async evaluateRule(rule: AutomationRule, ctx: AssembledContext): Promise<MatchDecision> {
    const startTime = Date.now();
    const matchReasons: string[] = [];

    // 1. Evaluate Scope
    const scopeRes = ScopeMatcher.isEventInScope(rule.scope, ctx);
    if (!scopeRes.inScope) {
      return {
        matched: false,
        ruleId: rule.id,
        ruleName: rule.name,
        rulePriority: rule.priority,
        executionModeUsed: rule.mode,
        matchReasons: [`Out of Scope: ${scopeRes.reason}`],
        riskScore: 0,
        requiresHumanApproval: false,
        latencyMs: Date.now() - startTime,
      };
    }
    matchReasons.push(`✓ Scope Verified (${scopeRes.reason})`);

    // 2. Evaluate by Execution Mode
    let isMatched = false;
    let intentDetected: string | undefined;
    let intentConfidence: number | undefined;
    let ragMatches: AssembledContext["relevantKnowledge"] = [];

    // ── MODE: TAG (Deterministic, Zero-LLM) ──
    if (rule.mode === "TAG") {
      const conditionPassed = ExpressionEvaluator.evaluateCondition(rule.conditions, ctx);
      if (conditionPassed) {
        isMatched = true;
        matchReasons.push("✓ Deterministic Tag & Expression Conditions Matched (Zero-LLM Fast Path)");
      } else {
        matchReasons.push("✗ Tag/Condition did not match");
      }
    }

    // ── MODE: RAG (Semantic & Knowledge Retrieval) ──
    else if (rule.mode === "RAG") {
      // 1. Detect Intent
      const intentRes = IntentLibrary.detectIntent(ctx.event.content);
      intentDetected = intentRes.intent;
      intentConfidence = intentRes.confidence;

      if (rule.intentConfig?.expectedIntent) {
        if (rule.intentConfig.expectedIntent !== intentDetected) {
          return {
            matched: false,
            ruleId: rule.id,
            ruleName: rule.name,
            rulePriority: rule.priority,
            executionModeUsed: "RAG",
            matchReasons: [`✗ Intent mismatch: expected "${rule.intentConfig.expectedIntent}", detected "${intentDetected}"`],
            riskScore: 0.1,
            requiresHumanApproval: false,
            latencyMs: Date.now() - startTime,
          };
        }
        matchReasons.push(`✓ Intent matched "${intentDetected}" (Confidence: ${Math.round(intentConfidence * 100)}%)`);
      }

      // 2. Retrieve Knowledge Base Match
      const { processEnhancedRAGReply } = await import("@/backend/rag");
      const ragRes = await processEnhancedRAGReply(
        ctx.event.content,
        (ctx.relevantKnowledge || []).map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          keywords: [],
          category: "General",
          createdAt: "",
          updatedAt: "",
        })),
        (ctx.event as any).senderId || ctx.event.actor?.name || "User",
        ctx.event.platform || "Platform"
      );

      const threshold = rule.ragConfig?.confidenceThreshold || 0.75;
      const confidence = ragRes?.confidence || 0;
      if (ragRes && confidence >= threshold) {
        isMatched = true;
        ragMatches = [
          {
            id: ragRes.matchedFAQId || "rag_match",
            question: ctx.event.content,
            answer: ragRes.replyText,
            confidence: confidence,
          },
        ];
        matchReasons.push(`✓ Knowledge Base RAG grounded answer retrieved (Confidence: ${Math.round(confidence * 100)}%)`);
      } else {
        matchReasons.push(`✗ RAG confidence ${Math.round(confidence * 100)}% below threshold ${Math.round(threshold * 100)}%`);
      }
    }

    // ── MODE: HYBRID (Deterministic First -> Semantic RAG for Ambiguity) ──
    else if (rule.mode === "HYBRID") {
      // Step A: Fast Deterministic Filter
      const conditionPassed = ExpressionEvaluator.evaluateCondition(rule.conditions, ctx);
      if (!conditionPassed) {
        return {
          matched: false,
          ruleId: rule.id,
          ruleName: rule.name,
          rulePriority: rule.priority,
          executionModeUsed: "HYBRID",
          matchReasons: ["✗ Initial deterministic filter eliminated event (RAG bypassed for cost efficiency)"],
          riskScore: 0,
          requiresHumanApproval: false,
          latencyMs: Date.now() - startTime,
        };
      }
      matchReasons.push("✓ Deterministic Pre-Filter Passed");

      // Step B: Intent & Knowledge Grounding
      const intentRes = IntentLibrary.detectIntent(ctx.event.content);
      intentDetected = intentRes.intent;
      intentConfidence = intentRes.confidence;

      const { processEnhancedRAGReply } = await import("@/backend/rag");
      const ragRes = await processEnhancedRAGReply(
        ctx.event.content,
        (ctx.relevantKnowledge || []).map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          keywords: [],
          category: "General",
          createdAt: "",
          updatedAt: "",
        })),
        (ctx.event as any).senderId || ctx.event.actor?.name || "User",
        ctx.event.platform || "Platform"
      );

      const confidence = ragRes?.confidence || 0;
      isMatched = true;
      ragMatches = [
        {
          id: ragRes?.matchedFAQId || "rag_hybrid",
          question: ctx.event.content,
          answer: ragRes?.replyText || "",
          confidence: confidence,
        },
      ];
      matchReasons.push(`✓ Hybrid execution grounded response via RAG (Confidence: ${Math.round(confidence * 100)}%)`);
    }

    if (!isMatched) {
      return {
        matched: false,
        ruleId: rule.id,
        ruleName: rule.name,
        rulePriority: rule.priority,
        executionModeUsed: rule.mode,
        matchReasons,
        riskScore: 0,
        requiresHumanApproval: false,
        latencyMs: Date.now() - startTime,
      };
    }

    // 3. Prepare Action Payload & Interpolate Template
    let rawTemplate = rule.actionPlan.templateText;
    if (!rawTemplate && ragMatches.length > 0) {
      rawTemplate = ragMatches[0].answer;
    }
    const finalReplyText = rawTemplate
      ? ExpressionEvaluator.interpolate(rawTemplate, ctx)
      : "";

    // 4. Policy & Safety Risk Assessment
    const { PolicyEngine } = await import("@/backend/policy/PolicyEngine");
    const policyResult = await PolicyEngine.evaluate({
      tenantId: ctx.event.tenantId,
      content: ctx.event.content,
      proposedReply: finalReplyText,
      platform: ctx.event.platform,
    });

    if (policyResult.action === "REQUIRE_APPROVAL") {
      matchReasons.push(`⚠️ Policy Gate Flagged Risk: ${policyResult.reason}`);
    } else {
      matchReasons.push("✓ Policy & Safety Verification Passed");
    }

    return {
      matched: true,
      ruleId: rule.id,
      ruleName: rule.name,
      rulePriority: rule.priority,
      executionModeUsed: rule.mode,
      matchReasons,
      intentDetected,
      intentConfidence,
      ragMatches,
      riskScore: policyResult.riskScore,
      requiresHumanApproval: policyResult.action === "REQUIRE_APPROVAL",
      actionPayload: {
        actionType: rule.actionPlan.actionType,
        replyText: finalReplyText,
        dynamicTags: rule.actionPlan.dynamicTags,
        target: ctx.event.target,
        actor: ctx.event.actor,
      },
      latencyMs: Date.now() - startTime,
    };
  }
}
