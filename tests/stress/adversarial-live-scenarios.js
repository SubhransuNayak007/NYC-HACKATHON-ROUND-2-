/**
 * ============================================================================
 * QuickReply AI Automation OS — Adversarial Live Stress Testing & DAG Verifier
 * tests/stress/adversarial-live-scenarios.js
 *
 * Probes the live dev server on port 3000 (http://localhost:3000) using real HTTP.
 * Validates dynamic DAG synthesis, synthetic testing, and deployment across
 * diverse custom scenarios.
 * ============================================================================
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SESSION_SECRET = process.env.SESSION_SECRET || "quickreply_production_session_secret_key_2026_safe_default";

function getAuthCookie(email = "verifier_challenger@quickreply.ai") {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(email.toLowerCase().trim());
  const token = hmac.digest("hex");
  return `session_email=${encodeURIComponent(email)}; session_token=${token}`;
}

const authHeaders = {
  "Content-Type": "application/json",
  "Cookie": getAuthCookie(),
};

const guestHeaders = {
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const scenarioReports = [];

function assert(condition, scenario, label, details) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] [${scenario}] ${label}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] [${scenario}] ${label}: ${JSON.stringify(details)}`);
  }
}

async function requestJson(url, options, retries = 1) {
  const t0 = Date.now();
  const res = await fetch(url, options);
  const latencyMs = Date.now() - t0;
  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    if (retries > 0 && rawText.includes("<!DOCTYPE")) {
      await sleep(1000);
      return requestJson(url, options, retries - 1);
    }
    data = { rawText: rawText.substring(0, 500), parseError: true };
  }
  return { status: res.status, ok: res.ok, latencyMs, data };
}

async function runScenario(scenarioKey, title, prompt, testPayload) {
  console.log(`\n================================================================================`);
  console.log(`▶ Executing ${scenarioKey}: "${title}"`);
  console.log(`  Prompt: "${prompt}"`);
  console.log(`================================================================================`);

  const report = {
    scenarioKey,
    title,
    prompt,
    requests: [],
    assertions: [],
    status: "PENDING",
  };

  const startTime = Date.now();

  try {
    // 1. POST /api/ai/conversations
    console.log(`\n[1/4] POST /api/ai/conversations`);
    const convRes = await requestJson(`${BASE_URL}/api/ai/conversations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ title: `Live Test: ${title}` }),
    });

    report.requests.push({
      step: "init_conversation",
      endpoint: "POST /api/ai/conversations",
      statusCode: convRes.status,
      latencyMs: convRes.latencyMs,
      response: convRes.data,
    });

    assert(convRes.status === 200, scenarioKey, "Conversation creation HTTP 200", { status: convRes.status, data: convRes.data });
    assert(convRes.data?.success === true, scenarioKey, "Conversation creation success flag", convRes.data);
    assert(typeof convRes.data?.conversation?.id === "string" && convRes.data.conversation.id.startsWith("conv_"), scenarioKey, "Valid dynamic conversation ID format", convRes.data?.conversation?.id);

    const convId = convRes.data?.conversation?.id;
    if (!convId) {
      throw new Error(`Conversation creation failed, cannot proceed with ${scenarioKey}`);
    }

    await sleep(300);

    // 2. POST /api/ai/conversations/[id]/messages
    console.log(`\n[2/4] POST /api/ai/conversations/${convId}/messages`);
    const msgRes = await requestJson(`${BASE_URL}/api/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ content: prompt }),
    });

    const spec = msgRes.data?.workflowSpec;
    const dagPreview = msgRes.data?.dagPreview;

    report.requests.push({
      step: "send_message_and_compile",
      endpoint: `POST /api/ai/conversations/${convId}/messages`,
      statusCode: msgRes.status,
      latencyMs: msgRes.latencyMs,
      response: {
        specId: spec?.id,
        name: spec?.name,
        stepsCount: spec?.steps?.length,
        dagNodesCount: dagPreview?.nodes?.length,
        dagEdgesCount: dagPreview?.edges?.length,
        error: msgRes.data?.error,
      },
    });

    assert(msgRes.status === 200, scenarioKey, "Message compilation HTTP 200", { status: msgRes.status, data: msgRes.data });
    assert(msgRes.data?.success === true, scenarioKey, "Message processing success flag", msgRes.data);
    assert(typeof spec?.id === "string" && spec.id.startsWith("wf_"), scenarioKey, "Dynamic WorkflowSpec ID generated", spec?.id);
    assert(Array.isArray(spec?.steps) && spec.steps.length > 0, scenarioKey, "Workflow steps populated", spec?.steps?.length);
    assert(Array.isArray(dagPreview?.nodes) && dagPreview.nodes.length >= 2, scenarioKey, "Visual DAG nodes generated (Trigger + Steps)", dagPreview?.nodes?.length);
    assert(Array.isArray(dagPreview?.edges) && dagPreview.edges.length >= 1, scenarioKey, "Visual DAG edges generated", dagPreview?.edges?.length);

    if (dagPreview?.nodes) {
      const triggerNode = dagPreview.nodes.find((n) => n.id === "trigger");
      assert(!!triggerNode, scenarioKey, "DAG contains root triggerNode", triggerNode);
      assert(dagPreview.nodes.length === spec.steps.length + 1, scenarioKey, "DAG node count strictly equals 1 (trigger) + steps count", {
        nodes: dagPreview.nodes.length,
        expected: spec.steps.length + 1,
      });
      assert(dagPreview.edges.length === spec.steps.length, scenarioKey, "DAG edge count strictly equals linear steps connection count", {
        edges: dagPreview.edges.length,
        steps: spec.steps.length,
      });
    }

    if (!spec?.id) {
      throw new Error(`Workflow spec missing, cannot test or deploy ${scenarioKey}`);
    }

    await sleep(300);

    // 3. POST /api/workflows/[id]/test
    console.log(`\n[3/4] POST /api/workflows/${spec.id}/test`);
    const testRes = await requestJson(`${BASE_URL}/api/workflows/${spec.id}/test`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ testInput: testPayload }),
    });

    report.requests.push({
      step: "run_synthetic_test",
      endpoint: `POST /api/workflows/${spec.id}/test`,
      statusCode: testRes.status,
      latencyMs: testRes.latencyMs,
      response: {
        success: testRes.data?.success,
        workflowId: testRes.data?.workflowId,
        stepResultsCount: testRes.data?.testResult?.stepResults?.length,
        error: testRes.data?.error,
      },
    });

    assert(testRes.status === 200, scenarioKey, "Synthetic test execution HTTP 200", { status: testRes.status });
    assert(testRes.data?.success === true, scenarioKey, "Synthetic test success flag", testRes.data);
    assert(testRes.data?.testResult?.success === true, scenarioKey, "Dry-run execution passed", testRes.data?.testResult);
    assert(
      Array.isArray(testRes.data?.testResult?.stepResults) &&
        testRes.data.testResult.stepResults.length === spec.steps.length,
      scenarioKey,
      "Step-by-step test execution results match spec steps",
      { resultsCount: testRes.data?.testResult?.stepResults?.length, specStepsCount: spec.steps.length }
    );

    const firstResult = testRes.data?.testResult?.stepResults?.[0];
    assert(firstResult?.status === "SUCCESS", scenarioKey, "First step executed with SUCCESS status", firstResult);

    await sleep(300);

    // 4. POST /api/workflows/[id]/deploy
    console.log(`\n[4/4] POST /api/workflows/${spec.id}/deploy`);
    const deployRes = await requestJson(`${BASE_URL}/api/workflows/${spec.id}/deploy`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ runtimeTarget: spec.runtimeTarget || "n8n" }),
    });

    report.requests.push({
      step: "deploy_workflow",
      endpoint: `POST /api/workflows/${spec.id}/deploy`,
      statusCode: deployRes.status,
      latencyMs: deployRes.latencyMs,
      response: deployRes.data,
    });

    assert(deployRes.status === 200, scenarioKey, "Workflow deployment HTTP 200", { status: deployRes.status, response: deployRes.data });
    assert(deployRes.data?.success === true, scenarioKey, "Deployment success flag", deployRes.data);
    assert(
      typeof deployRes.data?.deployment?.deploymentId === "string" &&
        deployRes.data.deployment.deploymentId.startsWith("dep_"),
      scenarioKey,
      "Cryptographic deployment ID generated",
      deployRes.data?.deployment?.deploymentId
    );
    assert(deployRes.data?.deployment?.status === "ACTIVE", scenarioKey, "Deployment status is ACTIVE", deployRes.data?.deployment?.status);
    assert(deployRes.data?.workflowSpec?.status === "ACTIVE", scenarioKey, "WorkflowSpec status updated to ACTIVE", deployRes.data?.workflowSpec?.status);
    assert(!!deployRes.data?.workflowSpec?.deployedAt, scenarioKey, "WorkflowSpec deployedAt timestamp set", deployRes.data?.workflowSpec?.deployedAt);

    report.status = deployRes.ok ? "SUCCESS" : "FAILED";
    report.spec = spec;
    report.deployment = deployRes.data?.deployment;
  } catch (err) {
    report.status = "ERROR";
    report.error = err.message;
    console.error(`  ❌ Error in ${scenarioKey}:`, err.message);
  }

  report.totalDurationMs = Date.now() - startTime;
  scenarioReports.push(report);
  return report;
}

async function runSecurityGateCheck() {
  console.log(`\n================================================================================`);
  console.log(`▶ Executing Security Gate Check: Unauthenticated Guest vs Protected Deploy`);
  console.log(`================================================================================`);

  // 1. Guest conversation creation
  const convRes = await requestJson(`${BASE_URL}/api/ai/conversations`, {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ title: "Guest Playground Flow" }),
  });
  assert(convRes.status === 200, "SecurityGate", "Guest conversation creation allowed (200)", { status: convRes.status });
  assert(convRes.data?.conversation?.tenantId === "guest_demo", "SecurityGate", "Assigned to guest_demo tenant", convRes.data?.conversation?.tenantId);

  const guestConvId = convRes.data?.conversation?.id;
  await sleep(300);

  // 2. Guest message compilation
  const msgRes = await requestJson(`${BASE_URL}/api/ai/conversations/${guestConvId}/messages`, {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ content: "When I receive a Gmail invoice, log to Sheets" }),
  });
  assert(msgRes.status === 200, "SecurityGate", "Guest message compilation allowed (200)", { status: msgRes.status });
  const guestSpecId = msgRes.data?.workflowSpec?.id;
  await sleep(300);

  // 3. Guest synthetic test
  const testRes = await requestJson(`${BASE_URL}/api/workflows/${guestSpecId}/test`, {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ testInput: { amount: 100 } }),
  });
  assert(testRes.status === 200, "SecurityGate", "Guest test execution allowed in sandbox (200)", { status: testRes.status });
  await sleep(300);

  // 4. Guest deploy attempt (MUST BE 401 UNAUTHORIZED)
  const deployRes = await requestJson(`${BASE_URL}/api/workflows/${guestSpecId}/deploy`, {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ runtimeTarget: "n8n" }),
  });
  assert(deployRes.status === 401, "SecurityGate", "Unauthenticated deploy strictly blocked (401)", { status: deployRes.status });
  assert(deployRes.data?.error === "Unauthorized", "SecurityGate", "Returns explicit Unauthorized error", deployRes.data);
}

async function main() {
  console.log("================================================================================");
  console.log("⚡ EMPIRICAL CHALLENGER — ADVERSARIAL STRESS TEST & DYNAMIC DAG ASSERTIONS");
  console.log(`   Target Server: ${BASE_URL}`);
  console.log("================================================================================");

  // Scenario A: Gmail invoices -> Sheets -> Telegram alert
  const repA = await runScenario(
    "Scenario A",
    "Gmail invoices -> Sheets -> Telegram alert",
    "When I receive an invoice in Gmail, extract the invoice number, vendor, amount and due date. Add everything to Google Sheets. If it exceeds ₹50,000, notify me on Telegram.",
    {
      vendor: "Atlas Cloud Dynamics",
      invoiceNumber: "INV-2026-X99",
      amount: 98500,
      dueDate: "2026-11-30",
    }
  );

  await sleep(500);

  // Scenario B: Stripe payments -> Slack notifications
  const repB = await runScenario(
    "Scenario B",
    "Stripe payments -> Slack notifications",
    "Every time a new payment succeeds on Stripe, post an instant notification to Slack in #sales-wins with customer name, amount, and invoice link.",
    {
      chargeId: "ch_adversarial_test_9921",
      customerName: "Jane Doe Enterprise",
      amount: 145000,
      invoiceUrl: "https://stripe.com/inv/9921",
    }
  );

  await sleep(500);

  // Scenario C: Arbitrary custom business logic (Webhook -> AI Discount -> SMS Alert)
  const repC = await runScenario(
    "Scenario C",
    "Arbitrary Business Logic: Webhook -> AI Discount -> SMS Alert",
    "Monitor inbound webhook events from Shopify, calculate dynamic customer discount using AI logic based on purchase history, and dispatch a personalized SMS alert via Twilio.",
    {
      customerId: "cust_7718",
      orderValue: 3500,
      loyaltyTier: "PLATINUM",
    }
  );

  await sleep(500);

  // Security Gate Check: Unauthenticated guest boundary testing
  await runSecurityGateCheck();

  // Dynamic Variance & Non-Canned Invariants
  console.log(`\n================================================================================`);
  console.log("▶ Cross-Scenario Dynamic Variance & Non-Canned Invariants");
  console.log("================================================================================\n");

  assert(
    repA.spec?.id && repB.spec?.id && repA.spec?.id !== repB.spec?.id,
    "Variance",
    "Workflow IDs are cryptographically unique across runs",
    { idA: repA.spec?.id, idB: repB.spec?.id }
  );

  assert(
    repA.spec?.name !== repB.spec?.name,
    "Variance",
    "Workflow titles differ between Scenario A and Scenario B",
    { titleA: repA.spec?.name, titleB: repB.spec?.name }
  );

  assert(
    repA.spec?.steps?.length !== repB.spec?.steps?.length,
    "Variance",
    "Step count dynamically adjusts to prompt complexity",
    { stepsA: repA.spec?.steps?.length, stepsB: repB.spec?.steps?.length }
  );

  const nowMs = Date.now();
  const createdMs = repA.spec?.createdAt ? new Date(repA.spec.createdAt).getTime() : 0;
  assert(
    createdMs > 0 && Math.abs(nowMs - createdMs) < 120000,
    "Variance",
    "CreatedAt timestamp is live and current (not canned static time)",
    { now: new Date(nowMs).toISOString(), createdAt: repA.spec?.createdAt }
  );

  console.log(`\n================================================================================`);
  console.log(` SUMMARY RESULT: ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED (${failedAssertions} FAILED)`);
  console.log("================================================================================\n");

  const verdict = failedAssertions === 0 ? "APPROVE" : "REJECT";
  console.log(`FINAL CHALLENGER VERDICT: ${verdict}\n`);

  const outputPath = path.join(__dirname, "adversarial-live-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        verdict,
        stats: { totalAssertions, passedAssertions, failedAssertions },
        scenarios: scenarioReports,
      },
      null,
      2
    )
  );
  console.log(`Detailed verification log saved to: ${outputPath}`);

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});
