# As-Is System Architecture Specification

**Document Identifier:** `CURRENT_ARCHITECTURE.md`  
**System Name:** QuickReply AI Automation Operating System  
**Codebase Base:** `d:\quickreply` & `d:\quickreply\NYC-HACKATHON-ROUND-2-`  
**Author:** `worker_m1_audit` (Technical Architecture Specialist)  
**Status:** Authoritative Baseline Documentation  
**Audit Date:** 2026-11-01  

---

## 1. System Overview & Runtime Topology

QuickReply is structured as a full-stack Next.js 16 (App Router) platform running React 19 and Node.js. It integrates conversational AI workflow synthesis, visual graph representation, a multi-format workflow compiler, and multi-tenant persistence.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Browser)                                │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│     Public Marketing View     │             Dedicated Automation Studios                │
│       `src/app/page.tsx`      │  `/features/automation`   &   `/dashboard/automations` │
│  (100% Isolated Clean HTML)   │            (AIAutomationStudio Component)              │
└───────────────┬───────────────┴───────────────────────────┬────────────────────────────┘
                │ HTTP / HTTPS                              │ Fetch / JSON
                ▼                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS 16 APPLICATION RUNNER                             │
│                  (`NYC-HACKATHON-ROUND-2-/server.js` or `next dev --webpack`)          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Middleware Layer (`src/middleware.ts`):                                               │
│    - Session HMAC validation (`session_email`, `session_token`)                        │
│    - Route allowlisting, CORS headers, security policies                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  API Routing Core (206 Route Handlers under `src/app/api/`):                           │
│    - `/api/ai/conversations/*` ──► `AutomationPlannerAgent.ts`                          │
│    - `/api/workflows/*`        ──► `WorkflowCompiler.ts` & `ExecutionProviderFactory.ts`│
│    - `/api/integrations/*`     ──► `IntegrationCatalog.ts` & `CredentialVault.ts`      │
│    - `/api/auth/*`             ──► Session & User Management                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Backend Service Engines (`src/backend/`):                                             │
│    - Planner Agent: Rule-based NLP entity extractor & clarification prompter           │
│    - Workflow Compiler: DFS cycle detection & AST translator (n8n, LangGraph, Native)  │
│    - Execution Provider Factory: Local in-memory runner & remote n8n dispatcher        │
│    - Credential Vault: Opaque credential IDs (`cred_<uuid>`) & regex secret redaction │
└───────────────────────────────┬────────────────────────────────────────────────────────┘
                                │ Persistence & Cache Bus
                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & STORAGE SUBSYSTEM                               │
├───────────────────────────────┬───────────────────────────┬────────────────────────────┤
│       Redis Cache (L1)        │   MongoDB Atlas (L2)      │  Atomic JSON Storage (L3)  │
│      (`ioredis` Pool)         │   (`users` collection)    │  (`src/data/db_*.json`)    │
│   TTL: 60s, Key: `qr:tenant:` │  Document: `user_<email>` │  Fallback / Dev Sandbox    │
└───────────────────────────────┴───────────────────────────┴────────────────────────────┘
```

---

## 2. Frontend Architecture & Component Hierarchy

### 2.1 Marketing Landing Page (`src/app/page.tsx`)
The marketing landing page is strictly isolated from the automation studio:
- **File**: `NYC-HACKATHON-ROUND-2-/src/app/page.tsx` (83 lines, 3,087 bytes).
- **Component Tree**:
  ```
  LandingPage (`src/app/page.tsx`)
  ├── MySamparkHeader (`src/frontend/components/landing/MySamparkHeader.tsx`)
  ├── <main>
  │   ├── MySamparkHero (`src/frontend/components/landing/MySamparkHero.tsx`)
  │   ├── SlidingCardsMarquee (`src/frontend/components/landing/SlidingCardsMarquee.tsx`)
  │   ├── MySamparkMarquee (`src/frontend/components/landing/MySamparkMarquee.tsx`)
  │   ├── MySamparkProblem (`src/frontend/components/landing/MySamparkProblem.tsx`)
  │   ├── MySamparkEverythingItDoes (Dynamic Import)
  │   ├── MySamparkComparison (Dynamic Import)
  │   ├── MySamparkFourSteps (Dynamic Import)
  │   ├── MySamparkProofGrid (Dynamic Import)
  │   ├── MySamparkTestimonials (Dynamic Import)
  │   ├── MySamparkFAQ (Dynamic Import)
  │   └── MySamparkFinalCTA (Dynamic Import)
  └── MySamparkFooter (Dynamic Import)
  ```
- **Architectural Invariant**: This file contains 0 lines of automation studio, canvas, or execution code.

### 2.2 Automation Studio Component Hierarchy
The automation builder UI is encapsulated in `AIAutomationStudio.tsx`:
- **File**: `NYC-HACKATHON-ROUND-2-/src/frontend/components/automation/AIAutomationStudio.tsx` (1,128 lines, 51,287 bytes).
- **Component Hierarchy**:
  ```
  AIAutomationStudio
  ├── StudioHeader
  │   ├── Mode Indicator (Natural Language / Visual DAG)
  │   ├── Preset Dropdown Selector
  │   ├── Dry-Run Test Button
  │   └── Deploy / Export Dropdown
  ├── StudioBody (Dual-Pane Layout)
  │   ├── Left Pane: Conversational AI Assistant
  │   │   ├── ChatMessageList (User messages, Assistant responses)
  │   │   ├── ClarificationChips (Quick-reply buttons for missing parameters)
  │   │   ├── SuggestionPills (Example workflow prompts)
  │   │   └── ChatInputForm (Prompt textarea, submit button)
  │   └── Right Pane: Visual Workflow Inspector
  │       ├── TabHeader (Tabs: "graph" | "json" | "test")
  │       ├── TabContent("graph"): Static DAG DOM List
  │       │   └── dagPreview.nodes.map (Vertical stack with rotated ArrowRight)
  │       ├── TabContent("json"): Syntax-highlighted n8n / Native JSON
  │       ├── TabContent("test"): Dry-Run Test Assertions & Execution Results
  │       └── NodeInspectorDrawer (Opens on node click to inspect parameters)
  └── Modal Dialogs
      ├── N8nConnectionModal (Configures external n8n API URL and API Key)
      └── DeploymentSuccessModal (Displays Webhook URL and Trigger endpoints)
  ```

### 2.3 Current Visual DAG Rendering Mechanism
In `AIAutomationStudio.tsx` (lines 675–733), the workflow graph is rendered as an HTML DOM list:
```tsx
{/* Current DAG Visual Nodes (Static HTML List) */}
<div className="mt-4 space-y-2.5">
  {dagPreview?.nodes && dagPreview.nodes.length > 0 ? (
    dagPreview.nodes.map((node, idx) => (
      <div key={node.id} className="relative">
        <div
          onClick={() => setSelectedNode(node)}
          className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ...`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ...`}>
              {idx + 1}
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{node.data.label}</p>
              <p className="text-[10px] text-slate-500">{node.data.appId} · {node.data.actionId || node.data.type}</p>
            </div>
          </div>
        </div>
        {idx < dagPreview.nodes.length - 1 && (
          <div className="flex justify-center py-1">
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
          </div>
        )}
      </div>
    ))
  ) : (
    <div className="text-center py-8 text-xs text-slate-400">
      Describe an automation in the chat to generate a visual DAG graph.
    </div>
  )}
</div>
```
- **Architectural Limitation**: This DOM list lacks true 2D spatial positioning, draggable canvas nodes, dynamic wire connection handles, pan/zoom viewports, mini-maps, and execution edge particle animations.

---

## 3. Backend Architecture & Service Responsibilities

### 3.1 Primary API Handlers

```
Client ──► /api/ai/conversations ──► Creates conversation session in DB
Client ──► /api/ai/conversations/[id]/messages ──► AutomationPlannerAgent ──► WorkflowSpec v2.0
Client ──► /api/workflows/compile ──► WorkflowCompiler (DFS Acyclic Check) ──► Target ASTs
Client ──► /api/workflows/[id]/test ──► ExecutionProviderFactory ──► AssertionEvaluator
Client ──► /api/workflows/[id]/deploy ──► N8nExecutionProvider / NativeExecutionProvider
```

1. **`POST /api/ai/conversations`** (`src/app/api/ai/conversations/route.ts`):
   - Creates or retrieves an active conversation thread.
   - Binds thread to tenant identity (`session_email` or `guest_demo`).
2. **`POST /api/ai/conversations/[id]/messages`** (`src/app/api/ai/conversations/[id]/messages/route.ts`):
   - Accepts user prompt: `{ message: string, conversationId: string }`.
   - Invokes `AutomationPlannerAgent.processUserPrompt()`.
   - Returns `{ reply: string, workflowSpec: WorkflowSpec, dagPreview: DAGPreview, questions: ClarificationQuestion[] }`.
3. **`POST /api/workflows/compile`** (`src/app/api/workflows/compile/route.ts`):
   - Invokes `WorkflowCompiler.validate(spec)`.
   - Executes DFS cycle detection.
   - If circular dependency is found, halts and returns HTTP 422 Unprocessable Entity with cycle path.
   - Compiles AST to n8n workflow JSON, LangGraph JSON, and Native DAG JSON.
4. **`POST /api/workflows/[id]/test`** (`src/app/api/workflows/[id]/test/route.ts`):
   - Instantiates `ExecutionProviderFactory.getProvider("native")`.
   - Simulates step-by-step data transformation.
   - Evaluates assertions via `AssertionEvaluator.evaluateAll()`.
5. **`GET /api/integrations/catalog`** (`src/app/api/integrations/catalog/route.ts`):
   - Returns metadata for 13 registered apps merged with tenant connection status from `CredentialVault`.

### 3.2 Automation Planner Agent (`AutomationPlannerAgent.ts`)
- **File**: `src/backend/automation/agent/AutomationPlannerAgent.ts` (463 lines).
- **Core Processing Pipeline**:
  1. *Intent Extraction*: Evaluates prompt keywords using regex maps to detect target apps (`gmail`, `sheets`, `slack`, `stripe`, `telegram`, etc.).
  2. *Trigger / Action Synthesis*: Maps detected actions to canonical `IntegrationCatalog` operations.
  3. *Clarification Detection*: Scans required parameters for empty values and injects clarification prompts (`clarify_telegram_chat`, `clarify_sheet_name`).
  4. *Workflow Spec Compilation*: Generates `WorkflowSpec v2.0` with metadata, retry policy, synthetic test cases, and approval gates.
  5. *Versioning*: Bumps workflow version when new actions are conversationally appended.

### 3.3 Workflow Compiler (`WorkflowCompiler.ts`)
- **File**: `src/backend/automation/compiler/WorkflowCompiler.ts` (486 lines).
- **Cycle Detection Algorithm (Lines 110–140)**:
  ```typescript
  public static validateAcyclic(spec: WorkflowSpec): { isValid: boolean; error?: string } {
    const adjList = new Map<string, string[]>();
    // Build adjacency list from spec.steps and edges
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function isCyclic(nodeId: string, path: string[]): boolean {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (isCyclic(neighbor, [...path, neighbor])) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected!
        }
      }
      recStack.delete(nodeId);
      return false;
    }
    // Iterate over all nodes...
  }
  ```
- **AST Generation Engines**:
  - `compileToN8n(spec)`: Translates spec steps to `n8n-nodes-base.*` node schemas, calculates 2D canvas layout coordinates (`position: [x, y]`), and constructs connections mapping.
  - `compileToLangGraph(spec)`: Compiles state graph nodes, edges, conditional branch routers, and checkpointer.
  - `compileToNative(spec)`: Normalizes steps into executable topological stages.

---

## 4. Data & Persistence Architecture (`src/database/db.ts`)

### 4.1 Persistence Layer Triad
The persistence layer (`src/database/db.ts`, 3,717 lines) supports three tiers:
1. **Tier 1 (In-Memory Redis Cache)**:
   - Client: `ioredis`.
   - Key scheme: `qr:tenant:<canonicalTenantId>`.
   - TTL: 60 seconds.
   - Operations: Read-through cache before MongoDB queries; invalidated on `saveDB()`.
2. **Tier 2 (Production MongoDB Atlas Pool)**:
   - Client: `mongodb` (v7.5.0).
   - Singleton client pool (`_mongoClientPromise`) with `maxPoolSize: 50`.
   - Collection: `users`. Document `_id`: `user_<email>` or `global_db_state`.
   - Serverless timeout safeguard: 5000ms query timeout with graceful fallback.
3. **Tier 3 (Local Atomic JSON Filesystem Fallback)**:
   - Path: `src/data/db_<tenantId>.json`.
   - Automatically engaged when `MONGODB_URI` is unset or connection times out.
   - Uses synchronous atomic file replacement via temporary `.tmp` files.

### 4.2 Multi-Tenant Partitioning Model
Tenant isolation is enforced deterministically:
```typescript
export function getCanonicalTenantId(identifier: string): string {
  if (!identifier) return "anonymous_tenant";
  const clean = identifier.toLowerCase().trim();
  if (clean.startsWith("tenant_") || clean.startsWith("ws_")) {
    return clean;
  }
  const hash = crypto.createHash("sha256").update(clean).digest("hex").slice(0, 16);
  return `tenant_${hash}`;
}
```
Every tenant operates within a completely isolated namespace, preventing data bleed across workspaces.

### 4.3 Data Entities & Schema Topology

```
┌────────────────────────────────────────────────────────┐
│                   Tenant Database Root                  │
│               (`db_<canonicalTenantId>.json`)          │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Workflows   │     │ Credentials  │     │  Executions  │
│  Collection  │     │ Vault Store  │     │  Audit Log   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ WorkflowDefinition │ Opaque Token ID    │ ExecutionRecord
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ - id         │     │ - id: cred_* │     │ - id: exec_* │
│ - name       │     │ - type       │     │ - workflowId │
│ - version    │     │ - encrypted  │     │ - status     │
│ - spec (v2.0)│     │ - iv:tag:data│     │ - checkpoints│
│ - nodes      │     │ - expiresAt  │     │ - stepOutputs│
│ - edges      │     │ - workspaceId│     │ - durationMs │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **`WorkflowDefinition`**:
   - `id`: Unique workflow UUID.
   - `name`: Workflow title.
   - `version`: Sequential integer version.
   - `spec`: Canonical `WorkflowSpec v2.0`.
   - `nodes`: Array of workflow nodes (triggers, actions, conditions).
   - `edges`: Array of directional connections between nodes.
   - `targetDeployments`: Record of deployed runtime endpoints (`n8n`, `langgraph`, `native`).
2. **`CredentialRecord`**:
   - `id`: Opaque ID (`cred_<uuid>`).
   - `appId`: Integrated platform ID (`gmail`, `slack`, `hubspot`, etc.).
   - `authType`: `"oauth2" | "apiKey" | "basic"`.
   - `encryptedData`: AES-256-GCM encrypted payload (`iv:authTag:ciphertext`).
   - `expiresAt`: UNIX timestamp for OAuth token expiration.
   - `workspaceId`: Owning tenant namespace.
3. **`ExecutionRecord`**:
   - `id`: Unique execution UUID (`exec_<uuid>`).
   - `workflowId`: Foreign key to `WorkflowDefinition.id`.
   - `status`: `"QUEUED" | "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "FAILED"`.
   - `checkpoints`: Array of atomic node transition checkpoints.
   - `stepOutputs`: Dictionary of intermediate and final node execution payloads.
   - `error`: Error diagnostics and stack trace if failed.

---

## 5. Security & Cryptographic Architecture

### 5.1 Request Authentication & Middleware (`src/middleware.ts`)
- **Session Verification**: Inspects `session_email` and `session_token` cookies.
- **HMAC Signatures**: Verifies that `session_token === HMAC-SHA256(session_email, SESSION_SECRET)`.
- **Extension Auth**: Supports `X-Session-Email` and `X-Session-Token` headers for Chrome extension integrations.
- **Public Route Allowlists**: Bypasses auth strictly for `/`, `/login`, `/register`, `/features/automation`, `/api/health`, and public webhooks.

### 5.2 Token Encryption at Rest (`src/database/db.ts`)
- **Algorithm**: Authenticated AES-256-GCM.
- **Key Derivation**: SHA-256 hash of `TOKEN_ENCRYPTION_KEY` or `SESSION_SECRET` (32 bytes).
- **IV**: 12-byte cryptographically secure random bytes per encryption.
- **Serialization**: `iv_hex:authTag_hex:ciphertext_hex`.
- **Integrity**: Decryption validates the 16-byte GCM authentication tag; any ciphertext tampering throws an error.

### 5.3 Credential Vault Isolation (`CredentialVault.ts`)
- Replaces raw secrets with opaque references: `cred_<uuid>`.
- In-memory secret resolution occurs strictly at execution time inside protected server contexts.
- Workflow definition JSON, client telemetry, and LLM prompts never receive raw API keys or tokens.
- `redactSecrets()` filters regex patterns for Bearer tokens, private keys, and sensitive fields from all execution logs.

---

## 6. Current Architectural Limitations & Bottlenecks

1. **Non-Interactive Visual Graph**:
   - Graph preview is a linear HTML list (`dagPreview.nodes.map`). Lacks 2D node movement, port-based edge wiring, zoom/pan, mini-map, and undo/redo history.
2. **Rule-Based Heuristic AI Planner**:
   - `AutomationPlannerAgent.ts` relies on regex keyword matching, limiting conversational comprehension for nuanced multi-step workflows.
3. **Destructive Conversational Editing**:
   - Adding a step regenerates the entire workflow spec instead of performing an atomic AST graph patch, risking parameter loss.
4. **Lack of Durable State Checkpointing**:
   - In-flight workflow executions are held in transient memory. If the server process restarts, running executions are lost with no crash recovery daemon.
5. **No Safe AST Expression Evaluator**:
   - Dynamic parameter interpolation lacks an AST expression evaluator supporting `{{ $json.field }}` templates without arbitrary `eval()`.
6. **Missing Connectors & Showcase**:
   - Canva Connect API is missing from `IntegrationCatalog.ts`.
   - No presentation showcase modal with multi-tier architecture diagrams, data flow lineage, or multi-format export (JSON, PNG, SVG, PDF).
7. **Multi-Tenancy Governance**:
   - Tenancy exists at data storage level but lacks explicit 7-tier RBAC (`OWNER`, `ADMIN`, `EDITOR`, `OPERATOR`, `VIEWER`), cryptographically chained audit logs, and sandboxed script node execution.
