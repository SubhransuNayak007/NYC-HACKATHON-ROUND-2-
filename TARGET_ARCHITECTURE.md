# Target System Architecture Specification

**Document Identifier:** `TARGET_ARCHITECTURE.md`  
**System Name:** QuickReply AI Automation Operating System & SaaS Platform  
**Target Codebase:** `d:\quickreply` & `d:\quickreply\NYC-HACKATHON-ROUND-2-`  
**Author:** `worker_m1_audit` (Principal Software Architect)  
**Status:** Authoritative Target System Blueprint  
**Date:** 2026-11-01  

---

## 1. Master System Architecture & Architectural Topology

The target QuickReply platform is engineered as a resilient, enterprise-grade visual automation operating system and SaaS platform. It bridges human natural language, interactive visual graph manipulation, deterministic durable execution, and multi-tenant security.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          PRESENTATION & USER EXPERIENCE                                │
├────────────────────────────────┬───────────────────────────────────────┬───────────────────────────────┤
│     Public Marketing View      │       Interactive Visual Studio       │      Workflow Showcase &      │
│       `src/app/page.tsx`       │  `/features/automation` & `/dashboard`│      Canva Presentation       │
│  (100% UNTOUCHED Clean HTML)   │   (@xyflow/react v12 Canvas Engine)   │   (4 Views, PNG/SVG/PDF/Canva)│
└────────────────────────────────┴───────────────────┬───────────────────┴───────────────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CONVERSATIONAL AI & COMPILATION LAYER                                  │
├────────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│    Conversational AI Assistant (Anthropic/OpenAI)  │             AST Graph Patch Engine                │
│    - Intent & operation extraction from NL prompts │             - Non-destructive RFC 6902 mutations  │
│    - Parameter & credential prompter               │             - Branch splitting & node insertion   │
├────────────────────────────────────────────────────┴───────────────────────────────────────────────────┤
│    Multi-Target Workflow Compiler (WorkflowCompiler.ts)                                                │
│    - Strict DFS acyclic validation (HTTP 422 on cycles)                                                │
│    - Multi-target AST generation: Native Executable DAG, n8n JSON, LangGraph AST                      │
└────────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DURABLE EXECUTION ENGINE (DEE)                                    │
├────────────────────────────────┬───────────────────────────────────────┬───────────────────────────────┤
│    Deterministic Orchestrator  │      Durable Checkpoint Manager       │     Crash Recovery Daemon     │
│    - Topological graph runner  │      - Atomic save per transition     │     - Scans incomplete runs   │
│    - Parallel fork/join sync   │      - `NODE_STARTED`/`COMPLETED`     │     - Resumes on server boot  │
│    - Loop control (max 1,000)  │      - Step outputs & state store     │     - Zero zombie executions  │
├────────────────────────────────┴───────────────────────────────────────┴───────────────────────────────┤
│    Safe AST Expression Evaluator (SafeExpressionEvaluator.ts)                                          │
│    - Sandboxed AST evaluation of `{{ $json.field }}` expressions with ZERO arbitrary `eval()`         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│    Structured Lifecycle Event Bus (EventBus.ts)                                                        │
│    - Real-time event streaming (`execution.queued`, `node.started`, `node.completed`, `failed`)        │
└────────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     NODE SDK & CREDENTIAL VAULT                                        │
├────────────────────────────────┬───────────────────────────────────────┬───────────────────────────────┤
│     Standardized Node SDK      │       Secure Credential Vault         │    OAuth Lifecycle Manager    │
│     - `INodeDefinition`        │       - AES-256-GCM encryption        │    - Automatic token refresh  │
│     - `INodeExecutionContext`  │       - Opaque IDs: `cred_<uuid>`     │    - Refresh when expiry ≤ 300s│
│     - Schema input/output ports│       - Automated secret redaction    │    - Workspace isolation      │
├────────────────────────────────┴───────────────────────────────────────┴───────────────────────────────┤
│    Production Core Connectors:                                                                         │
│    Webhook │ HTTP Request │ Google Sheets │ Gmail │ Slack │ HubSpot │ Canva Connect │ Drive │ AI (SDK) │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│    Hermetic Mock Integration Server (`src/testing/MockIntegrationServer.ts`):                          │
│    Deterministic mock handlers for OAuth, Google, Slack, HubSpot, Canva, and Gmail for hermetic tests  │
└────────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               MULTI-TENANT SAAS SECURITY & GOVERNANCE                                  │
├────────────────────────────────┬───────────────────────────────────────┬───────────────────────────────┤
│     Tenant Guard & RBAC        │    Cryptographic Audit Hash Chain     │    Isolated Script Sandbox    │
│     - 7-tier role permissions  │    - $H_n = \text{SHA256}(H_{n-1}+P)$ │    - Node.js worker threads   │
│     - Workspace boundary lock  │    - Tamper-evident ledger            │    - 2s CPU & 64MB memory cap │
├────────────────────────────────┴───────────────────────────────────────┴───────────────────────────────┤
│    Real-Time Execution Streaming & AI Debugger:                                                        │
│    SSE route (`/api/workflows/executions/[id]/stream`) with secret redaction and error diagnosis       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: Interactive Visual Workflow Canvas Engine (`@xyflow/react`)

### 2.1 Engine Baseline & Architecture
- **Framework**: `@xyflow/react` v12.
- **Location**: `src/components/canvas/WorkflowCanvas.tsx`.
- **Canvas State Store**: Zustand store `useWorkflowStudioStore.ts` tracking:
  - `nodes: AppNode[]`
  - `edges: AppEdge[]`
  - `selectedNodeId: string | null`
  - `history: { past: StudioState[], future: StudioState[] }` (undo/redo stack)
  - `isDirty: boolean`
  - `executionStatus: Record<string, NodeExecutionState>`

### 2.2 Custom Node Type Hierarchy
The canvas implements 6 specialized custom React Flow nodes:
1. **`TriggerNode`**:
   - Visual: Pill header with pulsing indicator, connection source handle.
   - Triggers: Webhook (URL copy button), Cron Schedule (human-readable cadence), Event.
2. **`ActionNode`**:
   - Visual: App brand icon (Gmail, Sheets, Slack, etc.), operation title, status badge, input handle (top/left) and output handle (bottom/right).
3. **`ConditionNode`**:
   - Visual: Diamond or split-card container with condition expression summary.
   - Ports: Single input port; **dual distinct output ports**: `Handle id="true"` (Green) and `Handle id="false"` (Slate/Red).
4. **`LoopNode`**:
   - Visual: Circular repeat indicator, iteration count limit.
   - Ports: Input port, `Handle id="loop_body"` (iterative branch), `Handle id="done"` (exit branch).
5. **`AINode`**:
   - Visual: Gradient purple header, AI provider badge (Anthropic Claude / OpenAI GPT-4o), prompt preview.
6. **`ScriptNode`**:
   - Visual: Terminal-style code card, runtime badge (`WorkerSandbox`), syntax-highlighted snippet.

### 2.3 Dynamic Parameter Inspector Drawer
- Located in `src/components/canvas/inspector/ParameterInspectorDrawer.tsx`.
- Reads `inputSchema` from the selected node's `INodeDefinition`.
- Renders typed form controls:
  - String / Text: Input field with variable autocomplete dropdown (`{{ $json.field }}`).
  - Credential Selector: Dropdown querying `CredentialVault` for authorized workspace credentials.
  - Number / Boolean: Sliders, toggles.
  - JSON / Code: Monaco / CodeMirror editor.

### 2.4 Canvas Utilities & Visual Interactivity
- **Auto-Layout**: Dagre / elkjs graph layout computing top-to-bottom or left-to-right node coordinates.
- **Navigation**: Pan, zoom (0.1x to 2x), fit-to-view, interactive mini-map.
- **Execution Telemetry Overlay**: Animated edge particle flows depicting live data flow; glowing green borders for completed nodes, pulsing amber for executing nodes, red for failed steps.

---

## 3. Tier 2: Conversational AI Workflow Builder & AST Graph Patch Engine

### 3.1 AI Planning Architecture
The conversational assistant operates via `src/backend/compiler/AutomationPlannerAgent.ts` using structured LLM schemas:
1. **Prompt Ingestion**: Receives user natural language instruction, conversation history, and current workflow AST.
2. **Catalog Retrieval**: Queries `IntegrationCatalog` for real schemas, parameters, and required scopes.
3. **Intent Compilation**: Synthesizes structured graph mutations conforming to `GraphPatchSchema`.

### 3.2 AST Graph Patch Engine (`WorkflowPatchEngine.ts`)
To prevent destructive rewrites, graph modifications use atomic RFC 6902-style operations:
```typescript
export type GraphPatchOperation =
  | { op: "INSERT_NODE"; parentNodeId: string; targetPort?: string; node: WorkflowNode }
  | { op: "INSERT_BRANCH"; conditionNodeId: string; trueNode: WorkflowNode; falseNode: WorkflowNode }
  | { op: "UPDATE_PARAMETERS"; nodeId: string; parameters: Record<string, any> }
  | { op: "REMOVE_NODE"; nodeId: string; reconnectEdges: boolean }
  | { op: "CONNECT_NODES"; sourceNodeId: string; sourcePort: string; targetNodeId: string; targetPort: string };

export class WorkflowPatchEngine {
  public static applyPatch(workflow: WorkflowDefinitionV3, patch: GraphPatchOperation[]): WorkflowDefinitionV3 {
    // Clones workflow immutably, applies operations, validates acyclic invariant via WorkflowCompiler
  }
}
```
- **Invariant**: Modifying one part of a workflow (e.g. adding a condition or Slack step) strictly preserves all existing node configurations, parameter values, and unaffected edge connections.

### 3.3 Interactive Parameter & Credential Prompter
- When required parameters or credentials are missing:
  - Injects structured quick-reply buttons into the chat thread.
  - Highlights the specific missing field in the visual parameter inspector with a pulse animation.

---

## 4. Tier 3: Durable Execution Engine (DEE) & Event System

### 4.1 Deterministic State Machine
The core engine (`src/backend/engine/DurableExecutionEngine.ts`) manages workflow execution through deterministic topological phases:
```
[ Trigger Event Ingested ]
            │
            ▼
┌───────────────────────┐
│     STATE: QUEUED     │  ◄── Execution record created; input payload saved
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    STATE: RUNNING     │  ◄── Topological queue initialized
└───────────┬───────────┘
            │
            ├──────────────────────────┐
            ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐
│  Atomic Checkpoint:   │  │ Parallel Fork / Join  │
│     NODE_STARTED      │  │ Barrier Sync          │
└───────────┬───────────┘  └───────────┬───────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐
│ Node Handler Executed │  │ Safe AST Expression   │
│ (with retry policy)   │  │ Evaluator (zero eval) │
└───────────┬───────────┘  └───────────┬───────────┘
            │                          │
            ├──────────────────────────┘
            ▼
┌───────────────────────┐
│  Atomic Checkpoint:   │  ◄── Outputs persisted; DB updated
│    NODE_COMPLETED     │
└───────────┬───────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
[ Next Steps ]  [ All Complete / Fatal Error ]
                    │
                    ▼
        ┌───────────────────────┐
        │  COMPLETED / FAILED   │
        └───────────────────────┘
```

### 4.2 Durable Checkpoint Persistence & Crash Recovery
- **Checkpoint Contract**:
  - After every node transition, `CheckpointManager.ts` writes an atomic record to the database:
    `{ executionId, nodeId, status, inputData, outputData, timestamp, retryCount }`.
- **Crash Recovery Daemon (`CrashRecoveryDaemon.ts`)**:
  - Automatically initializes during server startup.
  - Queries for executions where `status === "RUNNING"` or `status === "QUEUED"`.
  - For each stranded execution:
    - Reads the latest valid checkpoint.
    - Re-hydrates state into the `DurableExecutionEngine`.
    - Resumes graph execution from the next pending step.
    - Zero dropped executions across process restarts or crashes.

### 4.3 Parallel Fork / Join & Loops
- **Parallel Fork / Join**:
  - Detects nodes with multiple outgoing edges.
  - Spawns parallel asynchronous promises for divergent paths.
  - Implements synchronization barrier (`JoinNode`) that halts continuation until all incoming dependencies resolve.
- **Loop Control**:
  - `LoopNode` supports iterative item processing over array payloads.
  - Enforces strict hard guardrail: **Maximum 1,000 iterations per execution** to prevent runaway CPU loops.

### 4.4 Exponential Backoff Retries
- Configurable per-node retry policy:
  ```typescript
  export interface RetryPolicy {
    maxAttempts: number;      // e.g. 3
    initialIntervalMs: number;// e.g. 1000ms
    backoffFactor: number;    // e.g. 2.0
    jitter: boolean;          // true
  }
  ```
- Backoff calculation:
  $$T_{\text{wait}} = \text{initialIntervalMs} \times (\text{backoffFactor})^{\text{attempt}-1} \pm \text{randomJitter}$$

### 4.5 Safe Expression Evaluator (`SafeExpressionEvaluator.ts`)
- Replaces arbitrary `eval()` or `Function()` calls with a recursive AST parser.
- Resolves dot-notation paths safely against execution context:
  - `{{ $json.user.email }}`
  - `{{ $json.amount > 5000 }}`
  - `{{ $env.WORKSPACE_NAME }}`
- Rejects access to Node.js process, global object, prototypes, or filesystem APIs.

### 4.6 Structured Event Bus (`EventBus.ts`)
Emits strongly-typed lifecycle events:
- `execution.queued`, `execution.started`, `execution.completed`, `execution.failed`
- `node.started`, `node.completed`, `node.failed`, `node.retried`
- `checkpoint.saved`

---

## 5. Tier 4: Extensible Node SDK, Credential Vault & Connectors

### 5.1 Formal Node SDK Contracts (`src/backend/nodes/NodeSDK.ts`)
```typescript
export interface INodeDefinition {
  appId: string;
  name: string;
  category: "trigger" | "action" | "logic" | "ai" | "custom";
  description: string;
  icon: string;
  authType: "none" | "oauth2" | "apiKey";
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  parameters: ParameterSchema[];
  execute(ctx: INodeExecutionContext): Promise<Record<string, any>>;
}

export interface INodeExecutionContext {
  nodeId: string;
  inputData: Record<string, any>;
  parameters: Record<string, any>;
  credentials: Record<string, any>;
  logger: { info: (msg: string) => void; error: (msg: string) => void };
  httpClient: AxiosOrFetchClient;
  evaluateExpression: (expr: string) => any;
}
```

### 5.2 Secure Credential Vault (`CredentialVault.ts`)
- All secrets encrypted via AES-256-GCM at rest in `src/database/db.ts`.
- Workflows store only opaque string references: `"credentialId": "cred_e83b4..."`.
- Secrets are decrypted only in-memory inside `execute()` callbacks.
- All logs, error traces, and SSE payloads are scrubbed by `redactSecrets()`.

### 5.3 Automated OAuth Token Refresh Lifecycle
- `OAuthLifecycleManager.ts`:
  - Intercepts outbound requests using OAuth credentials.
  - If `expiresAt - Date.now() <= 300000` (5 minutes remaining):
    - Automatically requests token refresh using stored `refreshToken`.
    - Updates encrypted credential record in database.
    - Re-encrypts new tokens with new IV.
    - Transparently completes the execution without workflow failure.

### 5.4 Production Core Connectors
1. **Webhook**: Inbound request parsing, signature validation (HMAC SHA-256).
2. **HTTP Request**: Full REST methods (GET, POST, PUT, DELETE, PATCH), headers, query params, auth injection.
3. **Google Sheets**: Append row, read rows, update cell.
4. **Gmail**: Send email, search inbox, parse attachments.
5. **Slack**: Post message to channel, send blocks, direct message.
6. **HubSpot**: Upsert contact, update deal, query CRM records.
7. **Canva Connect API**: OAuth2 authentication, search templates, autofill brief mapping, export design.
8. **Google Drive**: Upload file, create folder, generate shareable URL.
9. **AI Providers**: Standalone OpenAI SDK and Anthropic Claude SDK nodes with model selection, system prompts, temperature, and structured JSON output.

### 5.5 Hermetic Mock Integration Server (`MockIntegrationServer.ts`)
- Path: `src/testing/MockIntegrationServer.ts`.
- Runs a deterministic in-process HTTP mock router simulating:
  - Google OAuth token exchange & Sheets API
  - Slack Web API (`chat.postMessage`)
  - HubSpot CRM API (`contacts/v1/contact/createOrUpdate`)
  - Canva Connect API (`/v1/designs`, `/v1/templates`)
  - Gmail API (`/gmail/v1/users/me/messages/send`)
- Guarantees 100% hermetic, zero-mock E2E testing without external cloud dependencies.

---

## 6. Tier 5: Workflow Showcase & Canva Integration

### 6.1 Presentation Showcase Mode
- Path: `src/components/showcase/WorkflowShowcaseModal.tsx`.
- Modal triggered from the studio header providing 4 presentation views:
  1. **Multi-Tier Architecture Diagram**: High-level visual diagram categorizing nodes into Ingestion, Processing, Intelligence, and Delivery tiers.
  2. **Data Flow Lineage**: Tree visualization mapping data transformations from source payload to destination endpoints.
  3. **Node SLA Scorecard**: Performance matrix displaying execution latency, retry counts, and success rates.
  4. **Executive Metrics KPIs**: High-level impact summary (Estimated Time Saved, Cost Reduction, Monthly Operations).

### 6.2 Multi-Format Workflow Export
- **JSON**: Native workflow definition format and standard n8n JSON format.
- **PNG**: High-resolution raster capture via `html-to-image` at 2x pixel density.
- **SVG**: Scalable vector graphics export preserving crisp typography and node icons.
- **PDF**: Executive presentation brief containing architecture diagram, SLA metrics, and operational details.

### 6.3 Canva Connect API Integration
- Connects via Canva Connect API OAuth 2.0.
- Queries user's authorized presentation and infographic templates (`GET /v1/templates`).
- Auto-fills template placeholders with workflow metadata:
  - Title, description, node count, apps involved, and execution SLA statistics.
- Generates high-fidelity design export URL (`POST /v1/exports`).

---

## 7. Tier 6: Multi-Tenant SaaS Infrastructure & Enterprise Security

### 7.1 7-Tier Role-Based Access Control (RBAC)
Enforced at every API route boundary via `TenantGuard.ts`:

| Role | Permissions |
|---|---|
| **OWNER** | Full workspace management, billing, delete workspace, manage all members |
| **ADMIN** | Manage members, configure credentials, deploy workflows, view audit logs |
| **EDITOR** | Create, edit, test workflows, configure non-secret parameters |
| **OPERATOR** | Trigger workflows, inspect execution history, retry failed executions |
| **VIEWER** | Read-only view of workflows, canvas, and execution metrics |

### 7.2 Cryptographically Chained Audit Logging
- Path: `src/backend/security/AuditLogChainer.ts`.
- Every sensitive workspace mutation (credential created, workflow deployed, execution triggered) records an audit entry.
- Hash chaining ensures tamper-evidence:
  $$H_n = \text{SHA256}(H_{n-1} + \text{timestamp} + \text{tenantId} + \text{userId} + \text{action} + \text{payloadHash})$$
- Verification utility checks the integrity of the entire chain from genesis ($H_0$).

### 7.3 Isolated Script Node Sandboxing
- Path: `src/backend/security/ScriptSandbox.ts`.
- Custom script nodes execute inside isolated Node.js `worker_threads`:
  - **CPU Timeout**: 2,000ms max execution time (terminated via `worker.terminate()`).
  - **Memory Cap**: 64MB V8 heap limit.
  - **Blocked APIs**: `process`, `child_process`, `fs`, `net`, `http`, `require`.
  - Input/Output data marshaled strictly via serialized IPC message channels.

### 7.4 Real-Time Execution Streaming & AI Debugger
- **SSE Route**: `GET /api/workflows/executions/[id]/stream`.
  - Streams real-time Server-Sent Events to the client as each node starts, checkpoints, or completes.
  - All secret keys, authorization tokens, and private fields are scrubbed by `redactSecrets()` before streaming.
- **AI Debugger Assistant**:
  - When an execution fails, the AI assistant analyzes the error message, node input payload, and checkpoint history.
  - Generates actionable root-cause diagnoses and suggests one-click graph fixes.

---

## 8. Directory & Code Layout

```
d:\quickreply\
├── PROJECT_AUDIT.md                       # Comprehensive Baseline Audit (R1)
├── CURRENT_ARCHITECTURE.md                # As-Is System Architecture (R1)
├── SYSTEM_GAP_ANALYSIS.md                 # Requirement Gap Matrix (R1)
├── TARGET_ARCHITECTURE.md                 # Complete Target Blueprint (R1)
├── IMPLEMENTATION_ROADMAP.md              # Phased Migration Plan M1-M7 (R1)
└── NYC-HACKATHON-ROUND-2-\
    ├── src\
    │   ├── app\
    │   │   ├── page.tsx                   # Clean Marketing Landing Page (INVARIANT: UNTOUCHED)
    │   │   ├── features\automation\page.tsx # Public Guest Studio
    │   │   ├── dashboard\automations\page.tsx # SaaS Workspace Studio
    │   │   └── api\
    │   │       ├── ai\workflows\chat\     # Conversational AI & AST Patching
    │   │       ├── workflows\             # Workflow CRUD, compile, deploy
    │   │       ├── executions\            # Execution history, retry, SSE stream
    │   │       ├── credentials\           # Vault management & OAuth refresh
    │   │       └── showcase\canva\        # Canva export & presentation briefs
    │   ├── components\
    │   │   ├── canvas\                    # @xyflow/react Interactive Canvas Engine
    │   │   │   ├── WorkflowCanvas.tsx
    │   │   │   ├── nodes\                 # Custom Nodes (Trigger, Action, Condition, etc.)
    │   │   │   ├── inspector\             # Parameter Inspector Drawer
    │   │   │   └── controls\              # Pan, Zoom, Layout, MiniMap Controls
    │   │   ├── chat\                      # Conversational AI Panel & Patch Preview
    │   │   └── showcase\                  # Workflow Showcase Modal (4 Views)
    │   ├── backend\
    │   │   ├── engine\                    # Durable Execution Engine Core
    │   │   │   ├── DurableExecutionEngine.ts
    │   │   │   ├── CheckpointManager.ts
    │   │   │   ├── CrashRecoveryDaemon.ts
    │   │   │   ├── SafeExpressionEvaluator.ts
    │   │   │   └── EventBus.ts
    │   │   ├── compiler\                  # Workflow Compiler & AST Patch Engine
    │   │   │   ├── WorkflowCompiler.ts
    │   │   │   └── WorkflowPatchEngine.ts
    │   │   ├── nodes\                     # Node SDK & Production Connectors
    │   │   │   ├── NodeSDK.ts
    │   │   │   └── connectors\            # Canva, Gmail, Sheets, Slack, AI, etc.
    │   │   ├── credentials\               # Credential Vault & OAuth Refresh
    │   │   │   ├── CredentialVault.ts
    │   │   │   └── OAuthLifecycleManager.ts
    │   │   └── security\                  # Multi-Tenant SaaS Security
    │   │       ├── TenantGuard.ts
    │   │       ├── AuditLogChainer.ts
    │   │       └── ScriptSandbox.ts
    │   ├── database\
    │   │   └── db.ts                      # Multi-Tenant Persistence & Encryption
    │   └── testing\
    │       └── MockIntegrationServer.ts   # Hermetic Third-Party Mock Server
    └── scripts\
        ├── verify-scenarios-a-to-e.mjs    # Authoritative Acceptance Verification (R8)
        └── release-gate.js                # 15-Gate DevOps Release Enforcement
```
