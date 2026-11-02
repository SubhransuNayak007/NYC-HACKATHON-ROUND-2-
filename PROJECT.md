# Project: AI-Native Visual Automation Platform and SaaS

## Architecture
The platform is built on Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, and `@xyflow/react`.
It features a dual-layer architecture:
1. **Frontend Presentation & Canvas Layer**:
   - Clean landing page marketing state preserved at `src/app/page.tsx` (0 studio injections).
   - Dedicated public feature studio at `/features/automation` (`src/app/features/automation/page.tsx`).
   - Dedicated SaaS dashboard studio at `/dashboard/automations` (`src/app/dashboard/automations/page.tsx`).
   - Interactive `@xyflow/react` visual canvas with custom nodes (Trigger, Action, Condition, Loop, AI, Script), drag-and-drop catalog drawer, dynamic schema parameter inspector, undo/redo, auto-layout, mini-map, and execution animation.
   - Conversational AI Builder with AST Graph Patch Engine for non-destructive workflow updates.
   - Workflow Showcase Modal with multi-tier architecture diagrams, data flow lineage, metrics KPIs, and Canva Connect API export.
2. **Backend Engine, Integration & SaaS Layer**:
   - **Durable Execution Engine (DEE)**: Deterministic execution, atomic checkpointing after every node transition, crash recovery daemon, parallel fork/join synchronization, loop control, exponential backoff retries, lifecycle event bus, and safe AST expression evaluator (zero arbitrary `eval()`).
   - **Node SDK & Credential Vault**: Declarative schema validation, AES-256-GCM encryption at rest, opaque credential IDs (`cred_<uuid>`), OAuth 2.0 token refresh lifecycle, and production connectors for Webhook, HTTP, Google Sheets, Gmail, Slack, HubSpot, Canva Connect API, Google Drive, OpenAI, and Anthropic.
   - **Multi-Tenant SaaS Infrastructure**: Strict workspace isolation, 7-tier RBAC (`OWNER` to `VIEWER`), cryptographically chained audit logs ($H_n = \text{SHA256}(H_{n-1} + \dots)$), plan limits, SSE execution streaming, and worker-thread script sandboxing.
   - **Mock Integration Server & Test Harness**: Deterministic local API mocks for third-party services enabling repeatable E2E scenario execution.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Baseline Repository Audit | Full technical audit of frontend, backend, database, runtime, and tests | M1 | R1 Survey |
| 2 | System Gap Analysis & Roadmaps | Produce PROJECT_AUDIT.md, CURRENT_ARCHITECTURE.md, SYSTEM_GAP_ANALYSIS.md, TARGET_ARCHITECTURE.md, IMPLEMENTATION_ROADMAP.md | M1 | R1 Survey |
| 3 | Living Engineering Documents | Author 12 living docs (ARCHITECTURE.md, DATABASE_SCHEMA.md, WORKFLOW_SCHEMA.md, NODE_SDK.md, INTEGRATION_GUIDE.md, AI_BUILDER_DESIGN.md, EXECUTION_ENGINE.md, SECURITY.md, API_DOCUMENTATION.md, DEPLOYMENT.md, TEST_REPORT.md, CHANGELOG.md) | M1 | R1 Survey |
| 4 | Working Module Preservation Contracts | Define contracts preserving clean landing page (`src/app/page.tsx`), existing compiler algorithms, and db layer | M1 | R1 Survey |
| 5 | Durable Execution Engine Core | Deterministic execution supporting sequential DAG traversal, parallel fork/join, condition branching, and loop nodes (max 1000 iter) | M2 | R4 Survey |
| 6 | Checkpoint Persistence & Crash Recovery | Atomic state saves on node transitions (`NODE_STARTED`, `NODE_COMPLETED`), crash recovery daemon resuming incomplete executions on boot | M2 | R4 Survey |
| 7 | Execution Retries & Exponential Backoff | Node-level retry policies with exponential backoff and jitter | M2 | R4 Survey |
| 8 | Structured Lifecycle Event Bus | Event emission (`execution.queued`, `started`, `node_started`, `node_completed`, `failed`, etc.) for real-time tracking | M2 | R4 Survey |
| 9 | Safe Expression Evaluator | Sandboxed AST expression evaluator resolving `{{ $json.field }}` and template variables with zero arbitrary `eval()` | M2 | R4 Survey |
| 10 | Trigger System (Webhook & Cron) | Webhook triggers with signature validation, cron/scheduled triggers, manual triggers, and app event triggers | M2 | R4 Survey |
| 11 | Formal Node SDK | Declarative schema validation, input/output port definitions, `INodeDefinition` and `INodeExecutionContext` contracts | M3 | R5 Survey |
| 12 | Secure Credential Vault | AES-256-GCM encryption at rest, opaque IDs (`cred_<uuid>`), zero secrets in workflow JSON, automatic secret redaction | M3 | R5 Survey |
| 13 | OAuth 2.0 Lifecycle & Token Refresh | Automated refresh token rotation when $expiresAt - NOW \le 300s$, workspace isolation | M3 | R5 Survey |
| 14 | Production Core Connectors | Production connectors for Webhook, HTTP Request, Google Sheets, Gmail, Slack, HubSpot, Canva Connect API, Google Drive, OpenAI SDK, Anthropic SDK | M3 | R5 Survey |
| 15 | Mock Integration Server | Deterministic local server simulating third-party OAuth, Google, Slack, HubSpot, Canva, and Gmail endpoints for hermetic testing | M3 | R8 Survey |
| 16 | Interactive Visual Canvas Engine | `@xyflow/react` v12 canvas with pan, zoom, mini-map, background grid, and Dagre auto-layout | M4 | R2 Survey |
| 17 | Custom Canvas Node System | Specialized nodes: TriggerNode, ActionNode, ConditionNode (true/false ports), LoopNode, AINode, CustomScriptNode | M4 | R2 Survey |
| 18 | Dynamic Parameter Inspector Drawer | Schema-driven property inspection, parameter editing, and variable autocomplete dropdowns | M4 | R2 Survey |
| 19 | Canvas State & History Management | Undo/redo action stack, dirty state detection, save/reload/import/export workflow JSON definitions | M4 | R2 Survey |
| 20 | Real-time Canvas Execution Animation | Pulsing border status indicators, edge particle flows, and intermediate execution state popovers | M4 | R2 Survey |
| 21 | Conversational AI Workflow Assistant | Natural-language prompt parsing, intent extraction, and parameter inference against IntegrationCatalog | M5 | R3 Survey |
| 22 | AST Graph Patch Engine | Non-destructive graph mutations (`INSERT_NODE`, `INSERT_BRANCH`, `UPDATE_PARAMETERS`, `REMOVE_NODE`) preserving existing configurations | M5 | R3 Survey |
| 23 | Interactive Parameter & Credential Prompter | Identify missing required node parameters and credentials, prompting user with structured quick-replies | M5 | R3 Survey |
| 24 | Studio Location & Marketing Isolation | Dedicated studio at `/features/automation` and `/dashboard/automations`; zero studio injection into `src/app/page.tsx` | M5 | R3 / Mandate |
| 25 | Presentation Showcase Mode | 4 presentation views: Multi-Tier Architecture Diagram, Data Flow Lineage, Node SLA Scorecard, Metrics KPIs | M6 | R6 Survey |
| 26 | Multi-Format Workflow Export | Export workflows to JSON (native & n8n format), high-res PNG (`html-to-image`), vector SVG, and executive PDF briefs | M6 | R6 Survey |
| 27 | Canva Connect API Integration | OAuth 2.0 authentication, template search, workflow brief autofill mapping, and design export pipeline | M6 | R6 Survey |
| 28 | Multi-Tenant Workspace & RBAC Enforcement | Workspace isolation at every API route, 7-tier RBAC (`OWNER`, `ADMIN`, `EDITOR`, `OPERATOR`, `VIEWER`), cross-tenant data blocking | M6 | R7 Survey |
| 29 | Cryptographic Audit Log Hash Chain | Tamper-evident audit logging where $H_n = \text{SHA256}(H_{n-1} + \text{payload})$ | M6 | R7 Survey |
| 30 | Isolated Script Node Sandbox | Isolated worker threads for custom script nodes with CPU timeout (2s), memory limit (64MB), and blocked globals | M6 | R7 Survey |
| 31 | Real-Time Execution Streaming & AI Debugger | SSE streaming endpoint (`/api/workflows/executions/[id]/stream`) with secret redaction and AI failure diagnosis | M6 | R7 Survey |
| 32 | Scenario A Verification (Lead Gen) | Webhook -> Input Validation -> Google Sheets -> AI classification -> Conditional branch -> HubSpot -> Slack | M7 | R8 Survey |
| 33 | Scenario B Verification (Email Intelligence) | Gmail trigger -> Retrieve message -> AI summarization -> Human approval -> Slack notification | M7 | R8 Survey |
| 34 | Scenario C Verification (Canva Content Automation) | Schedule trigger -> Google Sheets -> AI content generation -> Canva template autofill -> Export -> Google Drive -> Gmail | M7 | R8 Survey |
| 35 | Scenario D Verification (Failure Recovery) | Webhook -> HTTP API -> Simulated failure -> Retry with backoff -> Successful continuation | M7 | R8 Survey |
| 36 | Scenario E Verification (Conversational Modification)| Workflow creation followed by conversational insertion of conditional logic while preserving existing nodes/edges | M7 | R8 Survey |
| 37 | End-to-End Test Suite & Forensic Gate | 100% pass of Tiers 1-4 E2E tests, adversarial coverage hardening, and clean forensic audit sign-off | M7 | Dual Track / Gate |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Baseline Audit & Living Documentation | 5 audit docs, 12 living engineering docs, landing page preservation contract | none | DONE |
| M2 | Durable Execution Engine & Safe Expression Evaluator | Core DEE, atomic checkpoints, crash recovery, loops, safe AST evaluator | M1 | DONE |
| M3 | Extensible Node SDK, Credential Vault & Production Connectors | Node SDK, AES-256-GCM vault, OAuth refresh, 10 connectors, Mock Server | M1, M2 | DONE |
| M4 | Interactive Visual Workflow Canvas | `@xyflow/react` v12, 6 custom nodes, parameter inspector, Dagre auto-layout | M1, M3 | DONE |
| M5 | Conversational AI Workflow Builder & AST Patch Engine | Natural language chat builder, non-destructive AST Graph Patch Engine | M3, M4 | DONE |
| M6 | Workflow Showcase, Canva Integration & SaaS Security | Showcase modal (4 views), multi-format export, Canva Connect, RBAC, sandbox | M2, M3, M4, M5 | DONE |
| M7 | E2E Acceptance Scenarios & Final Verification Gate | Scenarios A-E, 95/95 E2E tests, 15/15 release gates, clean forensic audit | M1, M2, M3, M4, M5, M6 | DONE |

---

## Interface Contracts

### M1 Baseline Architecture ↔ All Modules
- Living engineering documents define canonical schemas:
  - `WORKFLOW_SCHEMA.md`: Canonical JSON schema for executable workflows (`WorkflowDefinitionV3`).
  - `NODE_SDK.md`: Canonical interface `INodeDefinition`, `INodeExecutionContext`, `PortDefinition`.
  - `DATABASE_SCHEMA.md`: Canonical entity schemas for Workspaces, Users, Credentials, Workflows, Checkpoints, Executions, and AuditLogs.

### M2 Durable Execution Engine ↔ M3 Node SDK
- `executeWorkflow(definition: WorkflowDefinitionV3, triggerPayload: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult>`
- `executeNode(nodeId: string, nodeType: string, inputData: Record<string, any>, credentials: ResolvedCredentials, context: INodeExecutionContext): Promise<NodeExecutionOutput>`
- `evaluateExpression(expression: string, contextData: Record<string, any>): any` (safe AST evaluator, no `eval()`)
- `saveCheckpoint(executionId: string, nodeId: string, status: NodeStatus, state: NodeExecutionState): Promise<void>`
- `recoverIncompleteExecutions(): Promise<{ recoveredCount: number }>`

### M3 Credential Vault ↔ Connectors
- `storeCredential(workspaceId: string, type: CredentialType, secretData: Record<string, any>): Promise<{ credentialId: string }>`
- `resolveCredential(workspaceId: string, credentialId: string): Promise<DecryptedCredentials>`
- `refreshTokenIfExpiring(workspaceId: string, credentialId: string): Promise<void>`

### M4 Visual Canvas ↔ M5 Conversational Builder
- `WorkflowStudioState`:
  - `nodes: AppNode[]`
  - `edges: AppEdge[]`
  - `applyGraphPatch(patch: GraphPatch): void`
  - `toExecutableWorkflow(): WorkflowDefinitionV3`
  - `fromExecutableWorkflow(def: WorkflowDefinitionV3): void`

### M5 Conversational Builder ↔ Backend NLP Compiler
- `POST /api/ai/workflows/chat`
  - Request: `{ conversationId: string, message: string, currentWorkflow?: WorkflowDefinitionV3 }`
  - Response: `{ replyText: string, graphPatch?: GraphPatch, workflow: WorkflowDefinitionV3, missingParams?: MissingParam[] }`

### M6 Showcase & Canva ↔ Canva Connect API
- `POST /api/showcase/canva/export`
  - Request: `{ workflowId: string, templateId?: string, format: 'presentation' | 'brief' }`
  - Response: `{ canvaDesignUrl: string, exportStatus: 'completed' | 'queued' }`

---

## Code Layout
- `src/app/page.tsx` — Clean marketing landing page (INVARIANT: UNTOUCHED)
- `src/app/features/automation/page.tsx` — Public Feature Studio with natural-language chat & canvas
- `src/app/dashboard/automations/page.tsx` — SaaS Dashboard Studio & Execution Console
- `src/components/canvas/` — Visual Canvas components (`WorkflowCanvas.tsx`, `nodes/`, `inspector/`, `controls/`)
- `src/components/chat/` — Conversational AI Builder UI (`AutomationChatPanel.tsx`, `PatchDiffPreview.tsx`)
- `src/components/showcase/` — Showcase modal & presentation views (`WorkflowShowcaseModal.tsx`, `CanvaExportModal.tsx`)
- `src/backend/engine/` — Durable Execution Engine (`DurableExecutionEngine.ts`, `CheckpointManager.ts`, `CrashRecoveryDaemon.ts`, `SafeExpressionEvaluator.ts`, `EventBus.ts`)
- `src/backend/nodes/` — Node SDK & Core Connectors (`NodeSDK.ts`, `connectors/` [Webhook, Http, Sheets, Gmail, Slack, HubSpot, Canva, Drive, AI])
- `src/backend/credentials/` — Secure Credential Vault (`CredentialVault.ts`, `OAuthLifecycleManager.ts`)
- `src/backend/compiler/` — AST Graph Patch Engine & Workflow Compiler (`WorkflowCompiler.ts`, `WorkflowPatchEngine.ts`)
- `src/backend/security/` — Multi-tenant RBAC, script sandbox, and audit log hash chaining (`TenantGuard.ts`, `ScriptSandbox.ts`, `AuditLogChainer.ts`)
- `src/testing/` — `MockIntegrationServer.ts`, E2E test suites for Scenarios A-E, and verification harnesses
