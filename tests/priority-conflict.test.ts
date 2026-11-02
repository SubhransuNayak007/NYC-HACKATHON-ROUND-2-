/**
 * Test Suite: Priority Engine & Conflict Resolution
 */

import { PriorityEngine } from "../src/backend/rules/PriorityEngine";
import { AutomationRule, MatchDecision } from "../src/backend/rules/types";

async function runTests() {
  console.log("▶ Running Priority Engine & Conflict Resolution Test Suite...");

  // Mock Rules
  const highPriorityRule: AutomationRule = {
    id: "r_high",
    tenantId: "t1",
    workspaceId: "w1",
    name: "VIP Direct Reply",
    mode: "TAG",
    status: "PUBLISHED",
    version: 1,
    priority: 95,
    scope: { targetType: "SELECTED_VIDEOS", targetIds: ["vid_1"], platforms: ["youtube"] },
    conditions: { type: "leaf", field: "comment.text", operator: "always_pass", value: "" },
    actionPlan: { actionType: "reply_comment", templateText: "VIP reply" },
    stopConditions: { stopAfterMatch: true, stopIfActionSucceeds: true, stopIfHighRisk: true, maxActionsPerComment: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionStats: { timesEvaluated: 0, timesMatched: 0, actionsExecuted: 0, actionsBlocked: 0, avgLatencyMs: 0 },
  };

  const lowPriorityRule: AutomationRule = {
    ...highPriorityRule,
    id: "r_low",
    name: "Generic Engagement",
    priority: 30,
    scope: { targetType: "ALL_CONTENT", targetIds: [], platforms: ["youtube"] },
  };

  const rulesMap = new Map<string, AutomationRule>([
    ["r_high", highPriorityRule],
    ["r_low", lowPriorityRule],
  ]);

  const mockDecisions: MatchDecision[] = [
    {
      matched: true,
      ruleId: "r_low",
      ruleName: "Generic Engagement",
      rulePriority: 30,
      executionModeUsed: "TAG",
      matchReasons: ["Matched all content"],
      riskScore: 0.1,
      requiresHumanApproval: false,
      actionPayload: { actionType: "reply_comment", replyText: "Generic reply" },
      latencyMs: 1,
    },
    {
      matched: true,
      ruleId: "r_high",
      ruleName: "VIP Direct Reply",
      rulePriority: 95,
      executionModeUsed: "TAG",
      matchReasons: ["Matched VIP tag"],
      riskScore: 0.1,
      requiresHumanApproval: false,
      actionPayload: { actionType: "reply_comment", replyText: "VIP reply" },
      latencyMs: 1,
    },
  ];

  // 1. Resolve Priority (Highest Priority Must Win)
  const result = PriorityEngine.resolve(mockDecisions, rulesMap);
  if (!result) throw new Error("FAIL: Priority resolution returned null");
  if (result.winner.ruleId !== "r_high") {
    throw new Error(`FAIL: Expected VIP rule to win (95 priority), but "${result.winner.ruleName}" won!`);
  }
  console.log(`✓ Winner correctly resolved: "${result.winner.ruleName}" (Priority: ${result.winner.rulePriority}).`);

  // 2. Enforce Stop Conditions (Only 1 reply executed)
  if (result.executedDecisions.length !== 1) {
    throw new Error(`FAIL: Expected stop_after_match to allow only 1 action, got ${result.executedDecisions.length}`);
  }
  console.log("✓ Stop condition successfully prevented duplicate reply collision.");

  console.log("🎉 All Priority & Conflict tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
