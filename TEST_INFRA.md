# Test Infrastructure Specification: QuickReply Automation Platform & SaaS

**Track**: E2E Testing Track (Dual-Track Testing Methodology)  
**Architecture**: Opaque-Box, Requirement-Driven Verification Suite with Deterministic Mock Integration Server  
**Author**: Test Writer Agent (`worker_e2e_track`)  
**Timestamp**: 2026-11-01  
**Project Application Root**: `d:\quickreply`  
**Test Suite Directory**: `d:\quickreply\src\testing\`  

---

## 1. Overview & Test Philosophy

The QuickReply E2E test suite provides **opaque-box, requirement-driven verification** of the entire AI-Native Visual Automation Platform and SaaS as specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### Core Engineering Principles
1. **Zero Fakes / Zero Cheating**:
   - No hardcoded test passes or facade mocks.
   - All assertions are mathematically, cryptographically, and architecturally verified against live system models or deterministic local HTTP servers.
2. **Deterministic Network Simulation**:
   - External third-party integrations (Google Sheets, Gmail, Slack, HubSpot, Canva Connect API, Google Drive, OpenAI, Anthropic, and Billing) are simulated via an in-process local HTTP server (`MockIntegrationServer.ts`).
   - Real network sockets, HTTP request parsing, header validation, and payload journals are exercised.
3. **Progressive Testability & Independence**:
   - Tests are self-contained and isolated; each test initializes its own state, executes deterministically, and cleans up after itself.
4. **4-Tier Verification Hierarchy**:
   - **Tier 1: Feature Coverage**: Comprehensive verification of primary behaviors (>=5 tests per feature across all R1–R8 features).
   - **Tier 2: Boundary & Corner Cases**: Edge conditions, extreme payloads, negative values, and malformed inputs (>=5 tests per feature across all R1–R8 features).
   - **Tier 3: Cross-Feature Interactions**: Pairwise module combinations (Webhook $\to$ Condition, Loop $\to$ AI, mid-execution OAuth refresh, RBAC $\to$ Audit Log).
   - **Tier 4: Real-World Application Scenarios**: Executable scenario specifications for Scenarios A, B, C, D, and E.

---

## 2. Infrastructure & Environment Configuration

| Parameter | Value | Location / Notes |
| :--- | :--- | :--- |
| **Node.js Runtime** | Node.js v24.15.0 | System Node runtime |
| **TypeScript Runner** | `tsx` v4.23.12 | `npx --prefix NYC-HACKATHON-ROUND-2- tsx` |
| **Mock Integration Server** | `MockIntegrationServer.ts` | Local HTTP server on dynamic port or 4040 |
| **Crypto Baseline** | `node:crypto` | AES-256-GCM, SHA-256 audit chaining |
| **Network Security** | `SSRFGuard` | RFC 1918, loopback, cloud metadata protection |
| **DAG Verification** | Kahn's Algorithm | Topological sort & cycle detection |
| **Expression Engine** | AST Safe Evaluator | Zero arbitrary `eval()` or `Function()` |

---

## 3. Directory & File Layout

```
d:\quickreply\
├── TEST_INFRA.md                       # Master test infrastructure specification (this document)
├── TEST_READY.md                       # Test readiness certification and coverage report
└── src/
    └── testing/
        ├── MockIntegrationServer.ts    # Deterministic local mock server for OAuth & SaaS APIs
        ├── TestHarnessModels.ts        # Shared contracts, AST evaluators, cryptography, DAG logic
        ├── tier1-feature-coverage.test.ts     # Tier 1: 40 feature tests (R1-R8, >=5 tests/feature)
        ├── tier2-boundary-corner-cases.test.ts # Tier 2: 40 boundary tests (R1-R8, >=5 tests/feature)
        ├── tier3-cross-feature-interactions.test.ts # Tier 3: 10 cross-feature interaction tests
        ├── tier4-scenarios-a-e.test.ts # Tier 4: Executable Scenarios A, B, C, D, and E
        ├── test-runner.ts              # Master CLI test runner with formatting & telemetry
        └── test-runner.js              # Node executable shim for cross-platform execution
```

---

## 4. Feature Inventory & Coverage Mapping (Features R1–R8)

| Feature ID | Scope Description | Tier 1 Tests | Tier 2 Tests | Tier 3 & 4 Tests |
| :--- | :--- | :---: | :---: | :---: |
| **R1: Deep Audit & Preservation** | Clean landing page invariant, 12 living docs manifest, compiler/db contracts | 5 | 5 | Referenced in baseline harness |
| **R2: Visual Workflow Canvas** | 6 custom node types, DAG acyclic topology, schema inspector, undo/redo, import/export | 5 | 5 | T3_X04, T4_SCENARIO_E |
| **R3: Conversational AI Builder** | Prompt intent parser, integration catalog validator, AST patch engine, quick-replies | 5 | 5 | T3_X04, T4_SCENARIO_E |
| **R4: Durable Execution Engine** | Sequential traversal, parallel fork/join, condition branching, loops, crash checkpoints | 5 | 5 | T3_X01, T3_X02, T3_X08, T4_SCENARIO_D |
| **R5: Node SDK & Credential Vault** | Declarative SDK schemas, AES-256-GCM vault, OAuth refresh, opaque IDs, SSRF guard | 5 | 5 | T3_X03, T3_X06, T3_X08, T4_SCENARIO_A |
| **R6: Showcase & Canva Integration** | Architecture diagrams, SLA scorecard, multi-format export, Canva autofill/export | 5 | 5 | T3_X07, T4_SCENARIO_C |
| **R7: Multi-Tenant SaaS & Security** | Workspace isolation, 5-tier RBAC, SHA-256 audit chaining, SSE stream, script sandbox | 5 | 5 | T3_X05, T3_X09, T3_X10, T4_SCENARIO_B |
| **R8: End-to-End Scenarios** | Full execution of Scenarios A, B, C, D, and E against live or mock endpoints | 5 | 5 | T4_SCENARIOS A through E |
| **Total Test Cases** | **Full 4-Tier Test Suite** | **40** | **40** | **15 (10 Tier 3 + 5 Tier 4)** |

---

## 5. Test Suite Hierarchy (4 Verification Tiers)

### Tier 1: Feature Coverage (40 Tests, >=5 per Feature)
- **`T1_R1_01`–`T1_R1_05`**: Landing page preservation invariant (`src/app/page.tsx` untouched), 12 living engineering docs manifest verification, compiler contracts, multi-tenant DB isolation contracts, and requirement traceability.
- **`T1_R2_01`–`T1_R2_05`**: Registration of Trigger, Action, Condition, Loop, AI, and Script nodes; DAG acyclic topology validation; dynamic parameter schema inspector contracts; undo/redo stack transitions; workflow JSON round-trip import/export.
- **`T1_R3_01`–`T1_R3_05`**: Natural language intent parsing into triggers and operations; integration catalog validation preventing hallucinated nodes; non-destructive AST patch generation (`INSERT_BRANCH`); quick-reply missing parameter prompter; live canvas synchronization.
- **`T1_R4_01`–`T1_R4_05`**: Sequential DAG execution data pipe; parallel fork and join execution synchronization; conditional branch routing with dead path skipping; collection loop execution with 1000 iteration safety bound; atomic checkpoint persistence and crash recovery state rehydration.
- **`T1_R5_01`–`T1_R5_05`**: Declarative Node SDK parameter schema validation; AES-256-GCM Credential Vault encryption at rest and in-memory decryption; automated OAuth token refresh before execution ($T \le 300\text{s}$); opaque credential ID references (`cred_<uuid>`); SSRF guard network boundary validation.
- **`T1_R6_01`–`T1_R6_05`**: Presentation showcase multi-tier architecture diagram generation; data flow lineage and execution SLA scorecard computation; multi-format workflow export (JSON, SVG, PNG, PDF); Canva Connect template discovery and schema mapping; Canva autofill job dispatch and export rendering.
- **`T1_R7_01`–`T1_R7_05`**: Workspace isolation enforcement; 5-tier RBAC permission enforcement (`OWNER` to `VIEWER`); cryptographic audit log SHA-256 hash chaining; real-time SSE execution lifecycle event formatting with secret scrubbing; sandboxed script worker isolation limits (CPU timeout 2s, memory 64MB, blocked globals).
- **`T1_R8_01`–`T1_R8_05`**: Pipeline structure validation for Scenarios A, B, C, D, and E.

### Tier 2: Boundary & Corner Cases (40 Tests, >=5 per Feature)
- **`T2_R1_01`–`T2_R1_05`**: Empty workspace configuration fallback defaults; malformed JSON rejection; missing optional manifest fields; zero-route safe fallback; duplicate configuration precedence resolution.
- **`T2_R2_01`–`T2_R2_05`**: Empty 0-node workflow graph validation; extreme scale DAG traversal (1,000 sequential nodes in $< 500\text{ms}$); cyclic graph detection and rejection; hanging edge rejection; negative coordinate positions and extreme zoom boundaries ($0.05\times$ to $5.0\times$).
- **`T2_R3_01`–`T2_R3_05`**: Rejection of empty/whitespace prompts; neutralization of prompt injection and destructive jailbreaks; handling of ultra-long prompts (>50,000 characters); conflicting multi-intent prompt detection; patch rejection on non-existent node IDs.
- **`T2_R4_01`–`T2_R4_05`**: Loop iteration bounds enforcement (>1000 throws); zero-item collection loop safe completion; safe expression division by zero handled cleanly; prototype pollution blocking (`__proto__`, `constructor`); crash recovery idempotent rehydration.
- **`T2_R5_01`–`T2_R5_05`**: Corrupted ciphertext in Credential Vault throws explicit decryption error; expired OAuth refresh token returns HTTP 400 `invalid_grant`; SSRF guard blocks loopback and private subnets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`); missing Bearer token triggers HTTP 401 across all mock endpoints; extreme tabular payload handling (10,000 cells).
- **`T2_R6_01`–`T2_R6_05`**: Showcase presentation handles 0-node workflow; massive workflow showcase rendering (>200 nodes) without collapse; Canva Connect autofill invalid template ID handling; unsupported export format rejection; zero-execution scorecard handles 0 runs without NaN.
- **`T2_R7_01`–`T2_R7_05`**: Cross-tenant resource query throws Access Denied; VIEWER role blocked from triggering workflow execution; tampered audit log entry breaks cryptographic SHA-256 chain; script worker CPU timeout monitor; blocked access to sensitive Node.js process and filesystem in sandbox.
- **`T2_R8_01`–`T2_R8_05`**: Scenario A negative budget rejection; Scenario B human approval rejection halts downstream actions; Scenario C empty Google Sheet data handles cleanly; Scenario D permanent HTTP 500 terminates with `FAILED` status; Scenario E duplicate node insertion rejected.

### Tier 3: Cross-Feature Interactions (10 Tests)
- **`T3_X01`**: Webhook Ingestion $\to$ Input Validation $\to$ Safe AST Conditional Branching (R4 + R5).
- **`T3_X02`**: Collection Loop $\to$ AI Summarization with rate limiter pacing (R4 + R5).
- **`T3_X03`**: OAuth token refresh triggered mid-execution without checkpoint state loss (R4 + R5).
- **`T3_X04`**: Conversational AI Graph Patch applied to running/checkpointed workflow (R3 + R4).
- **`T3_X05`**: Cryptographic Audit Log emitted on Cross-Tenant Unauthorized Access Attempt (R5 + R7).
- **`T3_X06`**: Custom Sandboxed Script Node transforming Google Sheets output within memory limits (R5 + R7).
- **`T3_X07`**: Canva Connect Autofill invoked from AI Content Output with Real-time SSE streaming (R5 + R6 + R7).
- **`T3_X08`**: Parallel Fork/Join executing simultaneous HubSpot and Slack calls with independent credentials (R4 + R5).
- **`T3_X09`**: Human Approval Gate pausing execution, rehydrating on approval, and continuing downstream actions (R4 + R7 + R8).
- **`T3_X10`**: Exponential Backoff Retry during SSE status streaming maintaining client diagnostics (R4 + R7).

### Tier 4: Real-World Application Scenarios (5 Tests)
- **`T4_SCENARIO_A`**: Lead Generation Pipeline
  `Webhook -> Input Validation -> Google Sheets -> AI classification -> Conditional branch -> HubSpot -> Slack`
- **`T4_SCENARIO_B`**: Email Intelligence & Human Approval Gate
  `Gmail trigger -> Retrieve message -> AI summarization -> Human approval -> Slack notification`
- **`T4_SCENARIO_C`**: Canva Content Automation & Google Drive
  `Schedule trigger -> Google Sheets -> AI content generation -> Canva template autofill -> Export -> Google Drive -> Gmail notification`
- **`T4_SCENARIO_D`**: Failure Recovery with Exponential Backoff
  `Webhook -> HTTP API -> Simulated failure -> Retry -> Successful continuation`
- **`T4_SCENARIO_E`**: Conversational Workflow Modification & Preservation
  `Workflow creation followed by conversational insertion of conditional logic while preserving existing nodes and connections`

---

## 6. Mock Integration Server Specification

The deterministic local mock server (`src/testing/MockIntegrationServer.ts`) provides full REST emulation of external SaaS APIs:

| Endpoint Path | HTTP Method | Simulated Service | Emulated Behavior |
| :--- | :---: | :--- | :--- |
| `/oauth/token` | POST | OAuth 2.0 Auth Server | Code exchange & refresh token rotation with validation |
| `/v4/spreadsheets/:id/values/:range:append` | POST | Google Sheets API v4 | Tabular row append with updated range metadata |
| `/v4/spreadsheets/:id/values/:range` | GET / PUT | Google Sheets API v4 | Reads weekly metrics or updates cells |
| `/gmail/v1/users/me/messages` | GET | Gmail API | Lists messages matching queries (quote requests) |
| `/gmail/v1/users/me/messages/:id` | GET | Gmail API | Retrieves base64 RFC822 message payload |
| `/gmail/v1/users/me/messages/send` | POST | Gmail API | Dispatches email and returns delivered status |
| `/api/chat.postMessage` | POST | Slack Web API | Posts rich block messages to sales/approval channels |
| `/crm/v3/objects/contacts` | POST | HubSpot CRM API | Upserts contacts with email, company, lifecycle stage |
| `/v1/templates` | GET | Canva Connect API | Discovers workflow presentation & social templates |
| `/v1/autofills` | POST | Canva Connect API | Populates design dataset fields asynchronously |
| `/v1/exports` | POST | Canva Connect API | Renders and returns design export download URLs |
| `/upload/drive/v3/files` | POST | Google Drive API | Ingests binary assets and returns shareable web links |
| `/v1/chat/completions` | POST | OpenAI API | Deterministic classification, summarization, and content |
| `/v1/messages` | POST | Anthropic API | Claude message completion format |
| `/api/mock/billing` | POST | Billing Gateway | Configurable failure counter (503 retry backoff $\to$ 200) |
| `/api/approvals/:id/approve` | POST | Approval Engine | Resumes paused execution after human review |

---

## 7. Test Runner Execution & CLI Commands

### 7.1 Master Test Suite Execution
```bash
# Run all 4 tiers (95 tests)
node src/testing/test-runner.js

# Or directly via tsx
npx --prefix NYC-HACKATHON-ROUND-2- tsx src/testing/test-runner.ts
```

### 7.2 Individual Tier Execution
```bash
# Tier 1: Feature Coverage (40 tests)
node src/testing/test-runner.js --tier 1

# Tier 2: Boundary & Corner Cases (40 tests)
node src/testing/test-runner.js --tier 2

# Tier 3: Cross-Feature Interactions (10 tests)
node src/testing/test-runner.js --tier 3

# Tier 4: Real-World Scenarios A-E (5 tests)
node src/testing/test-runner.js --tier 4
```

### 7.3 CI/CD Integration & Machine-Readable Output
```bash
# Fail immediately on first error
node src/testing/test-runner.js --bail

# Emit structured JSON summary
node src/testing/test-runner.js --json
```

### 7.4 Standalone Mock Server Mode
```bash
# Start MockIntegrationServer on port 4040 for interactive testing
node src/testing/test-runner.js --mock-server
```

---

## 8. Mathematical & Cryptographic Assertions

### 8.1 Cryptographic Audit Hash Chaining Formula
Every audit log record satisfies:
$$H_0 = \text{SHA256}(\text{GENESIS\_BLOCK})$$
$$H_n = \text{SHA256}(H_{n-1} \,\|\, \text{index} \,\|\, \text{timestamp} \,\|\, \text{tenantId} \,\|\, \text{eventType} \,\|\, \text{details})$$
Any alteration of record $k$ invalidates $H_k$ and all subsequent hashes $H_{k+1 \dots N}$.

### 8.2 Exponential Backoff with Jitter Formula
$$T_{\text{wait}} = \min(T_{\text{max}}, T_{\text{initial}} \times 2^{\text{attempt}} + \text{random}(0, \text{jitterMs}))$$
where $T_{\text{initial}} = 50\text{ms}$ (test) / $1000\text{ms}$ (prod), $T_{\text{max}} = 60000\text{ms}$.

### 8.3 Topological Sort & Cycle Detection (Kahn's Algorithm)
Given graph $G = (V, E)$, in-degree $\text{deg}^-(v)$ is tracked for all $v \in V$. Vertices with $\text{deg}^-(v) = 0$ are enqueued. Graph is strictly acyclic if and only if $|\text{sorted}| = |V|$.

### 8.4 AES-256-GCM Vault Specification
- Cipher: AES-256-GCM with 256-bit derived key
- Initialization Vector: 96-bit cryptographically secure pseudorandom bytes
- Authentication Tag: 128-bit authentication tag enforcing ciphertext integrity
- Format: `iv_hex:auth_tag_hex:ciphertext_hex`
