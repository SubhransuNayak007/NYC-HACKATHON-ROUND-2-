# QuickReply Platform REST & Real-Time API Specification

**Document Version:** 3.0.0  
**Specification Standard:** OpenAPI 3.1 Aligned  
**Classification:** Canonical Public & SaaS API Reference  
**Base URL:** `https://app.quickreply.ai` (or `http://localhost:3000` for local runtime)  
**Last Updated:** 2026-11-01  

---

## 1. Global Conventions & Authentication

### 1.1 Headers
All authenticated API requests must include:
- `Authorization: Bearer <JWT_SESSION_TOKEN>` OR session cookie (`qr_session=<HMAC_SESSION_COOKIE>`).
- `X-Workspace-Id: ws_<uuidv4>`: Active workspace context.
- `Content-Type: application/json`: For POST, PUT, and PATCH endpoints.

### 1.2 Error Response Format
All errors return a standardized JSON error object:

```json
{
  "error": {
    "code": "CYCLE_DETECTED_ERROR",
    "message": "Circular dependency detected between nodes 'step_1' and 'step_3'",
    "statusCode": 422,
    "details": {
      "cyclePath": ["step_1", "step_2", "step_3", "step_1"]
    },
    "timestamp": "2026-11-01T08:30:00Z"
  }
}
```

---

## 2. Conversational AI Builder Endpoints

### 2.1 `POST /api/ai/conversations`
Initializes a new automation planning conversation thread.

- **Request Body**:
  ```json
  {
    "title": "Lead Intake & CRM Pipeline",
    "workspaceId": "ws_enterprise_growth_01"
  }
  ```
- **Response (HTTP 201)**:
  ```json
  {
    "conversationId": "conv_a94f83b2",
    "title": "Lead Intake & CRM Pipeline",
    "status": "ACTIVE",
    "createdAt": "2026-11-01T08:00:00Z"
  }
  ```

---

### 2.2 `POST /api/ai/conversations/[id]/messages`
Submits a natural-language automation prompt to the AI Planner Agent.

- **Request Body**:
  ```json
  {
    "message": "When a customer submits a contact form via webhook, validate their email, append them to Google Sheets, classify with Claude, and if budget > 50000 create a HubSpot deal, else alert Slack.",
    "currentWorkflow": null
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "replyText": "I've structured a 5-step automation pipeline. When a lead is received, it normalizes the email, logs to Google Sheets, scores with Claude 3.5 Sonnet, and conditionally routes to HubSpot or Slack.",
    "intent": "CREATE_WORKFLOW",
    "fullWorkflow": {
      "schemaVersion": "3.0.0",
      "id": "wf_lead_gen_001",
      "version": 1,
      "nodes": [...],
      "edges": [...]
    },
    "clarificationRequests": [
      {
        "type": "PARAMETER",
        "appId": "google_sheets",
        "parameterName": "spreadsheetId",
        "question": "Which Google Spreadsheet should lead rows be appended to?",
        "suggestionChips": ["Create New Sheet", "Leads 2026", "Customer Inbound"]
      }
    ]
  }
  ```

---

## 3. Workflow Management & Compilation Endpoints

### 3.1 `POST /api/workflows/compile`
Validates graph integrity (DFS cycle detection) and compiles `WorkflowDefinitionV3` into target formats (n8n JSON, Native DAG, LangGraph).

- **Request Body**:
  ```json
  {
    "workflow": { "$ref": "#/components/schemas/WorkflowDefinitionV3" },
    "targetFormat": "all"
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "valid": true,
    "compiled": {
      "native": { "nodesCount": 6, "edgesCount": 5 },
      "n8n": {
        "nodes": [{ "parameters": {}, "name": "Webhook", "type": "n8n-nodes-base.webhook" }],
        "connections": {}
      },
      "langGraph": { "nodes": [], "edges": [] }
    }
  }
  ```
- **Error (HTTP 422)**:
  ```json
  {
    "valid": false,
    "error": "Acyclic validation failed: circular loop detected between step_2 and step_4"
  }
  ```

---

### 3.2 `POST /api/workflows/[id]/test`
Executes an isolated dry-run test with synthetic assertions.

- **Request Body**:
  ```json
  {
    "testInput": {
      "email": "sarah@acme.com",
      "company": "Acme Corp",
      "budget": 75000
    },
    "expectedAssertions": [
      { "path": "step_ai_classify.output.dealTier", "operator": "equals", "value": "ENTERPRISE" }
    ]
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "status": "PASSED",
    "executionTimeMs": 284,
    "stepResults": [
      { "nodeId": "step_trigger", "status": "SUCCESS", "durationMs": 12 },
      { "nodeId": "step_validate", "status": "SUCCESS", "durationMs": 8 },
      { "nodeId": "step_ai_classify", "status": "SUCCESS", "durationMs": 264 }
    ],
    "assertions": [
      { "assertion": "dealTier equals ENTERPRISE", "passed": true, "observed": "ENTERPRISE" }
    ]
  }
  ```

---

### 3.3 `POST /api/workflows/[id]/deploy`
Deploys the workflow to active production runtime.

- **Request Body**:
  ```json
  {
    "runtimeTarget": "native",
    "version": 1
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "deploymentId": "dep_prod_9921",
    "status": "ACTIVE",
    "webhookUrl": "https://app.quickreply.ai/api/webhooks/automation/leads_prod_01",
    "activeSince": "2026-11-01T08:15:00Z"
  }
  ```

---

## 4. Execution Monitoring & Real-Time Streaming

### 4.1 `POST /api/workflows/[id]/execute`
Manually triggers an execution run of the workflow.

- **Request Body**:
  ```json
  {
    "triggerPayload": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Response (HTTP 202 Accepted)**:
  ```json
  {
    "executionId": "exec_94a08b3c",
    "status": "QUEUED",
    "queuedAt": "2026-11-01T08:20:00Z",
    "streamUrl": "/api/workflows/executions/exec_94a08b3c/stream"
  }
  ```

---

### 4.2 `GET /api/workflows/executions/[id]/stream` (SSE)
Real-time Server-Sent Events stream delivering live node-level execution transitions.

- **Response Headers**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Stream Output**:
  ```
  event: execution.started
  data: {"executionId":"exec_94a08b3c","startedAt":"2026-11-01T08:20:01Z"}

  event: node.started
  data: {"nodeId":"step_1","nodeType":"triggerNode","startedAt":"2026-11-01T08:20:01.100Z"}

  event: node.completed
  data: {"nodeId":"step_1","status":"SUCCESS","durationMs":14,"output":{"received":true}}

  event: node.started
  data: {"nodeId":"step_2","nodeType":"actionNode","startedAt":"2026-11-01T08:20:01.120Z"}

  event: node.completed
  data: {"nodeId":"step_2","status":"SUCCESS","durationMs":112,"output":{"updatedRange":"A2:E2"}}

  event: execution.completed
  data: {"executionId":"exec_94a08b3c","status":"COMPLETED","durationMs":340}
  ```

---

### 4.3 `POST /api/workflows/executions/[id]/diagnose`
Invokes the AI Debugging Assistant on failed execution runs.

- **Response (HTTP 200)**:
  ```json
  {
    "rootCause": "Google Sheets API returned 404: Spreadsheet ID '1Bxi...fake' was not found or permissions are missing.",
    "affectedNodeId": "step_append_sheets",
    "classification": "REMOTE_API_ERROR",
    "remediationSteps": [
      "Verify the spreadsheet ID exists in Google Drive",
      "Ensure service account or OAuth account has 'Editor' permissions on the sheet"
    ],
    "suggestedPatch": {
      "nodeId": "step_append_sheets",
      "parameterPath": "spreadsheetId",
      "correctedValue": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
    }
  }
  ```

---

## 5. Human-in-the-Loop Approvals

### 5.1 `GET /api/approvals`
Lists pending approval requests for the workspace.

- **Response (HTTP 200)**:
  ```json
  {
    "approvals": [
      {
        "id": "appr_99b01",
        "executionId": "exec_94a08b3c",
        "workflowName": "Lead Intake & CRM",
        "nodeName": "Charge Customer Card",
        "riskLevel": "FINANCIAL",
        "proposedPayload": {
          "amount": 75000,
          "currency": "usd"
        },
        "createdAt": "2026-11-01T08:25:00Z"
      }
    ]
  }
  ```

---

### 5.2 `POST /api/approvals/[id]/approve`
Approves the action, unblocking the execution fiber.

- **Request Body**:
  ```json
  { "decisionNotes": "Approved by Sales VP" }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "id": "appr_99b01",
    "status": "APPROVED",
    "resumedExecutionId": "exec_94a08b3c"
  }
  ```

---

## 6. Credential Vault Endpoints

### 6.1 `GET /api/credentials`
Lists all credentials connected to the workspace with secrets redacted.

- **Response (HTTP 200)**:
  ```json
  {
    "credentials": [
      {
        "id": "cred_google_workspace_01",
        "appId": "google_sheets",
        "accountLabel": "Acme Marketing Workspace",
        "authType": "oauth2",
        "status": "ACTIVE",
        "expiresAt": "2026-11-01T09:30:00Z"
      }
    ]
  }
  ```

---

### 6.2 `POST /api/credentials`
Stores encrypted API key or token credentials.

- **Request Body**:
  ```json
  {
    "appId": "anthropic",
    "accountLabel": "Production Claude 3.5 Key",
    "authType": "api_key",
    "secretData": {
      "apiKey": "sk-ant-api03-samplekey"
    }
  }
  ```
- **Response (HTTP 201)**:
  ```json
  {
    "id": "cred_anthropic_prod_01",
    "appId": "anthropic",
    "accountLabel": "Production Claude 3.5 Key",
    "status": "ACTIVE"
  }
  ```

---

## 7. Showcase & Canva Connect API Endpoints

### 7.1 `POST /api/showcase/export`
Generates multi-format architecture export files.

- **Request Body**:
  ```json
  {
    "workflowId": "wf_lead_gen_001",
    "format": "pdf"
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "format": "pdf",
    "downloadUrl": "https://app.quickreply.ai/downloads/briefs/wf_lead_gen_001.pdf",
    "fileSizeBytes": 248102
  }
  ```

---

### 7.2 `POST /api/showcase/canva/export`
Populates an authorized Canva Brand Template and exports rendered designs.

- **Request Body**:
  ```json
  {
    "workflowId": "wf_lead_gen_001",
    "brandTemplateId": "DAF_WeeklySpotlightTemplate",
    "exportFormat": "pdf"
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "status": "completed",
    "canvaDesignId": "design_mock_77",
    "downloadUrl": "https://export.canva.com/designs/design_mock_77/render.pdf"
  }
  ```
