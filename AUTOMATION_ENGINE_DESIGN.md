# QuickReply AI Automation Operating System — Workflow Intelligence & Compiler Engine Design

**Document Version:** 2.0  
**Specification:** Provider-Independent Automation Compiler & Knowledge Engine  

---

## 1. Compiler Architecture Pipeline

The compiler transforms high-level, unstructured business requests into verifiable, deterministic executable graphs across 8 distinct phases:

```
[Natural Language Goal]
         │
         ▼
[Phase 1: Intent & Entity Extraction]
  ├── Trigger classification (Schedule, Webhook, Event)
  ├── Source applications & Target applications
  └── Data extraction schemas & transformation logic
         │
         ▼
[Phase 2: Progressive Requirement Clarification]
  ├── Identify missing parameters (e.g., target chat ID, threshold value)
  └── Check credential authorization status in Credential Vault
         │
         ▼
[Phase 3: Normalized AST Specification (`WorkflowSpec v2.0`)]
  ├── Intermediate representation decoupled from target runtime
  ├── Side-effect risk classification (Safe Read vs Destructive)
  └── Credential reference binding (cred_xxx)
         │
         ▼
[Phase 4: Runtime Target Selection]
  ├── n8n: High-throughput deterministic integrations, schedules, webhooks
  ├── LangGraph: Stateful agents, multi-step reasoning, interruptions
  └── Native DAG: Built-in zero-dependency execution fallback
         │
         ▼
[Phase 5: Target Code / Schema Generation]
  ├── n8n JSON compiler / LangGraph state graph / Native Node graph
  └── Parameter version pinning (strict n8n node typeVersion check)
         │
         ▼
[Phase 6: Static Graph & Cycle Validation]
  ├── Topological DFS cycle check
  ├── Reachability & branch completeness
  └── Parameter schema validation (Zod schema checking)
         │
         ▼
[Phase 7: Synthetic Test Generation & Sandbox Execution]
  ├── Generate edge-case test payloads (empty, invalid, threshold-exceeding)
  └── Run in dry-run mode verifying step outputs
         │
         ▼
[Phase 8: Human-in-the-Loop Approval & Safe Deployment]
```

---

## 2. Integration Knowledge Catalog Schema

The catalog contains certified schemas for 16+ core business applications:
- **Productivity & Workspace:** Gmail, Google Sheets, Google Drive, Google Calendar, Slack, Microsoft Teams, Notion, Airtable.
- **Messaging & Channels:** Telegram, WhatsApp Cloud API, Instagram Direct, LinkedIn Social, Discord.
- **Operations & Financials:** Stripe, Razorpay, HubSpot CRM, Linear, Jira, Webhooks, Generic REST.

For each integration, the catalog defines:
1. `appId`: Unique platform identifier.
2. `category`: Channel, Productivity, CRM, Finance, Developer.
3. `authType`: `oauth2` with required scopes or `api_key`.
4. `triggers`: Event types, polling intervals, webhook configurations.
5. `actions`: Input parameters with types, defaults, required flags, and output schemas.
6. `sideEffect`: Immutable safety rating.

---

## 3. Workflow Self-Correction Loop

When a generated specification fails validation:
1. The compiler isolates the failing node and error reason (e.g., *“Missing required parameter `spreadsheetId`”*).
2. A targeted repair prompt is dispatched to the AI planning engine with the exact JSON schema constraint.
3. The repair is applied incrementally without altering unrelated working nodes.
4. Maximum repair budget: 3 attempts. If still invalid, the system gracefully surfaces a targeted clarification prompt to the user.