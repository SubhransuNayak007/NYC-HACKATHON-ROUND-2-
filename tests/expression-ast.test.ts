/**
 * Test Suite: Safe Expression AST & Variable System
 */

import { ExpressionEvaluator } from "../src/backend/rules/ExpressionEvaluator";
import { AssembledContext, ConditionBranch } from "../src/backend/rules/types";

async function runTests() {
  console.log("▶ Running Expression AST & Variable System Test Suite...");

  const context: AssembledContext = {
    event: {
      id: "evt_ast_1",
      tenantId: "tenant_ast",
      workspaceId: "ws_ast",
      platform: "instagram",
      eventType: "comment.created",
      actor: { id: "user_ig_1", name: "Ananya Sharma", username: "ananya_s" },
      content: "Is this course available in Hindi?",
      rawPayload: {},
      timestamp: new Date().toISOString(),
      idempotencyKey: "key_ast_1",
    },
    customer: {
      id: "c_1",
      tenantId: "tenant_ast",
      workspaceId: "ws_ast",
      name: "Ananya Sharma",
      identities: [{ platform: "instagram", externalId: "user_ig_1" }],
      leadScore: 88,
      leadStage: "lead",
      sentiment: "positive",
      tags: ["student", "early_bird"],
      totalInteractions: 3,
      lifetimeValue: 150,
      memories: [],
      lastInteractedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    contentMetadata: {
      id: "post_course_1",
      title: "Full-Stack AI Masterclass",
      tags: ["ai", "course"],
      platform: "instagram",
    },
  };

  // 1. Test Typed Variable Interpolation
  const template = "Hi {{customer.first_name}} (@{{customer.username}}) 👋 Thanks for asking about {{content.title}}! Current lead score: {{customer.lead_score}}";
  const interpolated = ExpressionEvaluator.interpolate(template, context);

  if (!interpolated.includes("Hi Ananya (@ananya_s)")) {
    throw new Error(`FAIL: Customer name/username interpolation failed: ${interpolated}`);
  }
  if (!interpolated.includes("Full-Stack AI Masterclass")) {
    throw new Error(`FAIL: Content title interpolation failed: ${interpolated}`);
  }
  console.log(`✓ Template interpolated correctly: "${interpolated}"`);

  // 2. Test Complex Nested Boolean Condition Tree (AND / OR)
  const conditionTree: ConditionBranch = {
    type: "branch",
    logicalOperator: "AND",
    children: [
      {
        type: "branch",
        logicalOperator: "OR",
        children: [
          { type: "leaf", field: "comment.text", operator: "contains", value: "Hindi" },
          { type: "leaf", field: "comment.text", operator: "contains", value: "English" },
        ],
      },
      { type: "leaf", field: "customer.lead_score", operator: "numeric_gt", value: 70 },
      { type: "leaf", field: "customer.tag", operator: "tag_match", value: "student" },
    ],
  };

  const evalResult = ExpressionEvaluator.evaluateCondition(conditionTree, context);
  if (!evalResult) {
    throw new Error("FAIL: Nested boolean expression tree evaluated to false when it should pass!");
  }
  console.log("✓ Nested boolean expression tree (AND + OR + numeric_gt + tag_match) evaluated correctly.");

  console.log("🎉 All Expression AST tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
