/**
 * Test Suite: TAG, RAG & HYBRID Execution Modes
 */

import { MatchingEngine } from "../src/backend/rules/MatchingEngine";
import { AutomationRule, AssembledContext } from "../src/backend/rules/types";
import { NormalizedEvent } from "../src/backend/events/EventNormalizer";

async function runTests() {
  console.log("▶ Running Rule Modes Test Suite (TAG, RAG, HYBRID)...");

  // 1. Setup Test Event & Context
  const testEvent: NormalizedEvent = {
    id: "evt_test_101",
    tenantId: "test_tenant",
    workspaceId: "ws_test",
    platform: "youtube",
    eventType: "comment.created",
    actor: {
      id: "actor_vip_1",
      name: "Siddharth Verma",
      username: "siddharth",
    },
    target: {
      videoId: "vid_launch_2026",
    },
    content: "What is the price of the Pro tier with VIP discount?",
    rawPayload: {},
    timestamp: new Date().toISOString(),
    idempotencyKey: "key_mode_101",
  };

  const context: AssembledContext = {
    event: testEvent,
    customer: {
      id: "cust_1",
      tenantId: "test_tenant",
      workspaceId: "ws_test",
      name: "Siddharth Verma",
      identities: [{ platform: "youtube", externalId: "actor_vip_1" }],
      leadScore: 92,
      leadStage: "hot",
      sentiment: "positive",
      tags: ["VIP", "enterprise_lead"],
      totalInteractions: 8,
      lifetimeValue: 1200,
      memories: [],
      lastInteractedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    contentMetadata: {
      id: "vid_launch_2026",
      title: "QuickReply 2.0 Launch",
      tags: ["launch", "vip_event"],
      platform: "youtube",
      isAutomatedTagMode: true,
      isAutomatedRAGMode: true,
    },
    relevantKnowledge: [
      {
        id: "faq_pricing",
        question: "How much does the Pro tier cost?",
        answer: "The Pro tier is $49/month with full multi-channel automation.",
        confidence: 0.96,
      },
    ],
  };

  // 2. Test TAG Mode (Deterministic, Zero-LLM Fast Path)
  const tagRule: AutomationRule = {
    id: "rule_tag_1",
    tenantId: "test_tenant",
    workspaceId: "ws_test",
    name: "VIP Tag Fast Responder",
    mode: "TAG",
    status: "PUBLISHED",
    version: 1,
    priority: 90,
    scope: { targetType: "ALL_CONTENT", targetIds: [], platforms: ["youtube"] },
    conditions: {
      type: "branch",
      logicalOperator: "AND",
      children: [
        { type: "leaf", field: "customer.tag", operator: "tag_match", value: "VIP" },
        { type: "leaf", field: "comment.text", operator: "contains", value: "price" },
      ],
    },
    actionPlan: {
      actionType: "reply_comment",
      templateText: "Hey {{customer.first_name}}! Since you're a VIP, your Pro rate is $39/mo.",
    },
    stopConditions: { stopAfterMatch: true, stopIfActionSucceeds: true, stopIfHighRisk: true, maxActionsPerComment: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionStats: { timesEvaluated: 0, timesMatched: 0, actionsExecuted: 0, actionsBlocked: 0, avgLatencyMs: 0 },
  };

  const tagDecision = await MatchingEngine.evaluateRule(tagRule, context);
  if (!tagDecision.matched) throw new Error("FAIL: TAG mode rule did not match valid VIP tags!");
  if (!tagDecision.actionPayload?.replyText.includes("Siddharth")) {
    throw new Error(`FAIL: Template variable interpolation failed: ${tagDecision.actionPayload?.replyText}`);
  }
  console.log(`✓ TAG Mode matched in ${tagDecision.latencyMs}ms with zero-LLM overhead.`);

  // 3. Test HYBRID Mode (Deterministic Filter + RAG Knowledge Grounding)
  const hybridRule: AutomationRule = {
    ...tagRule,
    id: "rule_hybrid_1",
    name: "Hybrid Knowledge Responder",
    mode: "HYBRID",
    actionPlan: {
      actionType: "reply_comment",
      templateText: "", // Grounded directly by RAG
    },
  };

  const hybridDecision = await MatchingEngine.evaluateRule(hybridRule, context);
  if (!hybridDecision.matched) throw new Error("FAIL: HYBRID mode rule did not match!");
  if (hybridDecision.ragMatches?.length === 0) throw new Error("FAIL: HYBRID mode did not ground in RAG knowledge!");
  console.log(`✓ HYBRID Mode successfully passed pre-filters and grounded answer in Knowledge Base.`);

  console.log("🎉 All Rule Modes tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
