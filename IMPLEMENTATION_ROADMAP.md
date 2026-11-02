# Phased Implementation Roadmap & Module Preservation Contracts

**Document Identifier:** `IMPLEMENTATION_ROADMAP.md`  
**System Name:** QuickReply AI Automation Operating System & SaaS Platform  
**Target Codebase:** `d:\quickreply` & `d:\quickreply\NYC-HACKATHON-ROUND-2-`  
**Author:** `worker_m1_audit` (Senior Project Architect & Release Engineer)  
**Status:** Authoritative Phased Execution Plan  
**Date:** 2026-11-01  

---

## 1. Executive Summary & Migration Principles

This roadmap establishes a strict, phased engineering progression across Milestones M1 through M7 to fulfill Requirements R1 through R8. 

The primary guiding directive is the **Zero-Regression Principle**:
1. All existing production capabilities (marketing landing page, database persistence, DFS cycle detection, AES-256-GCM encryption) must remain operational without disruption.
2. `src/app/page.tsx` must remain **100% clean marketing code** with zero studio, canvas, or execution logic injected.
3. Every milestone provides concrete verification criteria and executable acceptance tests before advancement.

---

## 2. Milestone Structure & Dependency Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ M1: Baseline Technical Audit & Living Engineering Documents                 │
│ [Audit Docs R1, Preservation Contracts, Canonical Schema Specs]             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ M2: Durable Execution Engine & Safe Expression Evaluator (R4)               │
│ [State Machine, Atomic Checkpoints, Crash Recovery, Event Bus, AST Eval]   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ M3: Extensible Node SDK, Credential Vault & Production Connectors (R5)      │
│ [Node SDK, OAuth Lifecycle, Canva, Sheets, Gmail, Slack, Mock Server]       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│ M4: Interactive Visual Canvas (R2)   │ │ M5: Conversational AI Builder (R3)│
│ [@xyflow/react, 6 Nodes, Inspector]   │ │ [AST Graph Patch Engine, Prompter]│
└───────────────────┬───────────────────┘ └───────────────────┬───────────────┘
                    │                                         │
                    └───────────────────┬─────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ M6: Workflow Showcase, Canva Integration & Enterprise SaaS Security (R6, R7)│
│ [Showcase Modal 4 Views, PNG/SVG/PDF Export, 7-Tier RBAC, Script Sandbox]   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ M7: End-to-End Acceptance Scenarios & Final Verification Gate (R8)          │
│ [Scenarios A, B, C, D, E, 15-Gate Release Verification, Forensic Audit]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Milestone Specifications

### Milestone M1: Baseline Technical Audit & Living Engineering Documents
- **Scope**: Author the 5 core technical audit documents and 12 living engineering specifications; verify preservation contracts.
- **Deliverables**:
  1. `PROJECT_AUDIT.md`: Baseline audit across frontend, backend, database, runtime, security, and tests.
  2. `CURRENT_ARCHITECTURE.md`: As-is architecture, component trees, schemas, and routes.
  3. `SYSTEM_GAP_ANALYSIS.md`: Line-by-line delta mapping against Requirements R1–R8.
  4. `TARGET_ARCHITECTURE.md`: Complete target blueprint across all six architectural tiers.
  5. `IMPLEMENTATION_ROADMAP.md`: Phased migration plan with non-negotiable preservation contracts.
  6. Living Engineering Docs: `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `WORKFLOW_SCHEMA.md`, `NODE_SDK.md`, `INTEGRATION_GUIDE.md`, `AI_BUILDER_DESIGN.md`, `EXECUTION_ENGINE.md`, `SECURITY.md`, `API_DOCUMENTATION.md`, `DEPLOYMENT.md`, `TEST_REPORT.md`, `CHANGELOG.md`.
- **Verification Gate**:
  - `src/app/page.tsx` line count and content verified 100% clean marketing code.
  - All 5 root audit documents created with complete technical specifications.

---

### Milestone M2: Durable Execution Engine & Safe Expression Evaluator
- **Scope**: Build the deterministic Durable Execution Engine (DEE) core in `src/backend/engine/` (Requirement R4).
- **Deliverables**:
  1. `DurableExecutionEngine.ts`: Deterministic topological execution supporting sequential traversal, parallel fork/join synchronization, conditional branching, and loop control (max 1,000 iterations).
  2. `CheckpointManager.ts`: Atomic persistence of state transitions (`NODE_STARTED`, `NODE_COMPLETED`) written to the tenant database.
  3. `CrashRecoveryDaemon.ts`: Startup background scanner identifying incomplete (`RUNNING`, `QUEUED`) executions and resuming them from their last valid checkpoint.
  4. `SafeExpressionEvaluator.ts`: Sandboxed AST evaluator resolving `{{ $json.field }}` templates with ZERO arbitrary `eval()` or `Function()` calls.
  5. `EventBus.ts`: Centralized lifecycle event bus emitting structured telemetry events.
- **Verification Gate**:
  - Unit tests verifying deterministic state transitions, recovery of simulated interrupted executions, parallel fork/join barriers, and AST expression security.

---

### Milestone M3: Extensible Node SDK, Credential Vault & Production Connectors
- **Scope**: Implement formal Node SDK contracts, OAuth 2.0 lifecycle management, and core connectors (Requirement R5).
- **Deliverables**:
  1. `src/backend/nodes/NodeSDK.ts`: Interfaces `INodeDefinition`, `INodeExecutionContext`, `PortDefinition`, and validation helpers.
  2. `src/backend/credentials/OAuthLifecycleManager.ts`: Automated token refresh when `expiresAt - NOW <= 300s`.
  3. Core Production Connectors:
     - `WebhookConnector.ts`: Inbound trigger with signature verification.
     - `HttpRequestConnector.ts`: REST client supporting all HTTP methods, headers, and body payloads.
     - `GoogleSheetsConnector.ts`: Append rows, read ranges.
     - `GmailConnector.ts`: Send email, search inbox.
     - `SlackConnector.ts`: Post message, block kit.
     - `HubSpotConnector.ts`: Upsert contacts, manage CRM deals.
     - `CanvaConnectConnector.ts`: Canva Connect API OAuth2, template search, autofill mapping.
     - `GoogleDriveConnector.ts`: Upload generated design assets.
     - `AIModelConnector.ts`: OpenAI SDK and Anthropic Claude SDK direct model invocation.
  4. `src/testing/MockIntegrationServer.ts`: Deterministic in-process mock server simulating Google, Slack, HubSpot, Canva, and Gmail endpoints.
- **Verification Gate**:
  - Automated connector test suite executing against `MockIntegrationServer.ts` with zero secrets leaked.

---

### Milestone M4: Interactive Visual Workflow Canvas Engine
- **Scope**: Install `@xyflow/react` v12 and build the interactive 2D canvas in `src/components/canvas/` (Requirement R2).
- **Deliverables**:
  1. `@xyflow/react` installation and React 19 compatibility validation.
  2. `WorkflowCanvas.tsx`: 2D canvas supporting drag-and-drop node creation, port wiring, panning, zooming, and mini-map.
  3. 6 Specialized Custom Nodes: `TriggerNode`, `ActionNode`, `ConditionNode` (dual `true`/`false` ports), `LoopNode`, `AINode`, `ScriptNode`.
  4. `ParameterInspectorDrawer.tsx`: Dynamic schema-driven property editor with variable autocomplete.
  5. `useWorkflowStudioStore.ts`: Zustand store managing canvas graph state, dirty tracking, and undo/redo history.
  6. Real-time execution animation: Pulsing node status indicators and edge particle flow visualization.
- **Verification Gate**:
  - Visual verification of node creation, drag-and-drop, wiring, and parameter inspection.
  - Zero canvas code injected into `src/app/page.tsx`.

---

### Milestone M5: Conversational AI Workflow Builder & AST Graph Patch Engine
- **Scope**: Integrate conversational AI assistant with non-destructive graph patching (Requirement R3).
- **Deliverables**:
  1. `AutomationPlannerAgent.ts`: Upgraded LLM agent using structured JSON schemas to infer nodes, triggers, and parameters from natural language prompts.
  2. `WorkflowPatchEngine.ts`: RFC 6902-style graph patch mutator (`INSERT_NODE`, `INSERT_BRANCH`, `UPDATE_PARAMETERS`, `REMOVE_NODE`) preserving existing configurations.
  3. Interactive Parameter & Credential Prompter: Structured quick-reply suggestions in chat and parameter highlights on canvas.
  4. Bidirectional Canvas Sync: Chat modifications trigger atomic visual canvas updates in real time.
- **Verification Gate**:
  - Conversational modification test: Ingesting a prompt to add a condition into an existing workflow updates the graph without altering existing node parameters.

---

### Milestone M6: Workflow Showcase, Canva Integration & Enterprise SaaS Security
- **Scope**: Presentation showcase mode, Canva Connect export, 7-tier RBAC, and sandboxed script execution (Requirements R6, R7).
- **Deliverables**:
  1. `WorkflowShowcaseModal.tsx`: 4 presentation views (Multi-Tier Architecture Diagram, Data Flow Lineage, Node SLA Scorecard, Metrics KPIs).
  2. Multi-Format Export Engine: Export to native JSON, n8n JSON, high-res PNG (`html-to-image`), vector SVG, and executive PDF briefs.
  3. Canva Connect API Pipeline: OAuth2 connection, template search, auto-fill brief mapping, and design export.
  4. `TenantGuard.ts`: Strict 7-tier RBAC enforcement (`OWNER`, `ADMIN`, `EDITOR`, `OPERATOR`, `VIEWER`).
  5. `AuditLogChainer.ts`: Tamper-evident cryptographic audit logs where $H_n = \text{SHA256}(H_{n-1} + \dots)$.
  6. `ScriptSandbox.ts`: Isolated Node.js `worker_threads` for custom script execution (2s CPU timeout, 64MB memory cap, blocked Node.js APIs).
  7. Real-Time Execution Streaming: SSE route `/api/workflows/executions/[id]/stream` with secret redaction and AI failure diagnosis.
- **Verification Gate**:
  - Export test verifying PNG/SVG/PDF generation; RBAC boundary verification; script sandbox termination of timeout loops.

---

### Milestone M7: End-to-End Acceptance Scenarios & Final Verification Gate
- **Scope**: Implement and certify Scenarios A through E and execute final release gate (Requirement R8).
- **Deliverables**:
  1. `scripts/verify-scenarios-a-to-e.mjs`: Dedicated zero-mock test runner certifying:
     - **Scenario A (Lead Generation Pipeline)**: Webhook -> Input Validation -> Google Sheets -> AI Classification -> Conditional Branch -> HubSpot -> Slack.
     - **Scenario B (Email Intelligence & Approval)**: Gmail -> Retrieve Message -> AI Summarization -> Human Approval Gate -> Slack.
     - **Scenario C (Canva Content Automation)**: Schedule Trigger -> Google Sheets -> AI Content Generation -> Canva Autofill -> Export -> Google Drive -> Gmail.
     - **Scenario D (Failure Recovery & Retry)**: Webhook -> HTTP Action -> Simulated Failure (503) -> Exponential Backoff Retry -> Success.
     - **Scenario E (Conversational Modification & Preservation)**: Workflow Creation -> Conversational Insertion of Condition -> Preservation of existing node configurations.
  2. Integration with `scripts/release-gate.js`: All 15 DevOps gates passing cleanly.
- **Verification Gate**:
  - 100% pass across Scenarios A through E.
  - Forensic audit sign-off certifying genuine implementations, zero mocked results, and complete architectural compliance.

---

## 4. Non-Negotiable Module Preservation Contracts

To ensure absolute stability, the following module contracts are enforced across all milestones:

### Contract 1: Marketing Landing Page (`src/app/page.tsx`)
- **Invariant**: Must remain **100% clean marketing code**.
- **Rules**:
  - NO imports from `src/components/canvas/*` or `src/frontend/components/automation/*`.
  - NO studio state, canvas controls, or execution buttons injected into `src/app/page.tsx`.
  - Must strictly preserve dynamic imports: `MySamparkHeader`, `MySamparkHero`, `SlidingCardsMarquee`, `MySamparkMarquee`, `MySamparkProblem`, etc.
- **Verification**: Line count must remain ~83 lines; zero workflow studio symbols.

### Contract 2: Marketing Visual Components (`src/frontend/components/landing/*`)
- **Invariant**: All landing page presentation components must remain untouched.
- **Rules**: Preserve styling, animations, marquee timings, and responsive layouts.

### Contract 3: Multi-Tenant Database Engine (`src/database/db.ts`)
- **Invariant**: Core persistence and encryption signatures must remain backwards-compatible.
- **Rules**:
  - Preserve `getDB(email)`, `saveDB(data, email)`, `getCanonicalTenantId(id)`.
  - Preserve `encryptToken(plaintext)` and `decryptToken(ciphertext)` using authenticated AES-256-GCM.
  - Extend document schemas non-destructively by adding optional properties for new entities.

### Contract 4: Graph Acyclic Compiler (`WorkflowCompiler.ts`)
- **Invariant**: Strict DFS cycle detection algorithm must remain enforced.
- **Rules**:
  - Any workflow mutation that introduces a cycle must return HTTP 422 Unprocessable Entity.
  - AST generation for n8n and LangGraph must maintain existing property mappings.

### Contract 5: Middleware & Authentication (`src/middleware.ts` & `src/backend/auth.ts`)
- **Invariant**: Session verification, public route allowlists, and HMAC security tokens must remain active.
- **Rules**: Public routes (`/`, `/features/automation`, `/login`) must remain accessible without auth.

### Contract 6: DevOps Release Gate (`scripts/release-gate.js`)
- **Invariant**: All 15 existing release gates must remain active and pass before release.
- **Rules**: Add Scenarios A–E verification as an integrated prerequisite gate.

---

## 5. Risk Assessment & Rollback Strategies

| Identified Architectural Risk | Severity | Mitigation Strategy | Rollback Action |
|---|---|---|---|
| **React 19 Canvas Incompatibility** | HIGH | `@xyflow/react` v12 officially supports React 19. If peer dependency warnings arise, configure resolution flags without compromising engine runtime. | Revert canvas package installation; isolate canvas in dedicated boundary. |
| **Breaking `src/app/page.tsx`** | CRITICAL | Keep studio strictly at `/features/automation` and `/dashboard/automations`. Add CI check verifying `src/app/page.tsx` diff is empty. | `git checkout HEAD -- src/app/page.tsx` immediately restores clean marketing state. |
| **Expression Evaluator Vulnerability** | CRITICAL | Strictly prohibit `eval()` or `new Function()`. Use safe recursive AST parser evaluating only `$json`, `$env`, and primitive operators. | Fall back to strict dot-notation lookup if AST parsing fails. |
| **Runaway Worker Thread CPU Spikes** | MEDIUM | Script sandbox enforces 2,000ms hard execution timeout via `worker.terminate()` and 64MB memory cap. | Kill worker thread and return HTTP 408 Request Timeout. |
| **Third-Party API Rate Limits / Outages** | MEDIUM | `MockIntegrationServer.ts` provides 100% deterministic local mock fixtures for all E2E acceptance tests. | Switch test runner to local mock server mode if external credentials are absent. |
