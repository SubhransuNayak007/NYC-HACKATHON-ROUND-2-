/**
 * Test Suite: Rule Simulator & Explainability Debugger
 */

import { RuleSimulator } from "../src/backend/rules/RuleSimulator";
import { getDB, saveDB } from "../src/database/db";
import { AutomationRule } from "../src/backend/rules/types";

async function runTests() {
  console.log("▶ Running Rule Simulator & Explainability Test Suite...");

  const tenantId = "tenant_sim_test";

  // Setup sample published rule in DB
  const testRule: AutomationRule = {
    id: "rule_sim_price",
    tenantId,
    workspaceId: `ws_${tenantId}`,
    name: "Auto Price Responder",
    mode: "TAG",
    status: "PUBLISHED",
    version: 1,
    priority: 85,
    scope: { targetType: "ALL_CONTENT", targetIds: [], platforms: ["youtube"] },
    conditions: { type: "leaf", field: "comment.text", operator: "contains", value: "price" },
    actionPlan: { actionType: "reply_comment", templateText: "Hi {{customer.first_name}}, the price is $29/mo." },
    stopConditions: { stopAfterMatch: true, stopIfActionSucceeds: true, stopIfHighRisk: true, maxActionsPerComment: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionStats: { timesEvaluated: 0, timesMatched: 0, actionsExecuted: 0, actionsBlocked: 0, avgLatencyMs: 0 },
  };

  const db = await getDB(tenantId);
  db.automationRules = [testRule];
  await saveDB(db, tenantId);

  // Run Simulation
  const simResult = await RuleSimulator.simulate({
    tenantId,
    commentText: "What is the price for this product?",
    authorName: "Maya Lin",
    platform: "youtube",
  });

  if (!simResult.hasMatch) {
    throw new Error("FAIL: Simulation expected match on price rule!");
  }
  if (!simResult.simulatedAction?.replyText?.includes("Maya")) {
    throw new Error(`FAIL: Variable interpolation failed in simulation: ${simResult.simulatedAction?.replyText}`);
  }
  if (simResult.decisionTrace.length === 0) {
    throw new Error("FAIL: Simulation returned empty decision trace!");
  }

  console.log("✓ Simulation decision trace verified:");
  simResult.decisionTrace.forEach((step) => console.log(`   ${step}`));
  console.log(`✓ Action Simulated: "${simResult.simulatedAction?.replyText}"`);

  console.log("🎉 All Rule Simulator tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
