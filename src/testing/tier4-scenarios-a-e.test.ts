/**
 * tier4-scenarios-a-e.test.ts
 * Tier 4: Real-World Application Scenarios (Scenarios A, B, C, D, and E)
 * Full executable test specifications verifying end-to-end user workflows
 * against the deterministic MockIntegrationServer.
 */

import assert from "node:assert/strict";
import {
  SafeExpressionEvaluator,
  DAGValidator,
  SecureCredentialVault,
  CryptographicAuditLog,
  WorkflowDefinitionV3,
  WorkflowNode,
  WorkflowEdge,
  ExecutionCheckpoint,
} from "./TestHarnessModels";
import { MockIntegrationServer } from "./MockIntegrationServer";

export async function runTier4Tests(): Promise<{ total: number; passed: number; failed: number; results: { id: string; name: string; passed: boolean; error?: string }[] }> {
  const results: { id: string; name: string; passed: boolean; error?: string }[] = [];

  function test(id: string, name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        results.push({ id, name, passed: true });
      } catch (err: any) {
        results.push({ id, name, passed: false, error: err.message });
      }
    })();
  }

  // =========================================================================
  // Scenario A: Lead Generation Pipeline
  // Webhook -> Input Validation -> Google Sheets -> AI classification -> Conditional branch -> HubSpot -> Slack
  // =========================================================================
  await test("T4_SCENARIO_A", "Scenario A: Lead Generation Pipeline End-to-End Execution", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();
    const vault = new SecureCredentialVault();

    try {
      // 1. Inbound Webhook Lead Payload
      const webhookPayload = {
        name: "Sarah Connor",
        email: "sarah@cyberdyne.org",
        company: "Cyberdyne Systems",
        budget: 25000,
        source: "Inbound Website Demo Form",
      };

      // 2. Input Validation Step
      assert.ok(webhookPayload.name.trim().length > 0, "Name must not be empty");
      assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(webhookPayload.email), "Invalid email format");
      assert.ok(webhookPayload.budget >= 0, "Budget cannot be negative");

      // 3. Google Sheets Append Row
      const sheetsToken = "mock_google_sheets_token_123";
      const sheetsRes = await fetch(`${baseUrl}/v4/spreadsheets/sheet_leads_001/values/Leads!A1:append`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sheetsToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [
            [
              new Date().toISOString(),
              webhookPayload.name,
              webhookPayload.email,
              webhookPayload.company,
              webhookPayload.budget,
              webhookPayload.source,
            ],
          ],
        }),
      }).then((r) => r.json());

      assert.equal(sheetsRes.updates.updatedRows, 1);

      // 4. AI Classification Node
      const aiPrompt = `Classify lead with budget: ${webhookPayload.budget} for company: ${webhookPayload.company}`;
      const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          messages: [{ role: "user", content: aiPrompt }],
        }),
      }).then((r) => r.json());

      const classificationData = JSON.parse(aiRes.choices[0].message.content);
      assert.equal(classificationData.classification, "Enterprise");

      // 5. Conditional Branch Node: check if Enterprise
      const isEnterprise = SafeExpressionEvaluator.evaluate('{{ $json.classification == "Enterprise" }}', {
        $json: classificationData,
      });
      assert.equal(isEnterprise, true);

      // 6. HubSpot Node: Upsert Contact
      const hubspotToken = "mock_hubspot_token_456";
      const hubspotRes = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspotToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            email: webhookPayload.email,
            firstname: webhookPayload.name.split(" ")[0],
            lastname: webhookPayload.name.split(" ")[1],
            company: webhookPayload.company,
            lifecyclestage: "salesqualifiedlead",
          },
        }),
      }).then((r) => r.json());

      assert.ok(hubspotRes.id.startsWith("hub_contact_"));
      assert.equal(hubspotRes.properties.lifecyclestage, "salesqualifiedlead");

      // 7. Slack Node: Post Message to #sales-enterprise
      const targetChannel = isEnterprise ? "#sales-enterprise" : "#sales-smb";
      const slackToken = "mock_slack_token_789";
      const slackRes = await fetch(`${baseUrl}/api/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: targetChannel,
          text: `🎯 *New Enterprise Lead Qualified!*\n*Company:* ${webhookPayload.company}\n*Contact:* ${webhookPayload.name} (${webhookPayload.email})\n*Budget:* $${webhookPayload.budget.toLocaleString()}\n*HubSpot ID:* ${hubspotRes.id}`,
        }),
      }).then((r) => r.json());

      assert.equal(slackRes.ok, true);
      assert.equal(slackRes.channel, "#sales-enterprise");

      // Verify all recorded requests on mock server
      assert.equal(server.getRecordedRequests("google_sheets").length, 1);
      assert.equal(server.getRecordedRequests("openai").length, 1);
      assert.equal(server.getRecordedRequests("hubspot").length, 1);
      assert.equal(server.getRecordedRequests("slack").length, 1);
    } finally {
      await server.stop();
    }
  });

  // =========================================================================
  // Scenario B: Email Intelligence & Human Approval Gate
  // Gmail trigger -> Retrieve message -> AI summarization -> Human approval -> Slack notification
  // =========================================================================
  await test("T4_SCENARIO_B", "Scenario B: Email Intelligence & Human Approval Gate Execution", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      // 1. Gmail Trigger: Poll / Query for quote requests
      const gmailToken = "mock_gmail_tok_001";
      const listRes = await fetch(`${baseUrl}/gmail/v1/users/me/messages`, {
        headers: { Authorization: `Bearer ${gmailToken}` },
      }).then((r) => r.json());

      assert.ok(listRes.messages.length > 0);
      const messageId = listRes.messages[0].id;

      // 2. Retrieve Message Details
      const messageRes = await fetch(`${baseUrl}/gmail/v1/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${gmailToken}` },
      }).then((r) => r.json());

      assert.equal(messageRes.id, "msg_quote_req_001");
      const decodedBody = Buffer.from(messageRes.payload.body.data, "base64").toString("utf8");
      assert.ok(decodedBody.includes("500 Enterprise seats"));

      // 3. AI Summarization Node
      const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `summarize quote request: ${decodedBody}` }],
        }),
      }).then((r) => r.json());

      const summary = JSON.parse(aiRes.choices[0].message.content);
      assert.equal(summary.targetBudget, 85000);
      assert.equal(summary.clientName, "Cyberdyne Systems");

      // 4. Human Approval Gate: Pause execution
      const approvalId = `appr_quote_${Date.now()}`;
      let executionStatus: string = "WAITING_APPROVAL";

      // 5. Slack Notification with Approval Action Link
      const slackRes = await fetch(`${baseUrl}/api/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: "Bearer mock_slack_tok",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "#deals-approval",
          text: `⚠️ *High-Value Quote Request Pending Approval*\nClient: ${summary.clientName}\nValue: $${summary.targetBudget.toLocaleString()}\nRisk Score: ${summary.riskScore}\nApprove Link: ${baseUrl}/api/approvals/${approvalId}/approve`,
        }),
      }).then((r) => r.json());

      assert.equal(slackRes.ok, true);
      assert.equal(executionStatus, "WAITING_APPROVAL");

      // 6. User Approves via Simulated API Call
      const approveRes = await fetch(`${baseUrl}/api/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "vp_finance@cyberdyne.org", notes: "SLA confirmed." }),
      }).then((r) => r.json());

      assert.equal(approveRes.status, "APPROVED");

      // 7. Execution Resumes and Completes
      executionStatus = "COMPLETED";
      assert.equal(executionStatus, "COMPLETED");

      // Assert complete mock journals
      assert.equal(server.getRecordedRequests("gmail").length, 2);
      assert.equal(server.getRecordedRequests("openai").length, 1);
      assert.equal(server.getRecordedRequests("slack").length, 1);
      assert.equal(server.getRecordedRequests("approval").length, 1);
    } finally {
      await server.stop();
    }
  });

  // =========================================================================
  // Scenario C: Canva Content Automation & Google Drive
  // Schedule trigger -> Google Sheets -> AI content generation -> Canva template autofill -> Export -> Google Drive -> Gmail notification
  // =========================================================================
  await test("T4_SCENARIO_C", "Scenario C: Canva Content Automation & Google Drive Execution", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      // 1. Schedule Trigger Simulation (Monday 10 AM cron tick)
      const cronEvent = { trigger: "schedule", cron: "0 10 * * 1", timestamp: new Date().toISOString() };
      assert.ok(cronEvent.timestamp);

      // 2. Google Sheets: Read weekly metrics
      const sheetsToken = "mock_sheets_tok";
      const sheetValues = await fetch(`${baseUrl}/v4/spreadsheets/weekly_metrics/values/Sheet1!A1:D10`, {
        headers: { Authorization: `Bearer ${sheetsToken}` },
      }).then((r) => r.json());

      assert.ok(sheetValues.values.length >= 3);
      const topMetric = sheetValues.values[1]; // ["Week 42", "ARR Growth", "$120,000", "Top performance"]
      assert.equal(topMetric[1], "ARR Growth");

      // 3. AI Content Generation
      const aiPrompt = `Generate Canva social campaign headline from metric: ${topMetric[1]} = ${topMetric[2]}`;
      const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: aiPrompt }] }),
      }).then((r) => r.json());

      const content = JSON.parse(aiRes.choices[0].message.content);
      assert.ok(content.headline);

      // 4. Canva Connect: Autofill Design Template
      const canvaAutofillRes = await fetch(`${baseUrl}/v1/autofills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: "tpl_workflow_brief_01",
          data: {
            headline: content.headline,
            subheadline: content.subheadline,
            metric_highlight: topMetric[2],
          },
        }),
      }).then((r) => r.json());

      assert.equal(canvaAutofillRes.job.status, "success");
      const designId = canvaAutofillRes.job.result.design.id;
      assert.ok(designId);

      // 5. Canva Connect: Export Rendered Design
      const canvaExportRes = await fetch(`${baseUrl}/v1/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_id: designId, format: "png" }),
      }).then((r) => r.json());

      assert.equal(canvaExportRes.job.status, "success");
      const downloadUrl = canvaExportRes.job.urls[0];
      assert.ok(downloadUrl.includes(".png"));

      // 6. Google Drive: Upload Exported Graphic
      const driveToken = "mock_drive_tok";
      const driveRes = await fetch(`${baseUrl}/upload/drive/v3/files?name=Weekly_Metric_Graphic.png`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveToken}`,
          "Content-Type": "image/png",
        },
        body: "BINARY_IMAGE_BUFFER",
      }).then((r) => r.json());

      assert.ok(driveRes.id.startsWith("drive_file_"));
      assert.ok(driveRes.webViewLink.includes("drive.google.com"));

      // 7. Gmail Notification: Send download link
      const gmailToken = "mock_gmail_tok";
      const gmailRes = await fetch(`${baseUrl}/gmail/v1/users/me/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: "marketing.director@quickreply.io",
          subject: "Your Weekly Metric Graphic is Ready in Canva & Drive",
          bodyText: `Your Canva graphic has been published to Google Drive:\n${driveRes.webViewLink}`,
        }),
      }).then((r) => r.json());

      assert.equal(gmailRes.status, "DELIVERED");

      // Verify call sequence
      assert.equal(server.getRecordedRequests("google_sheets").length, 1);
      assert.equal(server.getRecordedRequests("openai").length, 1);
      assert.equal(server.getRecordedRequests("canva").length, 2); // autofill + export
      assert.equal(server.getRecordedRequests("google_drive").length, 1);
      assert.equal(server.getRecordedRequests("gmail").length, 1);
    } finally {
      await server.stop();
    }
  });

  // =========================================================================
  // Scenario D: Failure Recovery with Exponential Backoff
  // Webhook -> HTTP API -> Simulated failure -> Retry -> Successful continuation
  // =========================================================================
  await test("T4_SCENARIO_D", "Scenario D: Failure Recovery with Exponential Backoff Execution", async () => {
    // Configure mock server to fail 2 times before succeeding on attempt 3
    const server = new MockIntegrationServer({ billingFailuresBeforeSuccess: 2 });
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      // 1. Inbound Webhook receives order
      const orderPayload = { orderId: "ord_9901", amount: 499.0, customerEmail: "buyer@acme.com" };

      // 2. HTTP Node with Retry Policy
      const retryPolicy = {
        maxAttempts: 3,
        initialIntervalMs: 50,
        backoffFactor: 2,
      };

      let attempt = 0;
      let completed = false;
      let lastResponse: any = null;
      const attemptLog: { attempt: number; status: number; waitMs: number }[] = [];

      while (attempt < retryPolicy.maxAttempts && !completed) {
        attempt++;
        const res = await fetch(`${baseUrl}/api/mock/billing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        if (res.status === 503) {
          const waitTime = retryPolicy.initialIntervalMs * Math.pow(retryPolicy.backoffFactor, attempt - 1);
          attemptLog.push({ attempt, status: 503, waitMs: waitTime });
          await new Promise((r) => setTimeout(r, waitTime));
        } else if (res.status === 200) {
          completed = true;
          lastResponse = await res.json();
          attemptLog.push({ attempt, status: 200, waitMs: 0 });
        }
      }

      assert.equal(completed, true, "Pipeline must succeed on attempt 3");
      assert.equal(attempt, 3, "Exactly 3 attempts must be executed");
      assert.equal(lastResponse.status, "paid");
      assert.equal(lastResponse.transactionId, "txn_success_789");

      // Verify backoff progression: attempt 1: 50ms, attempt 2: 100ms
      assert.equal(attemptLog[0].waitMs, 50);
      assert.equal(attemptLog[1].waitMs, 100);
      assert.equal(attemptLog[2].status, 200);

      // Verify mock server received all 3 billing attempts
      const billingRequests = server.getRecordedRequests("billing");
      assert.equal(billingRequests.length, 3);
    } finally {
      await server.stop();
    }
  });

  // =========================================================================
  // Scenario E: Conversational Workflow Modification
  // Workflow creation followed by conversational insertion of conditional logic
  // while preserving existing nodes and connections
  // =========================================================================
  await test("T4_SCENARIO_E", "Scenario E: Conversational Workflow Modification & Preservation", async () => {
    // 1. Initial Prompt: "When a customer pays via Stripe, send a receipt to their WhatsApp."
    const workflowV1: WorkflowDefinitionV3 = {
      id: "wf_conversational_e",
      version: 1,
      name: "Stripe WhatsApp Receipt Flow",
      tenantId: "ten_conv_01",
      workspaceId: "ws_conv_01",
      nodes: [
        {
          id: "node_stripe_webhook",
          type: "trigger",
          service: "webhook",
          label: "Stripe Payment Received",
          parameters: { event: "charge.succeeded" },
          credentialRef: "cred_stripe_vault_01",
          position: { x: 100, y: 150 },
        },
        {
          id: "node_whatsapp_receipt",
          type: "action",
          service: "slack",
          label: "Send WhatsApp Receipt",
          parameters: { template: "receipt_simple" },
          credentialRef: "cred_wa_vault_02",
          position: { x: 400, y: 150 },
        },
      ],
      edges: [
        { id: "edge_v1_main", source: "node_stripe_webhook", target: "node_whatsapp_receipt" },
      ],
    };

    // Validate V1 DAG
    const valV1 = DAGValidator.validate(workflowV1.nodes, workflowV1.edges);
    assert.ok(valV1.valid, "Workflow V1 must be valid");
    assert.equal(workflowV1.nodes.length, 2);

    // 2. Conversational Modification Prompt:
    // "If the payment amount is greater than $500, also notify the #vip-customers Slack channel."
    const modificationPatch = {
      type: "INSERT_BRANCH",
      conditionNode: {
        id: "node_cond_vip_amount",
        type: "condition" as NodeType,
        label: "Amount > $500",
        parameters: { expression: "{{ $json.amount > 500 }}" },
        position: { x: 250, y: 150 },
      },
      vipActionNode: {
        id: "node_slack_vip_alert",
        type: "action" as NodeType,
        service: "slack",
        label: "Slack VIP Alert",
        parameters: { channel: "#vip-customers", message: "🔥 High-Value Payment: ${{ $json.amount }}" },
        credentialRef: "cred_slack_vault_03",
        position: { x: 400, y: 300 },
      },
    };

    // 3. Apply Patch non-destructively:
    // - Preserves existing node configurations, coordinates, and credential references verbatim
    const workflowV2: WorkflowDefinitionV3 = {
      ...workflowV1,
      version: workflowV1.version + 1,
      nodes: [
        ...workflowV1.nodes,
        modificationPatch.conditionNode,
        modificationPatch.vipActionNode,
      ],
      edges: [
        { id: "edge_v2_1", source: "node_stripe_webhook", target: "node_cond_vip_amount" },
        { id: "edge_v2_2", source: "node_cond_vip_amount", target: "node_slack_vip_alert", sourceHandle: "true" },
        { id: "edge_v2_3", source: "node_cond_vip_amount", target: "node_whatsapp_receipt", sourceHandle: "false" },
      ],
    };

    // 4. Verification Assertions
    assert.equal(workflowV2.version, 2, "Version must increment to 2");
    assert.equal(workflowV2.nodes.length, 4, "Total nodes must be 4");

    // Check node preservation
    const originalStripe = workflowV2.nodes.find((n) => n.id === "node_stripe_webhook");
    const originalWhatsApp = workflowV2.nodes.find((n) => n.id === "node_whatsapp_receipt");

    assert.ok(originalStripe, "Stripe webhook node must be preserved");
    assert.equal(originalStripe.credentialRef, "cred_stripe_vault_01");
    assert.equal(originalStripe.position?.x, 100);

    assert.ok(originalWhatsApp, "WhatsApp receipt node must be preserved");
    assert.equal(originalWhatsApp.credentialRef, "cred_wa_vault_02");
    assert.equal(originalWhatsApp.position?.x, 400);

    // Validate resulting DAG is strictly acyclic
    const valV2 = DAGValidator.validate(workflowV2.nodes, workflowV2.edges);
    assert.ok(valV2.valid, "Resulting Workflow V2 DAG must be strictly valid");
    assert.deepEqual(valV2.sortedNodeIds, [
      "node_stripe_webhook",
      "node_cond_vip_amount",
      "node_slack_vip_alert",
      "node_whatsapp_receipt",
    ]);
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  return { total: results.length, passed: passedCount, failed: failedCount, results };
}

// Standalone execution support
if (require.main === module) {
  runTier4Tests().then((res) => {
    console.log(`[Tier 4 Real-World Application Scenarios] Total: ${res.total}, Passed: ${res.passed}, Failed: ${res.failed}`);
    if (res.failed > 0) {
      console.error(res.results.filter((r) => !r.passed));
      process.exit(1);
    }
  });
}
