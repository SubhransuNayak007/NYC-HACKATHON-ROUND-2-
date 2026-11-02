# QuickReply AI Automation Operating System — API Contracts & Interface Specifications

**Document Version:** 2.0  
**Specification Format:** RESTful JSON & Server-Sent Events (SSE)  
**Authentication Scheme:** Bearer JWT / Secure HttpOnly Session Cookie  

---

## 1. Conversational AI Automation Studio API

### 1.1 `POST /api/ai/conversations`
**Description:** Initialize or fetch an active automation conversation thread.
- **Request Headers:**
  - `Content-Type: application/json`
  - `Cookie: qr_access_token=...`
- **Request Body:**
  ```json
  {
    "title": "Gmail Invoice to Sheets Automation"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "conversation": {
      "id": "conv_98fbc12",
      "tenantId": "org_quickreply",
      "workspaceId": "ws_default",
      "title": "Gmail Invoice to Sheets Automation",
      "createdAt": "2026-10-31T18:00:00.000Z"
    }
  }
  ```

### 1.2 `POST /api/ai/conversations/:id/messages` (SSE Streaming)
**Description:** Send a natural language message describing an automation requirement or answering a clarification question. Streams assistant reasoning tokens, requirements extracted, visual DAG updates, and approval prompts.
- **Request Body:**
  ```json
  {
    "content": "Every morning at 9 AM, check my Gmail for new invoices, extract vendor, amount, and due date, append to Google Sheets, and if amount > ₹50,000 notify me on Telegram."
  }
  ```
- **Stream Output Events (`text/event-stream`):**
  - `event: thinking` -> `{"stage": "EXTRACTING_REQUIREMENTS", "detail": "Parsing schedule, Gmail trigger, and sheet mappings..."}`
  - `event: token` -> `{"text": "I understand your automation goal. Here is the architecture I've designed for you..."}`
  - `event: workflow_spec` -> `{"spec": { ...WorkflowSpec v2.0... }}`
  - `event: clarification` (optional) -> `{"question": "Which Telegram chat or user ID should receive the alert?", "field": "telegramChatId"}`
  - `event: approval_card` (optional) -> `{"action": "telegram_alert", "riskScore": 0.35, "sideEffect": "EXTERNAL_COMMUNICATION"}`
  - `event: done` -> `{"messageId": "msg_001", "status": "COMPLETED"}`

---

## 2. Workflow Specification & Compilation API

### 2.1 `POST /api/workflows/compile`
**Description:** Compile a `WorkflowSpec v2.0` specification into a target runtime representation (n8n JSON, LangGraph agent, or Native DAG), performing AST validation, cycle detection, and parameter schema checks.
- **Request Body:**
  ```json
  {
    "spec": {
      "id": "wf_sample_01",
      "name": "Invoice Dispatcher",
      "runtimeTarget": "n8n",
      "trigger": {
        "type": "schedule",
        "appId": "clock",
        "config": { "cron": "0 9 * * *" }
      },
      "steps": [
        {
          "id": "step_gmail",
          "appId": "gmail",
          "actionId": "search_emails",
          "label": "Search Invoices",
          "credentialRef": "cred_gmail_user",
          "parameters": { "query": "subject:invoice has:attachment" },
          "dependsOn": [],
          "sideEffect": "SAFE_READ",
          "approvalRequired": false
        },
        {
          "id": "step_sheets",
          "appId": "google_sheets",
          "actionId": "append_row",
          "label": "Log Invoice Row",
          "credentialRef": "cred_sheets_user",
          "parameters": { "spreadsheetId": "sheet_123", "sheetName": "Invoices" },
          "dependsOn": ["step_gmail"],
          "sideEffect": "REVERSIBLE",
          "approvalRequired": false
        }
      ]
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "isValid": true,
    "runtimeTarget": "n8n",
    "compiledArtifact": {
      "nodes": [ ...n8n node objects with valid versions and parameters... ],
      "connections": { ...n8n connection graph... }
    },
    "syntheticTests": [
      { "testId": "test_01", "name": "Standard invoice parsing", "status": "READY" }
    ]
  }
  ```

### 2.2 `POST /api/workflows/:id/test`
**Description:** Execute a safe, sandboxed verification run of the compiled automation against mock or test data.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "testPassed": true,
    "durationMs": 142,
    "stepResults": [
      { "stepId": "step_gmail", "status": "SUCCESS", "mockOutput": { "count": 2 } },
      { "stepId": "step_sheets", "status": "SUCCESS", "mockOutput": { "rowsAppended": 2 } }
    ]
  }
  ```

### 2.3 `POST /api/workflows/:id/deploy`
**Description:** Deploy the tested and validated workflow into production after verifying credentials and authorizations.
- **Request Body:**
  ```json
  {
    "approvedBy": "admin@company.com",
    "active": true
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "deploymentId": "dep_45fa89",
    "version": 2,
    "status": "ACTIVE",
    "deployedAt": "2026-10-31T18:05:00.000Z"
  }
  ```

---

## 3. Human-in-the-Loop Approvals API

### 3.1 `GET /api/approvals`
**Description:** List pending execution approval requests awaiting human authorization.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "pendingCount": 1,
    "requests": [
      {
        "id": "appr_782bc",
        "executionId": "exec_8910",
        "workflowId": "wf_sample_01",
        "actionType": "telegram.send_message",
        "sideEffect": "EXTERNAL_COMMUNICATION",
        "riskScore": 0.45,
        "reason": "Alert threshold exceeded: invoice amount ₹75,000 > ₹50,000",
        "payloadPreview": {
          "recipient": "@FinanceLead",
          "message": "High-value invoice detected: ₹75,000 from Acme Corp"
        },
        "createdAt": "2026-10-31T18:05:12.000Z"
      }
    ]
  }
  ```

### 3.2 `POST /api/approvals/:id/decide`
**Description:** Approve or reject a pending side-effect action.
- **Request Body:**
  ```json
  {
    "decision": "APPROVED", // or "REJECTED"
    "reason": "Verified invoice with accounts manager"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "executionResumed": true,
    "executionId": "exec_8910",
    "status": "RUNNING"
  }
  ```

---

## 4. Execution Telemetry & Observability API

### 4.1 `GET /api/executions`
**Description:** Query real runtime execution history with status, duration, and error filters.
- **Query Parameters:** `workflowId`, `status`, `limit`, `offset`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "total": 1420,
    "executions": [
      {
        "id": "exec_8910",
        "workflowId": "wf_sample_01",
        "version": 2,
        "status": "COMPLETED",
        "startedAt": "2026-10-31T18:05:10.000Z",
        "completedAt": "2026-10-31T18:05:15.000Z",
        "latencyMs": 4850,
        "stepCount": 3,
        "error": null
      }
    ]
  }
  ```

### 4.2 `POST /api/executions/:id/retry`
**Description:** Re-execute a failed workflow execution from the point of failure using cached idempotency context.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "newExecutionId": "exec_8911",
    "resumedFromStep": "step_telegram"
  }
  ```