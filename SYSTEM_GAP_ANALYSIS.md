# Systematic Requirement Gap Analysis (R1–R8)

**Document Identifier:** `SYSTEM_GAP_ANALYSIS.md`  
**System Name:** QuickReply AI Automation Operating System & SaaS Platform  
**Target Codebase:** `d:\quickreply` & `d:\quickreply\NYC-HACKATHON-ROUND-2-`  
**Author:** `worker_m1_audit` (Technical Architecture Specialist)  
**Status:** Authoritative Architectural Delta Specification  
**Audit Date:** 2026-11-01  

---

## 1. Executive Summary

This document performs an exhaustive, requirement-by-requirement delta analysis comparing the current repository state against the target specification for Requirements R1 through R8. For each requirement, this analysis identifies existing components, missing capabilities, architectural risks, and concrete engineering remediation steps.

---

## 2. Requirement-by-Requirement Gap Matrix

| Requirement | Current Repository State | Target Specification State | Delta / Gap Severity | Primary Action Required |
|---|---|---|---|---|
| **R1: Deep Audit & Preservation** | High-level survey in `.agents/teamwork/` and scattered markdown docs | 5 authoritative root audit docs (`PROJECT_AUDIT.md`, `CURRENT_ARCHITECTURE.md`, `SYSTEM_GAP_ANALYSIS.md`, `TARGET_ARCHITECTURE.md`, `IMPLEMENTATION_ROADMAP.md`) + 12 living engineering docs; strict `src/app/page.tsx` invariant | **HIGH** | Author 5 root audit docs and establish formal preservation contracts across all modules |
| **R2: Visual Workflow Canvas** | Linear HTML DOM list in `AIAutomationStudio.tsx` (lines 675–733) with rotated arrow icons | `@xyflow/react` v12 2D canvas with 6 custom node types, drag-and-drop catalog, port connections, pan/zoom, mini-map, undo/redo, auto-layout, execution animations | **CRITICAL** | Install `@xyflow/react`, replace static DOM list with interactive canvas synchronized to `WorkflowDefinitionV3` |
| **R3: Conversational AI Builder** | Rule-based regex NLP in `AutomationPlannerAgent.ts`; destructive full-spec regeneration on updates | LLM-powered assistant (Anthropic / OpenAI) with schema-constrained outputs, AST Graph Patch Engine (`rfc6902`), non-destructive graph editing, parameter prompter | **HIGH** | Integrate LLM reasoning, implement `WorkflowPatchEngine`, and bind patch preview to visual canvas |
| **R4: Durable Execution Engine** | In-memory synchronous runner (`NativeExecutionProvider.ts`) and external n8n HTTP client; no persistence across restarts | Deterministic Durable Execution Engine (DEE) with atomic checkpoints (`NODE_STARTED`, `NODE_COMPLETED`), crash recovery daemon, parallel fork/join, loop control, retries with backoff, safe AST expression evaluation | **CRITICAL** | Build DEE core in `src/backend/engine/`, checkpoint persistence in DB, crash recovery daemon, and safe AST expression evaluator |
| **R5: Node SDK & Integrations** | Map-based `IntegrationCatalog.ts` with 13 apps; manual credentials | Formal Node SDK (`INodeDefinition`, `INodeExecutionContext`), automated OAuth token refresh (`expiresAt - NOW <= 300s`), Canva Connect API, OpenAI SDK, Anthropic SDK, Google Drive; Mock Integration Server | **HIGH** | Formalize Node SDK contracts, implement missing connectors (Canva, AI, Drive), and build Mock Integration Server for hermetic testing |
| **R6: Showcase & Canva Integration** | Raw JSON inspection view and basic execution time displays | 4-view Showcase Modal (Architecture, Data Flow, SLA Scorecard, Metrics KPIs), multi-format export (JSON, PNG, SVG, PDF), Canva Connect API OAuth & template population | **HIGH** | Build Showcase presentation modal, implement `html-to-image` export pipelines, and integrate Canva Connect API client |
| **R7: Multi-Tenant SaaS Security** | Data-level tenant partitioning via `getCanonicalTenantId`; basic session auth | 7-tier RBAC (`OWNER` to `VIEWER`), cryptographically chained audit logs ($H_n = \text{SHA256}(H_{n-1} + \dots)$), isolated worker thread script sandbox, SSE execution streaming with secret redaction | **HIGH** | Implement `TenantGuard.ts`, `AuditLogChainer.ts`, isolated script sandbox via Node worker threads, and SSE streaming route |
| **R8: End-to-End Acceptance Scenarios** | 10 older acceptance scenarios in `scripts/verify-acceptance-scenarios.mjs` | 5 explicit target scenarios: Scenario A (Lead Gen), Scenario B (Email Intelligence), Scenario C (Canva Automation), Scenario D (Failure Recovery), Scenario E (Conversational Modification) | **HIGH** | Create dedicated test runner `scripts/verify-scenarios-a-to-e.mjs` and verify against live server and mock fixtures |

---

## 3. Detailed Subsystem Gap Analysis

### 3.1 Requirement R1: Technical Audit & Codebase Preservation

#### Existing Implementation
- High-level survey completed by `explorer_survey_r2_1` in `.agents/teamwork/explorer_survey_r2_1/audit_survey.md`.
- Marketing landing page `src/app/page.tsx` is completely isolated from automation studio code (83 lines).
- Existing compiler and database logic are operational.

#### Target Specification Gaps
- The project root `d:\quickreply\` lacks the 5 mandatory audit and architecture documents required by Requirement R1:
  1. `PROJECT_AUDIT.md` (authoritative technical baseline across all subsystems)
  2. `CURRENT_ARCHITECTURE.md` (as-is system design, component hierarchy, data models)
  3. `SYSTEM_GAP_ANALYSIS.md` (detailed line-by-line delta mapping to R1–R8)
  4. `TARGET_ARCHITECTURE.md` (comprehensive multi-tier target design specification)
  5. `IMPLEMENTATION_ROADMAP.md` (phased M1–M7 migration plan with preservation contracts)
- Need to author 12 living engineering documents defining canonical interface schemas (`WORKFLOW_SCHEMA.md`, `NODE_SDK.md`, `DATABASE_SCHEMA.md`, etc.).

#### Remediation Plan
- Author all 5 root audit documents with exhaustive technical detail.
- Formalize non-negotiable preservation contracts protecting `src/app/page.tsx`, `src/database/db.ts`, and `WorkflowCompiler.ts`.

---

### 3.2 Requirement R2: Visual Workflow Canvas

#### Existing Implementation
- In `NYC-HACKATHON-ROUND-2-/src/frontend/components/automation/AIAutomationStudio.tsx` (lines 675–733), the workflow graph is displayed as a simple vertical HTML list:
  - Iterates over `dagPreview.nodes.map((node, idx) => ...)`.
  - Renders a static styled card with icon, label, and step index.
  - Renders a static rotated down-arrow (`<ArrowRight className="rotate-90" />`) between nodes.
  - On click, sets `selectedNode` to open a basic parameter preview drawer.

#### Target Specification Gaps
1. **Interactive Canvas Engine**: `@xyflow/react` is not installed in `package.json`. There is no 2D pannable, zoomable canvas viewport.
2. **Node Creation & Manipulation**: Users cannot drag new nodes from a catalog drawer onto the canvas, nor can they drag nodes to reposition them.
3. **Edge Connections**: Users cannot click output ports and drag connection wires to input ports, nor can they delete or rewire existing edges.
4. **Custom Node Types**: No specialized visual node components for:
   - `TriggerNode` (Webhook, Cron, Event with distinctive badge and pulse)
   - `ActionNode` (Service integration action with status indicators)
   - `ConditionNode` (Dual output ports: `true` and `false` branches)
   - `LoopNode` (Iteration counter and loop-body ports)
   - `AINode` (Prompt, model selector, temperature)
   - `ScriptNode` (Code editor with syntax highlighting)
5. **Canvas Utilities**: No Dagre / elkjs auto-layout, mini-map, background grid, or undo/redo action history stack.
6. **Execution State Synchronization**: The visual canvas does not animate active execution flows (e.g., animated edge pulses, running spinners, green/red success/failure badges).

#### Remediation Plan
- Install `@xyflow/react` v12 in `NYC-HACKATHON-ROUND-2-`.
- Build modular canvas engine in `src/components/canvas/WorkflowCanvas.tsx`.
- Implement custom node views with React Flow handles (`<Handle type="source" />`, `<Handle type="target" />`).
- Implement dynamic parameter inspector drawer syncing bidirectionally with the active canvas node.
- Add undo/redo history store via Zustand.

---

### 3.3 Requirement R3: Conversational AI Workflow Builder

#### Existing Implementation
- `src/backend/automation/agent/AutomationPlannerAgent.ts` (463 lines):
  - Uses regex keyword heuristics to identify platforms and operations.
  - Detects missing required parameters and generates clarification prompts (`clarify_telegram_chat`, `clarify_sheet_name`).
  - Synthesizes `WorkflowSpec v2.0`.
  - Increments version counter when new steps are appended.

#### Target Specification Gaps
1. **Unconstrained NLP & LLM Reasoning**: Relies on static regex pattern matching rather than modern LLM function calling / structured JSON schema output (Anthropic Claude 3.5 Sonnet / OpenAI GPT-4o).
2. **Non-Destructive Graph Editing (AST Patch Engine)**: When a user asks to modify a workflow (e.g., *"Insert a condition before Slack to check if amount > 5000"*), the current system generates an entirely new spec from scratch, potentially overwriting existing user-configured parameters.
3. **Structured RFC 6902 Patch Mutator**: No AST Graph Patch Engine supporting atomic operations:
   - `INSERT_NODE`: Injects a node between two existing connected nodes.
   - `INSERT_BRANCH`: Splits a single edge into conditional `true`/`false` branches.
   - `UPDATE_PARAMETERS`: Modifies specific parameters of an existing node while leaving connections intact.
   - `REMOVE_NODE`: Removes a node and automatically heals the broken edge connection.
4. **Interactive Parameter Prompter**: Lacks structured quick-reply prompters on canvas when required credentials or parameters are missing.

#### Remediation Plan
- Integrate LLM client with structured schema constraints.
- Implement `WorkflowPatchEngine.ts` in `src/backend/compiler/` supporting atomic non-destructive graph operations.
- Update `/api/ai/conversations/[id]/messages` to return unified `GraphPatch` payloads that mutate the visual canvas in real time.

---

### 3.4 Requirement R4: Durable Execution Engine & Event System

#### Existing Implementation
- `src/backend/automation/runtime/ExecutionProviderFactory.ts` (480 lines):
  - `NativeExecutionProvider`: In-memory step execution with simulated data outputs.
  - `N8nExecutionProvider`: Dispatches HTTP calls to an external n8n instance or provisions a guest sandbox.
  - `AssertionEvaluator`: Evaluates dot-notation assertions.
- `src/backend/workflows/WorkflowEngine.ts` (318 lines): Basic DAG state machine with status tracking.

#### Target Specification Gaps
1. **Durable State & Atomic Checkpointing**:
   - Current executions are held in transient Node.js memory.
   - No persistent checkpoint is written to `src/database/db.ts` or MongoDB upon node transition (`NODE_STARTED`, `NODE_COMPLETED`).
2. **Crash Recovery Daemon**:
   - If the Next.js / Node.js process crashes or restarts, running workflows remain stranded in `RUNNING` state indefinitely.
   - No background recovery daemon resumes interrupted executions from their last atomic checkpoint.
3. **Parallel Fork / Join & Loops**:
   - The current engine executes steps sequentially. It lacks parallel branch fork execution with synchronization join barriers (`Promise.all` / join barrier).
   - Lacks dedicated `LoopNode` iteration control (with safety limit of max 1,000 iterations).
4. **Exponential Backoff Retries**:
   - Node retry policies with exponential backoff and jitter ($t = \text{base} \times 2^{\text{attempt}} \pm \text{jitter}$) are not enforced at runtime.
5. **Safe Expression Evaluator**:
   - Dynamic parameter expressions (e.g. `{{ $json.amount > 5000 }}`) lack a sandboxed AST expression evaluator. Arbitrary `eval()` or `Function()` calls on the main thread violate platform security standards.
6. **Structured Event Bus**:
   - Lacks a centralized lifecycle event bus emitting structured events (`execution.queued`, `execution.started`, `node.started`, `node.completed`, `node.failed`, `execution.completed`).

#### Remediation Plan
- Build `DurableExecutionEngine.ts` in `src/backend/engine/`.
- Implement `CheckpointManager.ts` writing atomic state to the tenant database.
- Implement `CrashRecoveryDaemon.ts` running on server boot to resume incomplete executions.
- Implement `SafeExpressionEvaluator.ts` using an AST parser (zero arbitrary `eval()`).
- Implement `EventBus.ts` broadcasting structured lifecycle events.

---

### 3.5 Requirement R5: Extensible Node System, Credentials & Integrations

#### Existing Implementation
- `src/backend/automation/catalog/IntegrationCatalog.ts` (764 lines) registers 13 apps (`gmail`, `google_sheets`, `telegram`, `slack`, `whatsapp`, `stripe`, `hubspot`, `clock`, `ai_extractor`, `approval_gate`, `custom_webhook`, `webhook`, `postgres`).
- `src/backend/automation/vault/CredentialVault.ts` (141 lines) stores encrypted credentials with opaque IDs (`cred_<uuid>`) and regex secret redaction.

#### Target Specification Gaps
1. **Formal Node SDK Contracts**:
   - Integration definitions are currently unstructured configuration objects.
   - Missing formal TypeScript SDK contracts:
     - `INodeDefinition`: Metadata, input/output port definitions, parameter schemas, execution handler.
     - `INodeExecutionContext`: Injected runtime utilities, decrypted credential resolver, logger, HTTP client, checkpoint hook.
2. **Missing Production Connectors**:
   - **Canva Connect API**: Missing OAuth 2.0 connector, template search, auto-fill, and export.
   - **OpenAI SDK Connector**: Missing direct model invocation (`gpt-4o`, `gpt-4o-mini`, embeddings).
   - **Anthropic SDK Connector**: Missing direct model invocation (`claude-3-5-sonnet`, `claude-3-5-haiku`).
   - **Google Drive Connector**: Missing file upload and permission sharing for generated assets.
3. **OAuth Token Refresh Lifecycle**:
   - `CredentialVault.ts` stores tokens but does NOT automatically refresh expiring OAuth tokens when $t_{\text{expire}} - t_{\text{now}} \le 300\text{s}$.
4. **Hermetic Mock Integration Server**:
   - External services require real credentials or fail. A deterministic local Mock Integration Server is required to simulate third-party OAuth, Canva, Google, HubSpot, and Slack endpoints for hermetic testing.

#### Remediation Plan
- Define `INodeDefinition` and `INodeExecutionContext` in `src/backend/nodes/NodeSDK.ts`.
- Implement connectors for Canva Connect API, OpenAI, Anthropic, Google Drive, Google Sheets, Gmail, Slack, HubSpot, and Webhook.
- Implement `OAuthLifecycleManager.ts` with automated refresh rotation.
- Build `MockIntegrationServer.ts` in `src/testing/` to provide deterministic endpoints for automated verification.

---

### 3.6 Requirement R6: Workflow Showcase & Canva Integration

#### Existing Implementation
- The current studio provides basic JSON viewing (`rightPanelTab === "json"`) and execution duration metrics in test cards.
- No dedicated presentation mode or graphic export capabilities exist.

#### Target Specification Gaps
1. **Presentation Showcase Modal**:
   - No interactive presentation view showcasing workflow architecture, data flow lineage, node SLAs, and execution metrics.
   - Missing 4 specialized presentation views:
     - View 1: Multi-Tier Architecture Diagram (visual layers)
     - View 2: Data Flow Lineage (input payload to transformed outputs)
     - View 3: Node SLA Scorecard (execution time, error rate, retries)
     - View 4: Executive Metrics KPIs (ROI, time saved, operations count)
2. **Multi-Format Workflow Export**:
   - Lacks export pipelines to high-resolution PNG (`html-to-image`), vector SVG, and executive PDF briefs.
3. **Canva Connect API Integration**:
   - No OAuth 2.0 connection to Canva Connect API.
   - No template search, autofill mapping of workflow summaries to design templates, or design export pipeline.

#### Remediation Plan
- Build `WorkflowShowcaseModal.tsx` in `src/components/showcase/` supporting all 4 presentation views.
- Implement client-side export pipelines for JSON, PNG, SVG, and PDF.
- Build `CanvaConnectClient.ts` supporting OAuth authentication, template population, and export URL generation.

---

### 3.7 Requirement R7: Multi-Tenant SaaS Infrastructure, Security & Monitoring

#### Existing Implementation
- `src/database/db.ts` implements multi-tenant document isolation via `getCanonicalTenantId()`.
- AES-256-GCM token encryption protects credentials at rest.
- `src/middleware.ts` enforces HMAC session cookie verification.

#### Target Specification Gaps
1. **7-Tier Role-Based Access Control (RBAC)**:
   - Current tenancy checks session email but does not enforce fine-grained workspace roles (`OWNER`, `ADMIN`, `EDITOR`, `OPERATOR`, `VIEWER`).
2. **Cryptographically Chained Audit Logging**:
   - Audit logs exist as plain JSON records. They lack cryptographic hash chaining where:
     $$H_n = \text{SHA256}(H_{n-1} + \text{timestamp} + \text{userId} + \text{action} + \text{payload})$$
     preventing tamper-evident log validation.
3. **Isolated Custom Script Sandboxing**:
   - Custom script execution nodes run directly in the main Node.js process without memory or CPU constraints.
   - Missing worker thread isolation with 2-second timeout, 64MB memory limit, and blocked Node.js global APIs (`process`, `child_process`, `fs`).
4. **Real-Time Execution Streaming & AI Debugger**:
   - Lacks Server-Sent Events (SSE) streaming endpoint (`/api/workflows/executions/[id]/stream`) providing live node-by-node telemetry with secret redaction.
   - Lacks AI failure diagnosis assistant analyzing error traces and recommending automatic fixes.

#### Remediation Plan
- Implement `TenantGuard.ts` enforcing 7-tier RBAC across all workflow endpoints.
- Implement `AuditLogChainer.ts` generating SHA-256 cryptographic hash chains for every workspace action.
- Implement `ScriptSandbox.ts` using Node.js `worker_threads` with strict resource limits.
- Implement SSE execution streaming endpoint and AI debugger prompt integration.

---

### 3.8 Requirement R8: End-to-End Acceptance Scenarios

#### Existing Implementation
- `scripts/verify-acceptance-scenarios.mjs` (400 lines) executes 10 older scenarios (Cron -> Gmail, Multi-App, Ambiguous prompt, Missing credentials, Cycle detection, Dry-run, Conversational versioning, Multi-tenancy, Deployment, Checkpoints).

#### Target Specification Gaps
- Requirement R8 explicitly mandates five specific end-to-end acceptance scenarios:
  - **Scenario A: Lead Generation Pipeline**: Webhook trigger -> Input Validation -> Google Sheets append -> AI Classification -> Conditional Branch (High Value vs Standard) -> HubSpot CRM upsert -> Slack notification.
  - **Scenario B: Email Intelligence & Approval**: Gmail trigger -> Retrieve message -> AI Summarization -> Human Approval Gate -> Slack notification.
  - **Scenario C: Canva Content Automation**: Scheduled trigger -> Google Sheets read -> AI Content Generation -> Canva Template Autofill -> Export Design -> Google Drive upload -> Gmail notification.
  - **Scenario D: Failure Recovery & Exponential Retries**: Webhook trigger -> HTTP API action -> Simulated failure (HTTP 503) -> Retry with exponential backoff -> Successful continuation.
  - **Scenario E: Conversational Modification & Preservation**: Workflow creation -> Conversational insertion of conditional logic branch -> Preservation of existing node parameters and connections.

#### Remediation Plan
- Create authoritative test runner: `scripts/verify-scenarios-a-to-e.mjs`.
- Provide mock fixtures and server handlers in `src/testing/MockIntegrationServer.ts` enabling deterministic zero-mock execution of all 5 scenarios without requiring live third-party cloud credentials.
- Integrate Scenarios A–E verification into the 15-gate DevOps release runner (`scripts/release-gate.js`).
