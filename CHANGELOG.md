# QuickReply Engineering Changelog

All notable changes to the **QuickReply AI Automation Operating System & SaaS Platform** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] — 2026-11-01

### 🚀 Major Architectural Milestone: AI-Native Visual Automation Platform & SaaS (Requirements R1–R8)

#### Added
- **Visual Workflow Canvas Engine (`@xyflow/react` v12)**:
  - Interactive 2D GPU-accelerated canvas supporting node dragging, connecting, disconnecting, panning, zooming (0.1x to 2.0x), and mini-map navigation.
  - Implemented 6 purpose-built custom nodes: `triggerNode`, `actionNode`, `conditionNode` (bifurcated True/False output handles), `loopNode` (loop body & completed handles), `aiNode` (LLM reasoning & extraction), and `customScriptNode` (sandboxed JavaScript code).
  - Integrated Dagre auto-layout engine for one-click graph alignment (`layoutNodes()`).
  - Added temporal undo/redo history stack (`past`, `present`, `future`) with keyboard shortcut bindings (`Ctrl+Z`, `Ctrl+Shift+Z`).
  - Dynamic parameter inspector drawer (`NodeInspectorDrawer.tsx`) supporting schema-driven form controls, variable picker pill autocomplete (`{{ $json.field }}`), and inline credential binding.
  - Real-time execution status animations: pulsing amber outlines for `QUEUED`, animated marching edge particles for `RUNNING`, emerald border with latency pills for `SUCCESS`, and red diagnostic popovers for `FAILED`.

- **Conversational AI Builder & Non-Destructive AST Graph Patch Engine**:
  - Upgraded `AutomationPlannerAgent.ts` with natural-language prompt compilation grounded in `IntegrationCatalog.ts`.
  - Implemented RFC 6902-compliant `WorkflowPatchEngine.ts` supporting atomic graph patch operations: `INSERT_NODE`, `INSERT_BRANCH`, `UPDATE_PARAMETERS`, `REMOVE_NODE`, `REPLACE_NODE`, and `UPDATE_TRIGGER`.
  - Guaranteed non-destructive preservation of unaffected nodes, configured parameters, and credential references during multi-turn conversational edits (Scenario E).
  - Added interactive parameter prompter and clarification chips for missing spreadsheet IDs, channel names, and missing credentials with popup OAuth triggers.

- **Durable Execution Engine (DEE) & Crash Recovery**:
  - Built deterministic state machine (`DurableExecutionEngine.ts`) coordinating sequential paths, parallel fork/join synchronization (`WAITING_DEPENDENCIES`), and collection loops with 1000-iteration bounds.
  - Implemented atomic checkpoint persistence (`CheckpointStore.ts`) committing state after every node transition (`NODE_STARTED`, `NODE_COMPLETED`).
  - Implemented `CrashRecoveryDaemon.ts` scanning on boot for executions interrupted by server restarts or crashes and resuming execution from the last committed checkpoint without duplicate side effects.
  - Added exponential backoff retry manager (`RetryManager.ts`) with uniform random jitter:
    $$T_{\text{wait}} = \min(T_{\text{max}}, T_{\text{initial}} \times 2^{\text{attempt}} + \text{random}(0, \text{jitterMs}))$$
  - Added safe AST Expression Evaluator (`SafeExpressionEvaluator.ts`) resolving dynamic variables and comparisons with **zero arbitrary `eval()`** or JavaScript reflection.

- **Node SDK & Production Connectors**:
  - Defined declarative `INodeDefinition` and `INodeExecutionContext` contracts with Zod input/output schema validation.
  - Implemented production connectors for:
    1. `Webhook`: Inbound HMAC-SHA256 signature verification and outbound dispatch.
    2. `HTTP Request`: Universal REST client with SSRF firewall guard.
    3. `Google Sheets`: Range queries, row appending, and cell updates.
    4. `Gmail`: Search queries, RFC822 MIME decoding, and email dispatch.
    5. `Slack`: Channel broadcasting and Block Kit messaging.
    6. `HubSpot`: CRM contact upsert and deal pipeline management.
    7. `Canva Connect`: Brand template discovery, dataset autofill mapping, and design export.
    8. `Google Drive`: File uploads, folder organization, and shareable link generation.
    9. `OpenAI`: GPT-4o chat completions and embeddings.
    10. `Anthropic`: Claude 3.5 Sonnet messages API and structured extraction.
  - Hardened `CredentialVault.ts` with AES-256-GCM encryption at rest, opaque IDs (`cred_<uuid>`), and automated OAuth token refresh when $expiresAt - NOW \le 300s$.

- **Workflow Showcase & Canva Presentation Integration**:
  - Built `WorkflowShowcaseModal.tsx` offering 4 presentation views: Multi-Tier Architecture Swimlanes, Data Flow Lineage, Node SLA Scorecard, and Execution Metrics KPIs.
  - Multi-format workflow export engine generating JSON (native & n8n), high-res PNG, vector SVG, and executive PDF architecture briefs.
  - Canva Connect API integration: OAuth 2.0 PKCE flow, brand template visual selector, dataset autofill mapping, and asynchronous export polling.

- **Multi-Tenant SaaS Infrastructure & Security**:
  - Enforced 7-tier RBAC (`OWNER`, `ADMIN`, `MEMBER`, `EDITOR`, `OPERATOR`, `DEVELOPER`, `VIEWER`) across all API routes.
  - Implemented cryptographically chained audit logging where each record hash is computed as:
    $$H_n = \text{SHA256}(H_{n-1} \,\|\, \text{timestamp} \,\|\, \text{tenantId} \,\|\, \text{eventType} \,\|\, \text{userId} \,\|\, \text{details})$$
  - Implemented worker-thread script sandbox (`ScriptSandbox.ts`) with hard 2,000ms CPU timeout, 64MB memory limit, and disabled Node globals.
  - Real-time Server-Sent Events (SSE) execution streaming endpoint (`GET /api/workflows/executions/[id]/stream`) with automatic secret redaction.

- **Verification Harness & Acceptance Scenarios**:
  - Built `MockIntegrationServer.ts` simulating Google, Canva, Slack, and HubSpot APIs for hermetic local testing.
  - Implemented `verify-e2e-scenarios-a-e.mjs` verifying Scenarios A (Lead Gen), B (Email AI & Approval Gate), C (Canva Automation & Drive), D (Failure & Retry Backoff), and E (Conversational Workflow Modification).
  - Verified 15 DevOps release gates via `scripts/release-gate.js`.

#### Preserved
- **Marketing Landing Page Invariant**: Verified `src/app/page.tsx` and `src/frontend/components/landing/*` are 100% clean with strictly zero studio code or canvas package injections.

---

## [2.0.0] — 2026-10-31

### Added
- **Multi-Provider Automation Architecture**:
  - Added initial `AutomationPlannerAgent.ts` with rule-based NLP entity extraction.
  - Implemented `WorkflowCompiler.ts` with DFS cycle detection algorithms.
  - Introduced `ExecutionProviderFactory.ts` supporting n8n, LangGraph, and Native DAG execution targets.
- **Enterprise Release Readiness Engine**:
  - Added `scripts/release-gate.js` with 15 automated validation gates.
  - Added 10 baseline acceptance scenarios (`scripts/verify-acceptance-scenarios.mjs`).
- **Security Foundations**:
  - Initial AES-256-GCM token encryption in `src/database/db.ts`.
  - Rate limiting middleware and HMAC session cookie validation.

---

## [1.0.0] — 2026-10-25

### Added
- Initial QuickReply core platform repository setup.
- Next.js App Router full-stack topology with React 19, TypeScript, and Tailwind CSS.
- MongoDB Atlas driver connection pool with local JSON fallback.
- Instagram, Facebook, and WhatsApp messaging integrations.
- Clean marketing landing page showcase at `src/app/page.tsx`.
