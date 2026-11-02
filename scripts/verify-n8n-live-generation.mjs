/**
 * ============================================================================
 * QuickReply AI Automation Operating System
 * Empirical Verification: n8n Connection, SSRF Defense & Live Generation Pipeline
 * scripts/verify-n8n-live-generation.mjs
 * ============================================================================
 */

import http from "http";
import assert from "assert";
import crypto from "crypto";

// Color helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function report(name, success, detail = "") {
  if (success) {
    passedCount++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${name}${detail ? ` — ${CYAN}${detail}${RESET}` : ""}`);
  } else {
    failedCount++;
    console.log(`  ${RED}✗ [FAIL]${RESET} ${name} — ${detail}`);
  }
}

async function run() {
  console.log(`\n================================================================================`);
  console.log(`   🎯 QUICKREPLY AI AUTOMATION OS — n8n GENERATION & DISPATCH VERIFICATION`);
  console.log(`================================================================================\n`);

  // Dynamically import compiled modules
  const { N8nApiClient } = await import("../src/backend/automation/n8n/N8nApiClient.ts");
  const { encryptToken, decryptToken } = await import("../src/database/db.ts");
  const { AutomationPlannerAgent } = await import("../src/backend/automation/agent/AutomationPlannerAgent.ts");
  const { WorkflowCompiler } = await import("../src/backend/automation/compiler/WorkflowCompiler.ts");

  // TEST 1: URL Normalization
  console.log(`${YELLOW}1. Testing URL Normalization & Sanitization...${RESET}`);
  try {
    const norm1 = await N8nApiClient.validateAndNormalizeUrl("https://workspace.app.n8n.cloud///");
    report("Strip trailing slashes", norm1 === "https://workspace.app.n8n.cloud", norm1);

    const norm2 = await N8nApiClient.validateAndNormalizeUrl("https://mycompany.com/n8n/");
    report("Preserve reverse proxy base path", norm2 === "https://mycompany.com/n8n", norm2);
  } catch (err) {
    report("URL Normalization", false, err.message);
  }

  // TEST 2: SSRF Defense
  console.log(`\n${YELLOW}2. Testing SSRF Defense in Production Mode...${RESET}`);
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  delete process.env.ALLOW_LOCAL_N8N;

  try {
    let blockedMetadata = false;
    try {
      await N8nApiClient.validateAndNormalizeUrl("http://169.254.169.254/latest/meta-data/");
    } catch (e) {
      blockedMetadata = e.message.includes("cloud metadata") || e.message.includes("prohibited");
    }
    report("Block AWS link-local metadata (169.254.169.254)", blockedMetadata);

    let blockedLoopback = false;
    try {
      await N8nApiClient.validateAndNormalizeUrl("http://127.0.0.1:5678");
    } catch (e) {
      blockedLoopback = e.message.includes("loopback") || e.message.includes("prohibited");
    }
    report("Block local loopback (127.0.0.1) in production", blockedLoopback);

    let blockedProtocol = false;
    try {
      await N8nApiClient.validateAndNormalizeUrl("ftp://files.n8n.io/workflows");
    } catch (e) {
      blockedProtocol = e.message.includes("Unsupported protocol");
    }
    report("Reject unsupported non-http(s) protocols", blockedProtocol);
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.ALLOW_LOCAL_N8N = "true";
  }

  // TEST 3: Deterministic Editor URL Construction
  console.log(`\n${YELLOW}3. Testing n8n Editor URL Construction...${RESET}`);
  const editorUrl1 = N8nApiClient.constructEditorUrl("https://quickreply.app.n8n.cloud/", "wf_8941");
  report("Direct cloud editor URL", editorUrl1 === "https://quickreply.app.n8n.cloud/workflow/wf_8941", editorUrl1);

  const editorUrl2 = N8nApiClient.constructEditorUrl("https://corp.internal/n8n", "1024");
  report("Subpath reverse proxy editor URL", editorUrl2 === "https://corp.internal/n8n/workflow/1024", editorUrl2);

  // TEST 4: AES-256-GCM Credential Encryption & Decryption
  console.log(`\n${YELLOW}4. Testing Cryptographic Vault (AES-256-GCM)...${RESET}`);
  const sampleKey = "n8n_api_9f81a7b2c4e5d6";
  const encrypted = encryptToken(sampleKey);
  const parts = encrypted.split(":");
  report(
    "Key Encrypted in IV:Tag:Ciphertext format",
    parts.length === 3 && encrypted !== sampleKey,
    `Ciphertext length: ${encrypted.length}`
  );

  const decrypted = decryptToken(encrypted);
  report("Decrypted Key Matches Original Exactly", decrypted === sampleKey, decrypted);

  // TEST 5: Real Workflow Synthesis from User Prompt
  console.log(`\n${YELLOW}5. Testing Natural Language Workflow Synthesis...${RESET}`);
  const userPrompt =
    "Create a workflow that watches Gmail for invoices, extracts invoice details using AI, saves them to Google Sheets and sends me a Telegram notification.";
  
  const { spec, explanation } = AutomationPlannerAgent.synthesizeWorkflowSpec({
    tenantId: "test_tenant",
    workspaceId: "ws_test",
    prompt: userPrompt,
  });

  report("Workflow spec generated with ID", Boolean(spec.id), spec.id);
  report("Trigger identified", Boolean(spec.trigger?.appId), spec.trigger.appId);
  report(
    "Steps planned count",
    spec.steps.length >= 3,
    `Planned steps: ${spec.steps.map((s) => s.appId).join(" -> ")}`
  );

  const validation = WorkflowCompiler.validate(spec);
  report("DAG validation passed (acyclic)", validation.isValid && validation.errors.length === 0);

  const compiledN8n = WorkflowCompiler.compileToN8n(spec);
  report("Compiled n8n nodes count", compiledN8n.nodes.length >= 4, `${compiledN8n.nodes.length} nodes`);
  report(
    "Connections map generated",
    Object.keys(compiledN8n.connections).length > 0,
    `${Object.keys(compiledN8n.connections).length} connected roots`
  );

  // TEST 6: Real Mock n8n HTTP API Server Dispatch
  console.log(`\n${YELLOW}6. Testing End-to-End n8n REST API Creation & Idempotency...${RESET}`);
  
  let receivedAuthHeader = "";
  let receivedIdempotency = "";
  let receivedPayload = null;

  const mockServer = http.createServer((req, res) => {
    receivedAuthHeader = req.headers["x-n8n-api-key"] || "";
    receivedIdempotency = req.headers["idempotency-key"] || "";

    if (req.method === "GET" && req.url === "/api/v1/workflows?limit=1") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "wf_existing_1", name: "Existing" }] }));
      return;
    }

    if (req.method === "POST" && req.url === "/api/v1/workflows") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedPayload = JSON.parse(body);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "wf_n8n_prod_4091",
            name: receivedPayload.name,
            active: false,
            createdAt: new Date().toISOString(),
          })
        );
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => mockServer.listen(0, "127.0.0.1", resolve));
  const port = mockServer.address().port;
  const mockBaseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test Connection Check
    const connTest = await N8nApiClient.testConnection(mockBaseUrl, "test_api_key_secret_88");
    report("testConnection verified against mock n8n server", connTest.ok, connTest.statusText);
    report("X-N8N-API-KEY transmitted", receivedAuthHeader === "test_api_key_secret_88");

    // Test Workflow Creation
    const creation = await N8nApiClient.createWorkflow(
      mockBaseUrl,
      "test_api_key_secret_88",
      compiledN8n,
      { idempotencyKey: "test_idem_990" }
    );

    report("createWorkflow returned real workflowId", creation.workflowId === "wf_n8n_prod_4091", creation.workflowId);
    report(
      "Returned editorUrl matches instance pattern",
      creation.editorUrl === `${mockBaseUrl}/workflow/wf_n8n_prod_4091`,
      creation.editorUrl
    );
    report("Created as inactive draft (active: false)", creation.active === false);
    report("Idempotency key forwarded in headers", receivedIdempotency === "test_idem_990");
    report("Workflow nodes and connections delivered in POST body", Boolean(receivedPayload?.nodes?.length));
  } finally {
    mockServer.close();
  }

  // Summary
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(` RESULTS: ${passedCount} / ${passedCount + failedCount} Assertions PASSED (${Math.round((passedCount / (passedCount + failedCount)) * 100)}%)`);
  console.log(`--------------------------------------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL Exception during verification:", err);
  process.exit(1);
});
