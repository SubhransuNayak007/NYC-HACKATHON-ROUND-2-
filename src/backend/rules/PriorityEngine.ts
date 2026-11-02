/**
 * ============================================================================
 * QuickReply — Priority Engine & Conflict Resolution
 * src/backend/rules/PriorityEngine.ts
 *
 * Resolves rule priorities (1-100), handles tie-breaker conflict resolution
 * (specificity, risk, scope), and enforces stop-condition policies.
 * ============================================================================
 */

import { AutomationRule, MatchDecision } from "./types";

export interface PriorityResolutionResult {
  winner: MatchDecision;
  allMatchedDecisions: MatchDecision[];
  executedDecisions: MatchDecision[];
  conflictsDetected: {
    ruleA: string;
    ruleB: string;
    reason: string;
    resolution: string;
  }[];
}

export class PriorityEngine {
  /**
   * Sort and resolve matching candidates
   */
  static resolve(
    matchedDecisions: MatchDecision[],
    rulesMap: Map<string, AutomationRule>
  ): PriorityResolutionResult | null {
    if (!matchedDecisions || matchedDecisions.length === 0) {
      return null;
    }

    const conflictsDetected: PriorityResolutionResult["conflictsDetected"] = [];

    // 1. Sort by Priority (Descending: 100 -> 1)
    const sorted = [...matchedDecisions].sort((a, b) => {
      if (b.rulePriority !== a.rulePriority) {
        return b.rulePriority - a.rulePriority;
      }

      // Tie-Breaker 1: Scope Specificity
      const ruleA = rulesMap.get(a.ruleId);
      const ruleB = rulesMap.get(b.ruleId);

      const scoreScope = (r?: AutomationRule): number => {
        if (!r) return 0;
        if (r.scope.targetType === "SELECTED_VIDEOS" || r.scope.targetType === "SELECTED_POSTS") return 3;
        if (r.scope.targetType === "SELECTED_CHANNELS" || r.scope.targetType === "SELECTED_TAGS") return 2;
        return 1;
      };

      const scopeDiff = scoreScope(ruleB) - scoreScope(ruleA);
      if (scopeDiff !== 0) {
        conflictsDetected.push({
          ruleA: a.ruleName,
          ruleB: b.ruleName,
          reason: `Equal priority (${a.rulePriority}). Resolved by Scope Specificity.`,
          resolution: scopeDiff < 0 ? `Selected "${a.ruleName}" (Narrower Target)` : `Selected "${b.ruleName}" (Narrower Target)`,
        });
        return scopeDiff;
      }

      // Tie-Breaker 2: Execution Mode (TAG deterministic preferred over probabilistic RAG)
      const scoreMode = (m: string) => (m === "TAG" ? 3 : m === "HYBRID" ? 2 : 1);
      return scoreMode(b.executionModeUsed) - scoreMode(a.executionModeUsed);
    });

    const winner = sorted[0];
    const winnerRule = rulesMap.get(winner.ruleId);

    // 2. Evaluate Stop Conditions
    let executedDecisions = [winner];

    if (winnerRule?.stopConditions?.stopAfterMatch) {
      executedDecisions = [winner];
    } else {
      // Allow secondary non-conflicting actions (e.g. add_tag when winner is reply_comment)
      for (let i = 1; i < sorted.length; i++) {
        const candidate = sorted[i];
        const isDuplicateReply =
          candidate.actionPayload?.actionType === "reply_comment" &&
          winner.actionPayload?.actionType === "reply_comment";

        if (!isDuplicateReply) {
          executedDecisions.push(candidate);
        } else {
          conflictsDetected.push({
            ruleA: winner.ruleName,
            ruleB: candidate.ruleName,
            reason: "Both rules attempt to reply to the same comment.",
            resolution: `Suppressed duplicate reply from "${candidate.ruleName}".`,
          });
        }
      }
    }

    return {
      winner,
      allMatchedDecisions: sorted,
      executedDecisions,
      conflictsDetected,
    };
  }
}
