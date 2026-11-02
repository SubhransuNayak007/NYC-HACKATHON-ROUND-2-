# QuickReply Canonical Workflow Schema Specification (`WorkflowDefinitionV3`)

**Document Version:** 3.0.0  
**Specification Standard:** JSON Schema Draft 2020-12 / TypeScript 5.x  
**Classification:** Core Execution Definition Standard  
**Last Updated:** 2026-11-01  

---

## 1. Specification Overview

`WorkflowDefinitionV3` is the canonical, platform-agnostic declarative workflow definition format for QuickReply. It serves as:
1. **The Source of Truth** for the `@xyflow/react` interactive visual canvas.
2. **The Executable AST** for the Durable Execution Engine (DEE).
3. **The Target Representation** compiled by the Conversational AI Builder and mutated by the AST Graph Patch Engine.
4. **The Interoperability Bridge** capable of being compiled to or exported as n8n JSON workflows or LangGraph state graphs.

---

## 2. Formal JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://quickreply.ai/schemas/workflow-definition-v3.json",
  "title": "WorkflowDefinitionV3",
  "description": "Canonical executable workflow definition schema for QuickReply",
  "type": "object",
  "required": [
    "schemaVersion",
    "id",
    "tenantId",
    "workspaceId",
    "name",
    "version",
    "status",
    "triggers",
    "nodes",
    "edges"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "3.0.0"
    },
    "id": {
      "type": "string",
      "pattern": "^wf_[a-f0-9\\-]+$"
    },
    "tenantId": {
      "type": "string",
      "pattern": "^tenant_[a-f0-9]+$"
    },
    "workspaceId": {
      "type": "string",
      "pattern": "^ws_[a-f0-9\\-]+$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    },
    "description": {
      "type": "string",
      "maxLength": 1024
    },
    "version": {
      "type": "integer",
      "minimum": 1
    },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]
    },
    "runtimeTarget": {
      "type": "string",
      "enum": ["native", "n8n", "langgraph"],
      "default": "native"
    },
    "viewport": {
      "type": "object",
      "properties": {
        "x": { "type": "number" },
        "y": { "type": "number" },
        "zoom": { "type": "number", "minimum": 0.1, "maximum": 2.0 }
      }
    },
    "triggers": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/triggerDefinition" }
    },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/nodeDefinition" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/$defs/edgeDefinition" }
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "createdBy": { "type": "string" }
  },
  "$defs": {
    "triggerDefinition": {
      "type": "object",
      "required": ["id", "type", "appId", "config"],
      "properties": {
        "id": { "type": "string", "pattern": "^trg_[a-f0-9\\-]+$" },
        "type": { "type": "string", "enum": ["webhook", "cron", "manual", "event"] },
        "appId": { "type": "string" },
        "config": {
          "type": "object",
          "properties": {
            "cronExpression": { "type": "string" },
            "timezone": { "type": "string" },
            "webhookPath": { "type": "string" },
            "webhookMethod": { "type": "string", "enum": ["POST", "GET"] },
            "signatureSecretRef": { "type": "string", "pattern": "^cred_[a-f0-9\\-]+$" },
            "filterEvent": { "type": "string" }
          }
        }
      }
    },
    "nodeDefinition": {
      "type": "object",
      "required": ["id", "type", "name", "appId", "actionId", "parameters", "position"],
      "properties": {
        "id": { "type": "string", "pattern": "^step_[a-f0-9\\-]+$" },
        "type": {
          "type": "string",
          "enum": ["triggerNode", "actionNode", "conditionNode", "loopNode", "aiNode", "customScriptNode"]
        },
        "name": { "type": "string", "minLength": 1 },
        "appId": { "type": "string" },
        "actionId": { "type": "string" },
        "credentialRef": { "type": "string", "pattern": "^cred_[a-f0-9\\-]+$" },
        "parameters": { "type": "object" },
        "position": {
          "type": "object",
          "required": ["x", "y"],
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" }
          }
        },
        "policies": {
          "type": "object",
          "properties": {
            "retryPolicy": {
              "type": "object",
              "properties": {
                "maxAttempts": { "type": "integer", "minimum": 1, "maximum": 10, "default": 3 },
                "initialIntervalMs": { "type": "integer", "minimum": 100, "default": 1000 },
                "maxIntervalMs": { "type": "integer", "default": 60000 },
                "backoffMultiplier": { "type": "number", "minimum": 1.0, "default": 2.0 }
              }
            },
            "timeoutMs": { "type": "integer", "minimum": 500, "maximum": 300000, "default": 30000 },
            "requiresApproval": { "type": "boolean", "default": false },
            "approvalCondition": { "type": "string" },
            "riskLevel": {
              "type": "string",
              "enum": ["SAFE_READ", "REVERSIBLE", "EXTERNAL_COMMUNICATION", "FINANCIAL", "DESTRUCTIVE"],
              "default": "SAFE_READ"
            }
          }
        }
      }
    },
    "edgeDefinition": {
      "type": "object",
      "required": ["id", "source", "target"],
      "properties": {
        "id": { "type": "string", "pattern": "^edge_[a-f0-9\\-]+$" },
        "source": { "type": "string" },
        "target": { "type": "string" },
        "sourceHandle": {
          "type": "string",
          "enum": ["source", "true", "false", "loop_body", "completed"],
          "default": "source"
        },
        "targetHandle": {
          "type": "string",
          "default": "target"
        },
        "label": { "type": "string" },
        "conditionExpression": { "type": "string" }
      }
    }
  }
}
```

---

## 3. Node Specification & Semantics

### 3.1 Node Types Reference

| Node Type | Category | Inbound Port | Outbound Ports | Typical Usage |
|---|---|:---:|---|---|
| `triggerNode` | Ingestion | None | `source` | Webhook receiver, Cron scheduler, App event ingest |
| `actionNode` | Integration | `target` | `source` | Google Sheets append, Slack post, HubSpot upsert |
| `conditionNode` | Logic | `target` | `true`, `false` | Threshold filter (e.g. `amount > 50000`), Lead tiering |
| `loopNode` | Flow Control | `target` | `loop_body`, `completed` | Batch array iterator with safety bound (`max: 1000`) |
| `aiNode` | Cognitive | `target` | `source` | Claude / GPT extraction, classification, summarization |
| `customScriptNode` | Transform | `target` | `source` | Sandboxed JavaScript data normalization (64MB/2s) |

### 3.2 Ports & Handle Protocol
Connections between nodes adhere to deterministic handle rules:
1. **Single Entry Handle**: Every non-trigger node has exactly one primary target handle (`target`).
2. **Handle Types**:
   - `source`: Default output handle for sequential execution.
   - `true`: Active when `ConditionNode` expression evaluates truthy.
   - `false`: Active when `ConditionNode` expression evaluates falsy.
   - `loop_body`: Outflow executed for each item in the array collection.
   - `completed`: Outflow executed once all loop iterations have finished.
3. **Dead Branch Elimination**: When a `ConditionNode` chooses the `true` handle, the `false` handle emits a `SKIPPED` signal. Downstream nodes connected exclusively to skipped handles are skipped automatically without execution or error.

---

## 4. Execution Policies Reference

### 4.1 Retry Policy Specification
Configured in `node.policies.retryPolicy`:
- **Algorithm**: Exponential backoff with random uniform jitter:
  $$T_{\text{wait}} = \min(T_{\text{max}}, T_{\text{initial}} \times 2^{\text{attempt}} + \text{random}(0, \text{jitterMs}))$$
- **Defaults**:
  - `maxAttempts`: 3
  - `initialIntervalMs`: 1,000ms
  - `maxIntervalMs`: 60,000ms
  - `backoffMultiplier`: 2.0
  - `jitterMs`: 500ms
- **Retryable Conditions**: Network timeout, HTTP 429 (Rate Limit), HTTP 500, 502, 503, 504.

### 4.2 Timeout Policy Specification
Configured in `node.policies.timeoutMs`:
- **Default**: 30,000ms (30 seconds)
- **Script Sandbox Timeout**: Hard timeout of 2,000ms enforced via worker thread cancellation token.

### 4.3 Human-in-the-Loop Approval & Risk Governance
Configured in `node.policies.requiresApproval`:
- If `requiresApproval === true` OR if `approvalCondition` evaluates to true:
  1. The node does not execute external side effects.
  2. The workflow state transitions to `WAITING_APPROVAL`.
  3. An `ApprovalRequest` record is written to the database.
  4. Execution resumes only when an authorized `OPERATOR`, `ADMIN`, or `OWNER` approves via `POST /api/approvals/[id]/approve`.

---

## 5. Canonical Real-World Scenario Examples

### 5.1 Scenario A: Lead Generation Pipeline
*Webhook -> Input Validation -> Google Sheets -> AI Classification -> Condition -> HubSpot / Slack*

```json
{
  "schemaVersion": "3.0.0",
  "id": "wf_lead_gen_pipeline_001",
  "tenantId": "tenant_a1b2c3d4e5f60718",
  "workspaceId": "ws_enterprise_growth_01",
  "name": "Lead Intake & Enterprise CRM Routing",
  "description": "Validates form leads, stores in Sheets, scores with Claude, and routes Enterprise leads to HubSpot",
  "version": 1,
  "status": "ACTIVE",
  "runtimeTarget": "native",
  "viewport": { "x": 0, "y": 0, "zoom": 1.0 },
  "triggers": [
    {
      "id": "trg_lead_webhook_01",
      "type": "webhook",
      "appId": "webhook",
      "config": {
        "webhookPath": "/api/webhooks/automation/leads",
        "webhookMethod": "POST"
      }
    }
  ],
  "nodes": [
    {
      "id": "step_trigger_node",
      "type": "triggerNode",
      "name": "Inbound Lead Webhook",
      "appId": "webhook",
      "actionId": "inbound_webhook",
      "parameters": {},
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "step_validate_input",
      "type": "customScriptNode",
      "name": "Validate & Normalize Email",
      "appId": "custom_script",
      "actionId": "execute_code",
      "parameters": {
        "code": "if (!inputs.email || !inputs.email.includes('@')) throw new Error('Invalid email'); return { ...inputs, email: inputs.email.toLowerCase().trim() };"
      },
      "position": { "x": 380, "y": 200 },
      "policies": { "timeoutMs": 2000, "riskLevel": "SAFE_READ" }
    },
    {
      "id": "step_append_sheets",
      "type": "actionNode",
      "name": "Log Lead to Google Sheets",
      "appId": "google_sheets",
      "actionId": "append_row",
      "credentialRef": "cred_google_workspace_01",
      "parameters": {
        "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "sheetName": "Raw Leads",
        "rowValues": ["{{ $json.name }}", "{{ $json.email }}", "{{ $json.company }}", "{{ $json.budget }}"]
      },
      "position": { "x": 660, "y": 200 },
      "policies": { "riskLevel": "REVERSIBLE" }
    },
    {
      "id": "step_ai_classify",
      "type": "aiNode",
      "name": "Claude Intent & Deal Scoring",
      "appId": "anthropic",
      "actionId": "messages_create",
      "credentialRef": "cred_anthropic_api_01",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "systemPrompt": "Analyze the lead data. Output a JSON object with 'dealTier' ('ENTERPRISE' if budget >= 10000, else 'SMB') and 'summary'.",
        "promptTemplate": "Company: {{ $json.company }}, Budget: {{ $json.budget }}"
      },
      "position": { "x": 940, "y": 200 },
      "policies": { "riskLevel": "SAFE_READ" }
    },
    {
      "id": "step_check_tier",
      "type": "conditionNode",
      "name": "Is Enterprise Deal?",
      "appId": "condition",
      "actionId": "evaluate",
      "parameters": {
        "expression": "$json.dealTier == 'ENTERPRISE'"
      },
      "position": { "x": 1220, "y": 200 }
    },
    {
      "id": "step_hubspot_upsert",
      "type": "actionNode",
      "name": "Create HubSpot Enterprise Lead",
      "appId": "hubspot",
      "actionId": "upsert_contact",
      "credentialRef": "cred_hubspot_crm_01",
      "parameters": {
        "email": "{{ $node['step_validate_input'].output.email }}",
        "properties": {
          "firstname": "{{ $node['step_validate_input'].output.name }}",
          "company": "{{ $node['step_validate_input'].output.company }}",
          "lifecyclestage": "salesqualifiedlead"
        }
      },
      "position": { "x": 1500, "y": 100 },
      "policies": { "riskLevel": "EXTERNAL_COMMUNICATION" }
    },
    {
      "id": "step_slack_alert",
      "type": "actionNode",
      "name": "Notify #sales-alerts",
      "appId": "slack",
      "actionId": "post_message",
      "credentialRef": "cred_slack_bot_01",
      "parameters": {
        "channel": "#sales-alerts",
        "text": "New SMB Lead received: {{ $node['step_validate_input'].output.name }} ({{ $node['step_validate_input'].output.email }})"
      },
      "position": { "x": 1500, "y": 320 },
      "policies": { "riskLevel": "EXTERNAL_COMMUNICATION" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "step_trigger_node", "target": "step_validate_input", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "e2", "source": "step_validate_input", "target": "step_append_sheets", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "e3", "source": "step_append_sheets", "target": "step_ai_classify", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "e4", "source": "step_ai_classify", "target": "step_check_tier", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "e5", "source": "step_check_tier", "target": "step_hubspot_upsert", "sourceHandle": "true", "targetHandle": "target", "label": "Enterprise" },
    { "id": "e6", "source": "step_check_tier", "target": "step_slack_alert", "sourceHandle": "false", "targetHandle": "target", "label": "SMB" }
  ],
  "createdAt": "2026-11-01T08:00:00Z",
  "updatedAt": "2026-11-01T08:00:00Z",
  "createdBy": "usr_architect_01"
}
```

---

### 5.2 Scenario C: Canva Content Automation Pipeline
*Schedule -> Google Sheets -> AI Content Generation -> Canva Autofill -> Canva Export -> Google Drive -> Gmail*

```json
{
  "schemaVersion": "3.0.0",
  "id": "wf_canva_content_automation_003",
  "tenantId": "tenant_a1b2c3d4e5f60718",
  "workspaceId": "ws_marketing_creative_02",
  "name": "Weekly Brand Socials Canva Automation",
  "description": "Pulls weekly metrics from Sheets, generates social copy, populates Canva Brand Template, uploads PDF to Drive, and notifies team.",
  "version": 1,
  "status": "ACTIVE",
  "runtimeTarget": "native",
  "triggers": [
    {
      "id": "trg_monday_morning",
      "type": "cron",
      "appId": "clock",
      "config": {
        "cronExpression": "0 10 * * 1",
        "timezone": "America/New_York"
      }
    }
  ],
  "nodes": [
    {
      "id": "step_cron_trigger",
      "type": "triggerNode",
      "name": "Monday 10 AM Schedule",
      "appId": "clock",
      "actionId": "cron_schedule",
      "parameters": {},
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "step_read_metrics",
      "type": "actionNode",
      "name": "Fetch Weekly Highlights",
      "appId": "google_sheets",
      "actionId": "read_sheet",
      "credentialRef": "cred_google_workspace_01",
      "parameters": {
        "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "sheetName": "WeeklyHighlights!A2:E2"
      },
      "position": { "x": 380, "y": 200 }
    },
    {
      "id": "step_ai_generate_copy",
      "type": "aiNode",
      "name": "GPT-4o Creative Copywriter",
      "appId": "openai",
      "actionId": "chat_completion",
      "credentialRef": "cred_openai_api_01",
      "parameters": {
        "model": "gpt-4o",
        "systemPrompt": "Generate a concise social graphic headline (max 8 words) and subtext based on metrics.",
        "promptTemplate": "Metric highlights: {{ $json.rows[0] }}"
      },
      "position": { "x": 660, "y": 200 }
    },
    {
      "id": "step_canva_autofill",
      "type": "actionNode",
      "name": "Autofill Canva Template",
      "appId": "canva",
      "actionId": "autofill_template",
      "credentialRef": "cred_canva_oauth_01",
      "parameters": {
        "brandTemplateId": "DAF_WeeklySpotlightTemplate",
        "title": "Weekly Performance Spotlight",
        "dataset": {
          "headline_text": "{{ $node['step_ai_generate_copy'].output.headline }}",
          "metric_number": "{{ $node['step_read_metrics'].output.rows[0][1] }}"
        }
      },
      "position": { "x": 940, "y": 200 }
    },
    {
      "id": "step_canva_export",
      "type": "actionNode",
      "name": "Export Rendered Design",
      "appId": "canva",
      "actionId": "export_design",
      "credentialRef": "cred_canva_oauth_01",
      "parameters": {
        "designId": "{{ $node['step_canva_autofill'].output.designId }}",
        "exportFormat": "pdf"
      },
      "position": { "x": 1220, "y": 200 }
    },
    {
      "id": "step_drive_upload",
      "type": "actionNode",
      "name": "Archive to Google Drive",
      "appId": "google_drive",
      "actionId": "upload_file",
      "credentialRef": "cred_google_workspace_01",
      "parameters": {
        "fileUrl": "{{ $node['step_canva_export'].output.downloadUrl }}",
        "folderId": "folder_marketing_archive_2026",
        "fileName": "Weekly_Spotlight_{{ $env.EXECUTION_DATE }}.pdf"
      },
      "position": { "x": 1500, "y": 200 }
    },
    {
      "id": "step_email_notify",
      "type": "actionNode",
      "name": "Email Creative Link to VP Marketing",
      "appId": "gmail",
      "actionId": "send_email",
      "credentialRef": "cred_google_workspace_01",
      "parameters": {
        "recipient": "marketing-leads@acme.com",
        "subject": "Canva Creative Generated for Monday Socials",
        "bodyText": "Your Canva social brief has been rendered and archived to Google Drive:\n{{ $node['step_drive_upload'].output.webViewLink }}"
      },
      "position": { "x": 1780, "y": 200 },
      "policies": { "riskLevel": "EXTERNAL_COMMUNICATION" }
    }
  ],
  "edges": [
    { "id": "ec1", "source": "step_cron_trigger", "target": "step_read_metrics", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "ec2", "source": "step_read_metrics", "target": "step_ai_generate_copy", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "ec3", "source": "step_ai_generate_copy", "target": "step_canva_autofill", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "ec4", "source": "step_canva_autofill", "target": "step_canva_export", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "ec5", "source": "step_canva_export", "target": "step_drive_upload", "sourceHandle": "source", "targetHandle": "target" },
    { "id": "ec6", "source": "step_drive_upload", "target": "step_email_notify", "sourceHandle": "source", "targetHandle": "target" }
  ],
  "createdAt": "2026-11-01T08:00:00Z",
  "updatedAt": "2026-11-01T08:00:00Z",
  "createdBy": "usr_marketing_ops_01"
}
```
