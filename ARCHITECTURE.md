# QuickReply AI Automation Operating System — Master Platform Architecture

**Document Version:** 3.0  
**Status:** Canonical Living Engineering Architecture Specification  
**Classification:** Core System Architecture Specification  
**Target Repositories:** `d:\quickreply` & `d:\quickreply\NYC-HACKATHON-ROUND-2-`  
**Last Updated:** 2026-11-01  

---

## 1. Executive Summary & Architectural Vision

QuickReply is an enterprise-grade **AI-Native Visual Automation Platform and SaaS Operating System**. It unifies conversational intent synthesis, interactive graph modeling, durable multi-step execution, and deep third-party integrations into a single cohesive platform.

Rather than forcing users to assemble low-level flowcharts or learn proprietary workflow domain-specific languages (DSLs), QuickReply provides a dual-modality interface:
1. **Conversational AI Planning Engine**: Users articulate complex automation requirements in natural language. An agentic planner grounded in the formal `IntegrationCatalog` compiles intent into an Abstract Syntax Tree (AST) graph patch, dynamically mutating the canvas without destroying existing nodes or credentials.
2. **Interactive Visual Canvas (`@xyflow/react`)**: A high-performance, GPU-accelerated 2D canvas with custom reactive nodes, typed connection ports, dynamic parameter inspectors, auto-layout (Dagre), and live execution telemetry animations.

On the backend, QuickReply executes workflows using a **Durable Execution Engine (DEE)** designed to survive catastrophic process crashes, network partitions, and third-party rate limits. State is atomically persisted across node transitions (`NODE_STARTED`, `NODE_COMPLETED`), and long-running workflows recover seamlessly upon server restarts.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   QUICKREPLY UNIFIED DUAL-LAYER TOPOLOGY                               │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                      PRESENTATION & CANVAS LAYER                                       │
│                                                                                                        │
│   ┌───────────────────────────┐    ┌───────────────────────────────────┐    ┌──────────────────────┐   │
│   │   Marketing Landing Page  │    │      Public Feature Studio        │    │ Authenticated SaaS   │   │
│   │     (src/app/page.tsx)    │    │ (/features/automation/page.tsx)   │    │ Studio (/dashboard)  │   │
│   │ [STRICTLY 100% UNTOUCHED] │    │  Guest Playground & Sandbox Trial │    │  Full Multi-Tenant   │   │
│   └───────────────────────────┘    └─────────────────┬─────────────────┘    └──────────┬───────────┘   │
│                                                      │                                 │               │
│                                                      ▼                                 ▼               │
│                                    ┌───────────────────────────────────────────────────┐               │
│                                    │   Interactive Visual Canvas (@xyflow/react v12)   │               │
│                                    │  6 Custom Node Types · Dagre Layout · Undo/Redo   │               │
│                                    │  Dynamic Parameter Inspector · Real-time Telemetry│               │
│                                    └─────────────────────────┬─────────────────────────┘               │
│                                                              │ Bidirectional AST Sync                  │
│                                                              ▼                                         │
│                                    ┌───────────────────────────────────────────────────┐               │
│                                    │ Conversational AI Assistant & AST Patch Engine    │               │
│                                    │ Multi-turn Planner · Non-destructive RFC 6902     │               │
│                                    │ Missing Parameter Prompter · Grounded Catalog     │               │
│                                    └─────────────────────────┬─────────────────────────┘               │
│                                                              │                                         │
├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│                                                              ▼                                         │
│                                      BACKEND ENGINE & SAAS LAYER                                       │
│                                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           DURABLE WORKFLOW EXECUTION ENGINE (DEE)                              │   │
│   │  Deterministic DAG Traversal · Parallel Fork/Join · Collection Loops (max 1000)                │   │
│   │  Atomic Checkpointing (MongoDB/File) · Crash Recovery Daemon · Backoff Retries with Jitter    │   │
│   │  Safe AST Expression Evaluator (Zero eval()) · Structured Lifecycle Event Bus                  │   │
│   └──────────────────┬───────────────────────────────┬───────────────────────────────┬─────────────┘   │
│                      │                               │                               │                 │
│                      ▼                               ▼                               ▼                 │
│   ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ ┌────────────────────────┐   │
│   │       NODE SDK & CONNECTORS         │ │      SECURITY & VAULT       │ │ MULTI-TENANT SAAS      │   │
│   │ Declarative Zod Schema Validation   │ │ AES-256-GCM Vault at Rest   │ │ 7-Tier RBAC Isolation  │   │
│   │ In-Memory Credential Injection      │ │ Opaque ID: `cred_<uuid>`    │ │ Cryptographic Audit    │   │
│   │ Connectors: Webhook, HTTP, Sheets,  │ │ OAuth 2.0 Auto Token Refresh│ │ Hash Chain H_n         │   │
│   │ Gmail, Slack, HubSpot, Canva, Drive,│ │ Redaction: Zero Secret Leak │ │ Usage Quota Governor   │   │
│   │ OpenAI SDK, Anthropic SDK           │ │ Script Worker Thread Sandbox│ │ Real-Time SSE Stream   │   │
│   └─────────────────────────────────────┘ └─────────────────────────────┘ └────────────────────────┘   │
│                                                      │                                                 │
│                                                      ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           PERSISTENCE & INFRASTRUCTURE TIER                                    │   │
│   │  MongoDB Atlas Driver (Connection Pool 50) · Redis Read-Through Cache · Atomic File Fallback   │   │
│   │  BullMQ Reliable Queue Scheduler · Mock Integration Server for Hermetic E2E Verification       │   │
│   └────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Invariants

### 2.1 Marketing Landing Page Preservation Invariant
The landing page at `src/app/page.tsx` represents the high-converting marketing showcase of the product.
- **Invariant**: `src/app/page.tsx` and all components under `src/frontend/components/landing/*` are **100% frozen and pristine**.
- **Enforcement**: No studio logic, React Flow canvas packages, execution scripts, or builder widgets may be imported or rendered in `src/app/page.tsx`.
- **Studio Locations**:
  - Public Feature Studio: `src/app/features/automation/page.tsx` (unauthenticated guest sandbox, JSON export, dry-run).
  - Authenticated SaaS Studio: `src/app/dashboard/automations/page.tsx` (authenticated workspace tenant, persistent database storage, production deployment).

### 2.2 Commercial Integrity & Original Implementation Invariant
- **Rule**: n8n public documentation and architecture are consulted strictly as conceptual reference for standard node parameter naming conventions and workflow JSON export compatibility.
- **Enforcement**: No n8n source code, proprietary UI components, or illustrations are copied. All graph compilation, canvas components, execution engine routines, and connectors are written natively.

### 2.3 Zero-Mock Production Connectors & Deterministic Test Harness Invariant
- Core connectors (Webhook, HTTP, Sheets, Gmail, Slack, HubSpot, Canva, Drive, OpenAI, Anthropic) implement live API protocol logic.
- When live credentials are absent during automated testing or local development, connectors target the **Mock Integration Server** (`src/backend/testing/MockIntegrationServer.ts`), guaranteeing hermetic, deterministic test execution without fake hardcoded returns in production classes.

---

## 3. Frontend Architecture

### 3.1 Technology Stack & Rendering Engine
- **Framework**: Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5.
- **Styling & Theming**: Tailwind CSS v4.3.3, `@tailwindcss/postcss`. Dark slate palette (`#09090B` canvas background, `#18181B` card containers, QuickReply Orange `#EA580C` accent).
- **Interactive Canvas Engine**: `@xyflow/react` v12.4+ (React 19 native architecture, GPU transform viewport, decoupled DOM rendering).
- **Motion & Layout**: Framer Motion 12.43.0, Lucide React 0.468.0, Recharts 3.8.1.
- **Client State Management**: Zustand 5.0.14 with temporal undo/redo history slice.

### 3.2 Visual Canvas Component Tree (`@xyflow/react`)
The canvas system is organized under `src/frontend/components/automation/studio/`:

```
src/frontend/components/automation/
├── studio/
│   ├── AutomationStudioLayout.tsx          # Split-screen responsive container (Canvas + Chat Assistant)
│   ├── CanvasHeaderBar.tsx                 # Workflow title, version tag, runtime target, Execute & Deploy
│   ├── WorkflowCanvas.tsx                  # Primary @xyflow/react viewport with ReactFlowProvider
│   ├── CanvasControlsToolbar.tsx           # Zoom (+/-), FitView, Auto-layout (Dagre), Snap-to-Grid, Undo/Redo
│   ├── NodeCatalogDrawer.tsx               # Draggable sidebar: Triggers, Actions, Logic, Loops, AI, Code
│   ├── NodeQuickAddMenu.tsx                # Contextual quick-add menu opened when dragging edge to empty space
│   ├── NodeInspectorDrawer.tsx             # Slide-over parameter configuration and credential selector
│   └── nodes/
│       ├── BaseNodeWrapper.tsx             # Universal node wrapper (status ring, handles, badges, tooltip)
│       ├── TriggerNode.tsx                 # Webhook, Cron Schedule, Inbound Event, Manual Trigger
│       ├── ActionNode.tsx                  # Connectors (Sheets, Gmail, Slack, HubSpot, Canva, Drive, HTTP)
│       ├── ConditionNode.tsx               # Bifurcated logic node with 'true' and 'false' output handles
│       ├── LoopNode.tsx                    # Array iterator node with 'loop_body' and 'completed' handles
│       ├── AINode.tsx                      # LLM reasoning, classification, entity extraction
│       └── CustomScriptNode.tsx            # Sandboxed JavaScript transformation script preview
```

### 3.3 Custom Node Specifications & Port Semantics

| Node Type | Handle Configuration | Visual Indicator & Accents | Supported Parameters |
|---|---|---|---|
| **`triggerNode`** | 1 Output (`source` on right) | Emerald badge (`#10B981`), pulsing status dot | `triggerType` (webhook, cron, manual), `cronExpression`, `webhookPath`, `authType` |
| **`actionNode`** | 1 Input (`target` on left), 1 Output (`source` on right) | Sky Blue badge (`#0EA5E9`), app brand icon, risk tier badge | `appId`, `actionId`, `credentialId`, dynamic schema fields (e.g. `sheetId`, `channel`) |
| **`conditionNode`** | 1 Input (`target` on left), 2 Outputs (`source` upper-right for `true`, lower-right for `false`) | Amber badge (`#F59E0B`), diamond accent icon | `expression` (AST syntax e.g. `$json.amount > 50000`), `combinator` (`AND`/`OR`) |
| **`loopNode`** | 1 Input (`target` on left), 2 Outputs (`loop_body` right, `completed` bottom-right) | Indigo badge (`#6366F1`), repeat loop glyph | `itemsPath` (e.g. `$json.records`), `batchSize` (1-100), `maxIterations` (default 1000) |
| **`aiNode`** | 1 Input (`target` on left), 1 Output (`source` on right) | Violet/Orange gradient badge (`#8B5CF6`), token pill | `provider` (`openai`/`anthropic`), `model`, `promptTemplate`, `temperature`, `systemPrompt` |
| **`customScriptNode`**| 1 Input (`target` on left), 1 Output (`source` on right) | Rose badge (`#F43F5E`), code icon, memory pill (`64MB/2s`) | `code` (JS/TS script body), `timeoutMs`, `memoryLimitMb` |

### 3.4 Dynamic Parameter Inspector & Autocomplete
When any node is clicked on the canvas:
1. `NodeInspectorDrawer.tsx` activates, retrieving the node definition from the active `WorkflowDefinitionV3`.
2. Inspects `IntegrationCatalog` for the corresponding `inputSchema`.
3. Renders type-safe controls:
   - String inputs with variable picker pill (`{{ $json.path }}`).
   - Dropdown selectors populated via dynamic catalog options.
   - Number sliders and numeric steppers.
   - Boolean toggles.
   - Credential picker dropdown querying `CredentialVault.getCredentialsByApp(workspaceId, appId)` with "+ Connect New Account" modal trigger.
4. Changes dispatch `updateNodeParameters(nodeId, newParams)` to the Zustand store, creating an undo checkpoint.

### 3.5 Real-Time Canvas Execution Telemetry
During workflow execution, the canvas animates live state:
- **`QUEUED`**: Subtle amber outline pulse.
- **`RUNNING`**: Glowing border with animated edge flow (SVG stroke dasharray marching particles).
- **`SUCCESS`**: Solid emerald border (`#10B981`) with execution latency tag (e.g. `142ms`).
- **`FAILED`**: Crimson red border (`#EF4444`) with error badge; clicking opens stack trace & AI debug drawer.
- **`SKIPPED`**: 40% opacity dimming along inactive conditional branch edges.

---

## 4. Conversational AI Builder & AST Graph Patch Engine

### 4.1 Natural Language Planning Pipeline
The conversational builder (`src/frontend/components/automation/assistant/` & `src/backend/automation/agent/AutomationPlannerAgent.ts`) translates user goals into valid graph mutations without manual drag-and-drop:
1. **User Prompt Ingestion**: User inputs requirements (e.g. *"When a lead submits our contact form, validate their email, write them to Google Sheets, score them with Claude, and if score > 80 alert Slack, else send a drip email via Gmail"*).
2. **Intent Parsing & Grounding**:
   - Matches referenced entities against `IntegrationCatalog.ts` (Webhook, Sheets, Anthropic, Slack, Gmail).
   - Identifies conditional thresholds (`score > 80`).
   - Checks workspace for connected credentials (`CredentialVault`).
3. **Missing Parameter & Credential Prompter**:
   - If required fields are missing (e.g. Google Sheets Spreadsheet ID, Slack Channel Name), the agent returns structured `clarificationQuestions`.
   - The UI displays clickable clarification chips or an inline credential connection button.

### 4.2 Non-Destructive AST Graph Patch Engine
To satisfy Requirement R3 and Scenario E, graph updates must **never** wipe out existing nodes or reset configured credentials. All mutations are computed as RFC 6902-compliant atomic graph operations:

```typescript
export type GraphPatchOperation =
  | { op: "INSERT_NODE"; node: CanvasNodeData; position: { relativeTo: string; placement: "before" | "after" } }
  | { op: "INSERT_BRANCH"; splitAfterNodeId: string; conditionNode: CanvasNodeData; trueBranch: CanvasNodeData[]; falseBranch: CanvasNodeData[] }
  | { op: "UPDATE_PARAMETERS"; nodeId: string; parameters: Record<string, any> }
  | { op: "REMOVE_NODE"; nodeId: string; reconnectStrategy: "bridge" | "orphan" }
  | { op: "REPLACE_NODE"; nodeId: string; replacementNode: CanvasNodeData }
  | { op: "UPDATE_TRIGGER"; trigger: CanvasTriggerData };
```

#### Graph Patch Application Algorithm (`WorkflowPatchEngine.ts`):
1. **Target Selection**: Locates target node by ID in `WorkflowDefinitionV3.nodes`.
2. **Topology Splicing**:
   - For `INSERT_BRANCH`: Incoming edge to target node is preserved. Outgoing edges are rerouted through the new condition node's `true` and `false` ports.
   - For `INSERT_NODE`: Downstream target node's input edge is redirected to the new node, and new node's output edge links to target node.
3. **Graph Invariant Verification**: Runs DFS cycle detection. If a cycle is detected, the patch is rejected with `CYCLE_DETECTED_ERROR`.
4. **State Commit & Animation**: Canvas applies graph diff; Framer Motion transitions smooth the layout shift.

---

## 5. Durable Execution Engine (DEE)

### 5.1 Deterministic State Machine
The core execution engine (`src/backend/engine/DurableExecutionEngine.ts`) implements a deterministic state machine:

```
  ┌────────────────┐
  │     QUEUED     │
  └───────┬────────┘
          │ Worker Pick-Up
          ▼
  ┌────────────────┐
  │    STARTED     │◄─────────────────────────────┐
  └───────┬────────┘                              │
          │ Begin Traversal                       │
          ▼                                       │
  ┌────────────────┐                              │
  │  NODE_STARTED  │                              │
  └───────┬────────┘                              │
          ├── Error (Retryable) ──► ┌─────────────┴─────┐
          │                         │   WAITING_RETRY   │ (Backoff + Jitter)
          │                         └───────────────────┘
          ├── Error (Terminal)  ──► ┌───────────────────┐
          │                         │      FAILED       │ (AI Debugger Triggered)
          │                         └───────────────────┘
          ├── Gate (Approval)   ──► ┌───────────────────┐
          │                         │ WAITING_APPROVAL  │ (Human-in-the-Loop)
          │                         └─────────┬─────────┘
          │                                   │ Approved
          ▼                                   │
  ┌────────────────┐                          │
  │ NODE_COMPLETED │◄─────────────────────────┘
  └───────┬────────┘
          │ Checkpoint Committed
          ├── More Steps Pending ──► Next Node (or Parallel Nodes)
          │
          ▼ All Leaf Nodes Complete
  ┌────────────────┐
  │   COMPLETED    │
  └────────────────┘
```

### 5.2 Atomic Checkpointing & State Persistence
- Every node state change commits an atomic checkpoint record to `Checkpoints` (MongoDB `checkpoints` collection or synchronous on-disk `src/data/db_<tenant>.json`).
- **Data Saved**: `executionId`, `nodeId`, `status`, `accumulatedState` (all upstream outputs), `retryCount`, `timestamp`.
- **Guarantee**: If the server process dies at millisecond $T$, no completed node is re-run on restart. Non-idempotent side effects (e.g. charges, SMS, emails) are strictly executed once.

### 5.3 Crash Recovery Daemon (`CrashRecoveryDaemon.ts`)
- On application boot (or worker thread initialization), the `CrashRecoveryDaemon` scans the persistence layer:
  $$\text{Query: } \text{status} \in \{\text{RUNNING}, \text{WAITING\_RETRY}\} \land \text{lastHeartbeat} < \text{NOW} - 120\text{s}$$
- Reclaimed executions resume from their last verified checkpoint. Nodes marked `NODE_COMPLETED` are skipped; their cached outputs are loaded into memory, and execution resumes from pending nodes.

### 5.4 Parallel Fork / Join Synchronization
- When a node has multiple outgoing edges without conditions, the engine creates parallel execution fibers using `Promise.allSettled()`.
- **Join Synchronization**: If a downstream node $C$ requires outputs from parallel branches $B_1$ and $B_2$, node $C$ enters `WAITING_DEPENDENCIES` until all incoming edge sources have completed and committed their checkpoints.

### 5.5 Iterative Collection Loops
- `LoopNode` accepts an array path (e.g. `{{ $node["ReadSheets"].output.rows }}`).
- Iterates over items sequentially or in configured batch chunks (e.g. 10 items/batch).
- Enforces hard safety limit: `maxIterations: 1000`. Exceeding iterations terminates with `LOOP_OVERFLOW_ERROR` to prevent memory exhaustion.

### 5.6 Safe AST Expression Evaluation (Zero Arbitrary `eval()`)
To prevent Remote Code Execution (RCE), QuickReply strictly forbids `eval()`, `new Function()`, and VM2 untrusted script strings.
- **Parser**: `src/backend/engine/SafeExpressionEvaluator.ts` uses an Abstract Syntax Tree tokenizer and recursive descent parser.
- **Syntax**: `{{ $json.user.email }}`, `{{ $node["StepName"].output.total * 1.18 }}`, `{{ length($json.items) > 0 }}`.
- **Allowed Operations**: Dot navigation, array index, arithmetic (`+ - * / %`), logic (`&& || !`), comparisons (`== != > < >= <=`), safe helper functions (`toUpper`, `toLower`, `trim`, `formatDate`, `coalesce`).
- **Denied Globals**: `global`, `process`, `require`, `import`, `eval`, `Function`, `__proto__`, `constructor`.

---

## 6. Extensible Node SDK, Credential Vault & Integrations

### 6.1 Declarative Node SDK Contract
All platform capabilities are implemented using the standardized `INodeDefinition` interface (`src/backend/nodes/NodeSDK.ts`):

```typescript
export interface INodeDefinition {
  id: string;                    // e.g. "google_sheets"
  name: string;                  // e.g. "Google Sheets"
  version: number;               // e.g. 1
  category: "trigger" | "action" | "logic" | "ai" | "transform";
  description: string;
  icon: string;
  auth: {
    type: "oauth2" | "api_key" | "webhook_secret" | "none";
    credentialAppId: string;
    requiredScopes?: string[];
  };
  inputSchema: z.ZodObject<any>;
  outputSchema: z.ZodObject<any>;
  execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput>;
}

export interface INodeExecutionContext {
  tenantId: string;
  workspaceId: string;
  executionId: string;
  nodeId: string;
  parameters: Record<string, any>;
  inputData: Record<string, any>;
  credentials: Record<string, any>; // Injected strictly in-memory by CredentialVault
  http: {
    request(options: SafeHttpRequestOptions): Promise<SafeHttpResponse>;
  };
  logger: {
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
  };
}
```

### 6.2 Credential Vault & Automated Token Refresh Lifecycle
1. **Encryption at Rest**: Credentials in the database are stored as ciphertext encrypted with **AES-256-GCM** using a 256-bit key derived via HKDF from `TOKEN_ENCRYPTION_KEY`. Ciphertext format: `iv:authTag:ciphertext`.
2. **Opaque References**: Workflows and canvas JSON reference credentials solely through opaque IDs: `cred_<uuid>`. Secrets are never exposed to the frontend, canvas export files, or LLM chat contexts.
3. **Automated Refresh Hook**: Before invoking any node requiring OAuth 2.0 (`google_sheets`, `gmail`, `slack`, `hubspot`, `canva`):
   $$\text{Check: } \text{expiresAt} - \text{NOW} \le 300\text{ seconds}$$
   If true, `OAuthLifecycleManager.ts` sends a refresh grant request to the provider's token endpoint, stores the new encrypted tokens atomically, and injects the fresh access token into `ctx.credentials`.
4. **Secret Redaction**: Every output stream, error trace, and audit log passes through `redactSecrets()`, scrubbing Bearer tokens, API keys, passwords, and authorization headers with `[REDACTED]`.

### 6.3 Core Connectors Catalog

| Connector | Auth Protocol | Actions / Triggers Supported |
|---|---|---|
| **Webhook** | HMAC-SHA256 Secret | Inbound Webhook Trigger (`inbound_webhook`), Outbound HTTP Dispatch (`post_transformed_result`). |
| **HTTP Request** | Bearer / Basic / Custom / None | Universal REST client (GET, POST, PUT, PATCH, DELETE) with SSRF firewall guard. |
| **Google Sheets** | OAuth 2.0 (`spreadsheets`) | `read_sheet`, `append_row`, `update_row`, `clear_rows`. |
| **Gmail** | OAuth 2.0 (`gmail.readonly`, `gmail.send`) | `new_email_received` trigger, `search_emails`, `send_email`. |
| **Slack** | OAuth 2.0 (`chat:write`) | `post_message` (formatted blocks, markdown), `post_ephemeral`. |
| **HubSpot** | OAuth 2.0 (`crm.objects.contacts.write`) | `upsert_contact` (keyed by email), `create_deal`, `search_contacts`. |
| **Canva Connect** | OAuth 2.0 (`design:content:write`, etc.) | `list_templates`, `autofill_template`, `export_design` (PDF/PNG render). |
| **Google Drive** | OAuth 2.0 (`drive.file`) | `upload_file`, `create_folder`, `get_download_link`. |
| **OpenAI SDK** | API Key (`Bearer sk-...`) | `chat_completion` (GPT-4o, structured outputs, JSON mode), `embeddings`. |
| **Anthropic SDK**| API Key (`x-api-key: sk-ant-...`) | `messages_create` (Claude 3.5 Sonnet, tool calling, prompt caching). |

---

## 7. Workflow Showcase & Canva Integration

### 7.1 Presentation Showcase Mode (`WorkflowShowcaseModal.tsx`)
Executive presentations can be generated on-demand directly from the canvas via 4 specialized views:
1. **Multi-Tier Architecture View**: Swimlane layout grouping nodes into Ingestion, Logic & AI Transformation, and Outbound Services.
2. **Data Flow Lineage**: Trace view mapping schema transformations across node hops, highlighting data field mutations.
3. **Node SLA & Safety Scorecard**: Security audit table showing side-effect classification (`SAFE_READ`, `REVERSIBLE`, `EXTERNAL_COMMUNICATION`, `FINANCIAL`, `DESTRUCTIVE`), approval requirements, and retry SLAs.
4. **Execution Performance KPIs**: Interactive Recharts graphs displaying historical throughput, success rate, and latency percentiles (p50, p95).

### 7.2 Multi-Format Export Engine
- **JSON**: Native `WorkflowDefinitionV3` and importable n8n-compatible workflow JSON.
- **High-Resolution PNG**: 2x/3x pixel-density rasterization via `html-to-image`.
- **Vector SVG**: Mathematical bezier curve SVG export for architecture whitepapers.
- **Executive PDF Brief**: Multi-page PDF detailing executive summary, diagram, data schema, and security posture.

### 7.3 Canva Connect API Integration
Enables automated workflow design generation and content publishing (Scenario C):
- **OAuth Authorization**: Connects workspace to Canva via PKCE OAuth 2.0 flow.
- **Template Discovery**: Browses authorized Canva Brand Templates (`GET /v1/brand-templates`).
- **Autofill Job**: Injects workflow briefs, generated AI headlines, metrics, and architecture diagram images into template fields (`POST /v1/autofills`).
- **Export Retrieval**: Initiates design render (`POST /v1/exports`), polls until complete, and retrieves high-res PDF/PNG design URLs for downstream distribution (Google Drive, Gmail).

---

## 8. Multi-Tenant SaaS Infrastructure & Security

### 8.1 Multi-Tenant Isolation & 7-Tier RBAC
Every database entity includes `tenantId` and `workspaceId`. Cross-tenant queries are blocked at the ORM/DB boundary via `assertTenantOwnership()`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        7-TIER RBAC HIERARCHY                           │
├────────────┬───────────────────────────────────────────────────────────┤
│ OWNER      │ Full root ownership, billing, delete workspace, audit log│
│ ADMIN      │ Workspace settings, invite/remove users, credential admin │
│ MEMBER     │ Standard member: read workspace resources, run manual     │
│ EDITOR     │ Create, edit, save workflows; configure node parameters   │
│ OPERATOR   │ Trigger executions, approve pending human-in-the-loop gates│
│ DEVELOPER  │ Create custom script nodes, manage API webhooks, view logs │
│ VIEWER     │ Read-only inspection of canvas, executions, and metrics   │
└────────────┴───────────────────────────────────────────────────────────┘
```

### 8.2 Cryptographic Audit Log Hash Chain
For tamper-evident compliance (SOC 2, ISO 27001), all audit events are cryptographically chained:
$$H_0 = \text{SHA-256}(\text{"GENESIS\_BLOCK"})$$
$$H_n = \text{SHA-256}(H_{n-1} \,\|\, \text{timestamp} \,\|\, \text{tenantId} \,\|\, \text{eventType} \,\|\, \text{userId} \,\|\, \text{canonicalPayload})$$
Any retroactive modification of stored log records invalidates the chain downstream, immediately alerting administrators.

### 8.3 Isolated Script Node Worker Sandbox
For custom JavaScript/TypeScript data transformations:
- **Execution**: Isolated worker thread (`node:worker_threads`) with restricted V8 isolate privileges.
- **Resource Limits**: Hard CPU timeout of 2,000ms; maximum heap allocation of 64MB (`--max-old-space-size=64`).
- **Sandboxed Context**: Globals `process`, `child_process`, `fs`, `net`, `http`, `eval`, `Function` are set to `undefined`. Only input payload and basic standard JS math/string libraries are accessible.

---

## 9. Technology Stack & Directory Inventory

### 9.1 Technology Stack Summary
- **Runtime**: Node.js 20+ LTS
- **Framework**: Next.js 16.2.7 (App Router)
- **UI Engine**: React 19.2.4
- **Styling**: Tailwind CSS 4.3.3
- **Canvas**: `@xyflow/react` 12.4+
- **Database**: MongoDB Atlas Driver 7.5.0, Redis 5.11.1, Synchronous JSON fallback
- **Queuing & Scheduling**: BullMQ 5.81.2
- **Validation**: Zod 4.4.3
- **Cryptography**: Node.js `crypto` (AES-256-GCM, HMAC-SHA256, SHA-256)
- **AI SDKs**: `@anthropic-ai/sdk` 0.115.0, `@google/generative-ai` 0.24.1, `openai` 4.x

### 9.2 Codebase Directory Layout

```
d:\quickreply\NYC-HACKATHON-ROUND-2-\
├── src/
│   ├── app/
│   │   ├── page.tsx                           # Clean marketing landing page (INVARIANT: UNTOUCHED)
│   │   ├── features/automation/page.tsx       # Dedicated Public Studio (Guest sandbox)
│   │   ├── dashboard/automations/page.tsx     # SaaS Authenticated Dashboard Studio
│   │   └── api/                               # 157+ Route handlers (conversations, workflows, executions, integrations)
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── landing/                       # Pristine marketing components (Header, Hero, Marquee, CTA)
│   │   │   └── automation/
│   │   │       ├── studio/                    # Canvas layout, @xyflow viewport, custom nodes, inspector
│   │   │       ├── assistant/                 # Conversational AI assistant panel, clarification chips
│   │   │       ├── showcase/                  # Presentation modal (architecture, dataflow, metrics)
│   │   │       └── canva/                     # Canva Connect API template picker & export modal
│   │   └── stores/
│   │       └── workflowStudioStore.ts         # Master Zustand store (nodes, edges, spec, history)
│   ├── backend/
│   │   ├── engine/
│   │   │   ├── DurableExecutionEngine.ts      # Core state machine, parallel fork/join, loops
│   │   │   ├── CheckpointStore.ts             # Atomic checkpoint persistence & recovery
│   │   │   ├── CrashRecoveryDaemon.ts         # Boot recovery daemon for in-flight jobs
│   │   │   ├── SafeExpressionEvaluator.ts     # AST parser & evaluator (zero eval())
│   │   │   ├── RetryManager.ts                # Exponential backoff with jitter
│   │   │   └── ExecutionEventBus.ts           # Lifecycle event emitter & SSE streaming
│   │   ├── nodes/
│   │   │   ├── NodeSDK.ts                     # Declarative node contracts & execution context
│   │   │   ├── NodeRegistry.ts                # Master node registry
│   │   │   └── connectors/                    # Production connectors (Webhook, Http, Sheets, Gmail, Slack, HubSpot, Canva, Drive, AI)
│   │   ├── credentials/
│   │   │   ├── CredentialVault.ts             # AES-256-GCM encrypted secret store
│   │   │   └── OAuthLifecycleManager.ts       # Automated refresh token rotation
│   │   ├── compiler/
│   │   │   ├── WorkflowCompiler.ts            # Cycle detection DFS & target compiler
│   │   │   └── WorkflowPatchEngine.ts         # Non-destructive AST graph patch engine
│   │   ├── security/
│   │   │   ├── TenantGuard.ts                 # 7-tier RBAC & multi-tenant isolation
│   │   │   ├── ScriptSandbox.ts               # Worker-thread isolated script execution
│   │   │   ├── AuditLogChainer.ts             # Cryptographic SHA-256 hash chaining
│   │   │   └── QuotaGovernor.ts               # Plan limits & usage metering
│   │   └── testing/
│   │       ├── MockIntegrationServer.ts       # Hermetic mock server for third-party APIs
│   │       └── ScenarioRunner.ts              # E2E test harness for Scenarios A-E
│   └── database/
│       └── db.ts                              # Unified MongoDB + Redis + File fallback driver
└── scripts/
    ├── verify-acceptance-scenarios.mjs        # Acceptance test runner
    ├── verify-e2e-scenarios-a-e.mjs           # Scenarios A-E verification runner
    └── release-gate.js                        # 15-gate DevOps release validation
```

---

## 10. Summary of Architectural Guarantees

1. **Safety**: Zero arbitrary `eval()` anywhere in the application. Safe AST expression evaluation only.
2. **Durability**: Zero state loss on server crash. Checkpointed node state resumes deterministically.
3. **Security**: Zero plaintext secrets in workflows, canvas exports, or LLM chat context. AES-256-GCM at rest, automated token refresh, and worker thread script sandboxing.
4. **Integrity**: Non-destructive AST graph modifications preserve existing node configurations and credentials during multi-turn conversational AI edits.
5. **Cleanliness**: 100% preservation of the marketing landing page `src/app/page.tsx`.