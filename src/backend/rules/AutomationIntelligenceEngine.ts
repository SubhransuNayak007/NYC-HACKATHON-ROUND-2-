/**
 * ============================================================================
 * QuickReply — Automation Intelligence Engine Coordinator
 * src/backend/rules/AutomationIntelligenceEngine.ts
 *
 * The central execution pipeline connecting:
 * Event -> Normalizer -> Scope -> Context -> Matching (TAG/RAG/HYBRID) -> Priority -> Policy -> Action -> Audit
 * ============================================================================
 */

import { NormalizedEvent } from "@/backend/events/EventNormalizer";
import { ContextBuilder } from "./ContextBuilder";
import { MatchingEngine } from "./MatchingEngine";
import { PriorityEngine } from "./PriorityEngine";
import { AutomationRule, MatchDecision } from "./types";
import { getDB, saveDB } from "@/database/db";
import { IdempotencyEngine } from "@/backend/events/IdempotencyEngine";
import { ApprovalService } from "@/backend/approval/ApprovalService";
import { CustomerMemoryService } from "@/backend/crm/CustomerMemoryService";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export interface PipelineExecutionOutcome {
  status: "EXECUTED" | "SKIPPED_NO_MATCH" | "WAITING_APPROVAL" | "IGNORED_DUPLICATE" | "FAILED";
  winnerRuleName?: string;
  actionTaken?: string;
  replyDispatched?: string;
  latencyMs: number;
  error?: string;
}

export class AutomationIntelligenceEngine {
  /**
   * Process an Inbound Normalized Event through the Full Decision Pipeline
   */
  static async processEvent(event: NormalizedEvent): Promise<PipelineExecutionOutcome> {
    const startTime = Date.now();
    const tenantId = event.tenantId;

    // 1. Idempotency Check (Anti-Duplicate Guard)
    const lock = await IdempotencyEngine.acquireLock(tenantId, event.idempotencyKey, 300);
    if (!lock.acquired) {
      return {
        status: "IGNORED_DUPLICATE",
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      // 2. Build Multi-Dimensional Context
      const ctx = await ContextBuilder.buildContext(event);

      // 3. Retrieve Published Automation Rules for Tenant
      const db = await getDB(tenantId);
      const rules: AutomationRule[] = (db.automationRules || []).filter(
        (r: AutomationRule) => r.status === "PUBLISHED"
      );

      if (rules.length === 0) {
        await IdempotencyEngine.complete(tenantId, event.idempotencyKey, undefined, { status: "NO_RULES" });
        return {
          status: "SKIPPED_NO_MATCH",
          latencyMs: Date.now() - startTime,
        };
      }

      // 4. Evaluate Matching Engine across rules
      const matchedDecisions: MatchDecision[] = [];
      const rulesMap = new Map<string, AutomationRule>();

      for (const rule of rules) {
        rulesMap.set(rule.id, rule);
        const decision = await MatchingEngine.evaluateRule(rule, ctx);
        if (decision.matched) {
          matchedDecisions.push(decision);
        }
      }

      if (matchedDecisions.length === 0) {
        await IdempotencyEngine.complete(tenantId, event.idempotencyKey, undefined, { status: "NO_MATCH" });
        return {
          status: "SKIPPED_NO_MATCH",
          latencyMs: Date.now() - startTime,
        };
      }

      // 5. Priority & Conflict Resolution
      const resolution = PriorityEngine.resolve(matchedDecisions, rulesMap);
      if (!resolution) {
        await IdempotencyEngine.complete(tenantId, event.idempotencyKey, undefined, { status: "NO_WINNER" });
        return {
          status: "SKIPPED_NO_MATCH",
          latencyMs: Date.now() - startTime,
        };
      }

      const winner = resolution.winner;
      const winnerRule = rulesMap.get(winner.ruleId);

      // 6. Handle Human Review Interception (Policy Safety Gate)
      if (winner.requiresHumanApproval) {
        await ApprovalService.createRequest({
          tenantId,
          workspaceId: event.workspaceId,
          executionId: `exec_${Date.now()}`,
          workflowId: winner.ruleId,
          actionType: winner.actionPayload?.actionType || "reply_comment",
          riskScore: winner.riskScore,
          reason: winner.matchReasons.find((r) => r.includes("Policy Gate")) || "High-risk trigger intercepted by safety policy.",
          customerContext: {
            actorName: event.actor.name || event.actor.username,
            platform: event.platform,
            inboundText: event.content,
          },
          suggestedAction: winner.actionPayload || {},
        });

        await IdempotencyEngine.complete(tenantId, event.idempotencyKey, winner.ruleId, { status: "WAITING_APPROVAL" });

        return {
          status: "WAITING_APPROVAL",
          winnerRuleName: winner.ruleName,
          latencyMs: Date.now() - startTime,
        };
      }

      // 7. Autonomous Action Execution
      const replyText = winner.actionPayload?.replyText;
      let actionTaken = winner.actionPayload?.actionType || "reply_comment";

      if (winnerRule) {
        // Update execution statistics
        winnerRule.executionStats = {
          timesEvaluated: (winnerRule.executionStats?.timesEvaluated || 0) + 1,
          timesMatched: (winnerRule.executionStats?.timesMatched || 0) + 1,
          actionsExecuted: (winnerRule.executionStats?.actionsExecuted || 0) + 1,
          actionsBlocked: winnerRule.executionStats?.actionsBlocked || 0,
          avgLatencyMs: Math.round(
            ((winnerRule.executionStats?.avgLatencyMs || 0) + (Date.now() - startTime)) / 2
          ),
          lastExecutedAt: new Date().toISOString(),
        };
        await saveDB(db, tenantId);
      }

      // 8. CRM Memory & Recalibration
      if (ctx.customer) {
        await CustomerMemoryService.recordInteraction({
          tenantId,
          customerId: ctx.customer.id,
          inboundText: event.content,
          replyText,
          sentimentDetected: winner.intentDetected === "PRAISE" ? "positive" : winner.intentDetected === "COMPLAINT" ? "negative" : "neutral",
          intentDetected: winner.intentDetected,
        });
      }

      // 9. Complete Idempotency Record
      await IdempotencyEngine.complete(tenantId, event.idempotencyKey, winner.ruleId, {
        status: "EXECUTED",
        replyText,
      });

      return {
        status: "EXECUTED",
        winnerRuleName: winner.ruleName,
        actionTaken,
        replyDispatched: replyText,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      await IdempotencyEngine.release(tenantId, event.idempotencyKey, err.message);
      return {
        status: "FAILED",
        error: err.message || "Automation execution failed",
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
