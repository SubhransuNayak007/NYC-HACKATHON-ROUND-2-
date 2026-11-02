# QuickReply Durable Execution Engine (DEE) Specification

**Document Version:** 3.0  
**Classification:** Core Runtime Architecture & Distributed Systems Specification  
**Core Modules:** `DurableExecutionEngine.ts`, `CheckpointStore.ts`, `CrashRecoveryDaemon.ts`, `SafeExpressionEvaluator.ts`, `RetryManager.ts`  
**Last Updated:** 2026-11-01  

---

## 1. Architectural Philosophy & Guarantees

The **Durable Execution Engine (DEE)** is a high-reliability, deterministic workflow execution coordinator designed to execute complex Directed Acyclic Graphs (DAGs) and stateful loops across distributed environments.

The DEE provides four foundational engineering guarantees:
1. **Durability Across Crashes**: If the server process is killed by an OOM error, power failure, or container redeployment at any millisecond $T$, the workflow execution resumes from its last committed checkpoint without losing intermediate state.
2. **At-Most-Once Side-Effect Execution**: Completed external mutations (e.g. charging a card, sending an email, appending a sheet row) are recorded in persistent checkpoints; on restart, completed nodes are NEVER re-executed.
3. **Zero Arbitrary `eval()`**: Dynamic variable interpolation and logic evaluation are strictly evaluated using a sandboxed Abstract Syntax Tree (AST) evaluator with zero access to Node.js runtime globals or JavaScript reflection.
4. **Resilient Network Backoff**: Intermittent external service outages trigger deterministic exponential backoff retries with random uniform jitter, preventing thundering herds.

---

## 2. Deterministic State Machine & Lifecycle Event Bus

### 2.1 State Transition Model

```
                         ┌─────────────┐
                         │   QUEUED    │
                         └──────┬──────┘
                                │ Worker pickup
                                ▼
                         ┌─────────────┐
                         │   STARTED   │
                         └──────┬──────┘
                                │ Next pending node(s)
                                ▼
                         ┌─────────────┐
                ┌───────►│NODE_STARTED │
                │        └──────┬──────┘
                │               │
      Wait for  │               ├── [Retryable Error] ──► ┌────────────────┐
    Timer/Queue │               │                         │ WAITING_RETRY  │
                │               │                         └───────┬────────┘
                │               │                                 │ Timer fires
                │               │                                 └───────────────┐
                │               │                                                 │
                │               ├── [Approval Gate Needed] ──► ┌────────────────┐ │
                │               │                              │WAITING_APPROVAL│ │
                │               │                              └───────┬────────┘ │
                │               │                                      │ Approved │
                │               │                                      ▼          │
                │               ├── [Success] ───────────────► ┌────────────────┐ │
                │               │                              │ NODE_COMPLETED │ │
                │               │                              └───────┬────────┘ │
                │               │                                      │          │
                │               └──────────────────────────────────────┼──────────┘
                │                                                      │
                │ Next Frontier Nodes Pending                          │ All Leaves Done
                └──────────────────────────────────────────────────────┤
                                                                       ▼
                                                                ┌─────────────┐
                                                                │  COMPLETED  │
                                                                └─────────────┘
```

### 2.2 Execution Checkpoint Data Structure

Every transition commits an atomic checkpoint record to `checkpoints`:

```typescript
export interface ExecutionCheckpoint {
  executionId: string;                 // exec_<uuidv4>
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  status: "QUEUED" | "STARTED" | "RUNNING" | "WAITING_APPROVAL" | "WAITING_RETRY" | "COMPLETED" | "FAILED";
  
  // Frontier Tracking
  currentNodeId: string | null;
  completedNodeIds: string[];          // IDs of steps fully executed
  pendingNodeIds: string[];            // IDs of steps queued for processing
  skippedNodeIds: string[];            // IDs of steps on inactive branches
  
  // Scoped Data State
  nodeOutputs: Record<string, any>;    // Output payloads indexed by nodeId
  accumulatedState: {                  // In-memory runtime context
    $json: Record<string, any>;        // Output of most immediate predecessor
    $node: Record<string, { output: any }>; // Lookups by step name or ID
    $env: Record<string, any>;         // Workspace environment constants
    $loop?: {                          // Active loop iterator metadata
      currentIndex: number;
      totalItems: number;
      currentItem: any;
    };
  };
  
  // Retries & Timing
  retryState: Record<string, {
    attemptCount: number;
    nextRetryAt: string;
    lastError: string;
  }>;
  lastHeartbeatAt: string;             // ISO 8601 updated every 15s during execution
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Crash Recovery Daemon Mechanics (`CrashRecoveryDaemon.ts`)

### 3.1 Daemon Operation Protocol
1. **Boot Hook**: On application initialization (or worker pool spin-up), `CrashRecoveryDaemon.initialize()` registers a recurring recovery loop (every 30 seconds).
2. **Identification of In-Flight Executions**:
   $$\text{Query: } \text{status} \in \{\text{"STARTED"}, \text{"RUNNING"}, \text{"WAITING\_RETRY"}\} \land \text{lastHeartbeatAt} < (\text{NOW} - 120\text{s})$$
3. **Execution Resumption**:
   - Acquires distributed lock via Redis `SET resource:lock:<execId> NX EX 60` or atomic DB status flip to prevent dual-processing.
   - Instantiates `DurableExecutionEngine.resumeFromCheckpoint(checkpoint)`.
   - Reconstructs accumulated `$node` state from `checkpoint.nodeOutputs`.
   - Skips all nodes present in `checkpoint.completedNodeIds`.
   - Executes pending nodes matching the execution frontier.

---

## 4. Parallel Fork / Join & Loop Control

### 4.1 Parallel Fork Traversal
When a node $A$ links to multiple downstream target nodes $B_1, B_2, \dots, B_k$:
- The engine identifies that all $B_i$ have their inbound prerequisites satisfied.
- Spawns parallel asynchronous promises via `Promise.allSettled()`.
- Each branch fiber maintains its isolated local output until committed to the checkpoint.

### 4.2 Join Synchronization (`WAITING_DEPENDENCIES`)
When a node $C$ has incoming edges from multiple upstream nodes $B_1$ and $B_2$:
- When $B_1$ finishes, the engine evaluates node $C$'s incoming edge dependencies.
- Since $B_2$ is still in-flight, node $C$ is placed in `WAITING_DEPENDENCIES` state.
- When $B_2$ commits its checkpoint, the engine checks all incoming edges to $C$. Finding all predecessors marked `COMPLETED` (or `SKIPPED`), node $C$ is unlocked and queued for execution.

### 4.3 Iterative Loops (`LoopNode`)
- Iterates over an array input referenced by AST expression (e.g. `{{ $node["FetchLeads"].output.records }}`).
- **Batching Support**: Iterates in configurable batch sizes ($1 \le \text{batchSize} \le 100$).
- **Iteration Context**: Injects `$loop: { currentIndex, totalItems, currentItem }` into the active node context.
- **Safety Bound**: Maximum iteration cap enforced at `maxIterations: 1000`. Exceeding this bound aborts execution with `LOOP_OVERFLOW_ERROR`, preventing runaway infinite loops.
- **Completion Handle**: When the array is exhausted, the engine routes execution out of the `completed` handle.

---

## 5. Exponential Backoff Retries with Uniform Jitter

External cloud services fail intermittently due to rate limits (HTTP 429) or transient gateway errors (HTTP 502/503). 

### 5.1 Backoff Formula
The delay before attempt $n$ is calculated as:
$$T_{\text{wait}} = \min\left(T_{\text{max}}, \; T_{\text{initial}} \times (\text{multiplier})^{n} + \text{random}(0, \text{jitterMs})\right)$$

- **Default Parameters**:
  - $T_{\text{initial}} = 1,000\text{ms}$
  - $T_{\text{max}} = 60,000\text{ms}$
  - $\text{multiplier} = 2.0$
  - $\text{jitterMs} = 500\text{ms}$

### 5.2 Error Classification Table

| Error Type / HTTP Status | Classification | Retry Policy Action |
|---|---|---|
| **HTTP 408** (Request Timeout) | Transient Network | Retry with backoff |
| **HTTP 429** (Rate Limit) | Rate Throttling | Retry using `Retry-After` header or exponential backoff |
| **HTTP 500, 502, 503, 504** | Transient Upstream Error | Retry with backoff |
| **`ECONNRESET`, `ETIMEDOUT`** | Socket Error | Retry with backoff |
| **HTTP 400** (Bad Request) | Schema / Client Error | Terminal Fail (No retry) |
| **HTTP 401, 403** | Auth Failure | Terminal Fail -> Check token refresh |
| **HTTP 404** (Not Found) | Resource Error | Terminal Fail (No retry) |
| **HTTP 422** (Unprocessable Entity) | Validation Error | Terminal Fail (No retry) |

---

## 6. Safe AST Expression Evaluation (Zero Arbitrary `eval()`)

### 6.1 AST Evaluator Architecture
Arbitrary code execution via `eval()` or `Function()` is completely banned. All expressions matching `{{ ... }}` or condition expressions are processed by `SafeExpressionEvaluator.ts`:

```
[Expression String: "$json.amount > 50000 && $node['Verify'].output.status == 'VALID'"]
                                │
                                ▼
                       [Lexical Tokenizer]
    Tokens: IDENT, GT, NUMBER, AND, IDENT, LBRACK, STRING, RBRACK, DOT, EQ, STRING
                                │
                                ▼
                     [Recursive Descent Parser]
                            AST Tree:
                          BinaryOp (&&)
                         /             \
                 BinaryOp (>)       BinaryOp (==)
                 /          \       /           \
             PathAccess    50000 PathAccess   'VALID'
             ($json.amount)     ($node.Verify.status)
                                │
                                ▼
                     [Sandboxed Tree Evaluator]
          Resolves paths strictly against provided Data Dictionary
```

### 6.2 Supported Operations & Built-in Functions
- **Operators**: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`.
- **Property Navigation**: `$json.user.address.zipCode`, `$node["Step_1"].output.rows[0].id`.
- **Built-in Safe Functions**:
  - `length(val)`: Returns array or string length.
  - `toUpper(str)`, `toLower(str)`, `trim(str)`: Safe string operations.
  - `coalesce(a, b)`: Nullish coalescing.
  - `formatDate(dateStr, format)`: Standard date formatter.
  - `parseNumber(val)`: Safe numeric coercion.
- **Explicitly Forbidden**: Access to `global`, `process`, `require`, `import`, `eval`, `Function`, `__proto__`, `constructor`, `window`, `document`. Any attempted access throws an immediate `SecurityViolationError`.

---

## 7. Multi-Source Trigger System

QuickReply supports 4 trigger modalities:
1. **Webhook Trigger**:
   - Signature verification: Validates HMAC-SHA256 (`crypto.createHmac("sha256", secret).update(body).digest("hex")`).
   - Idempotency cache: Hashes `{ path, body }` using SHA-256 with 60-second TTL to discard duplicate webhooks.
2. **Scheduled / Cron Trigger**:
   - BullMQ repeatable queue workers evaluate 5-part cron patterns (e.g. `0 9 * * 1-5`).
   - Timezone-aware execution using `Intl.DateTimeFormat`.
3. **Manual Trigger**:
   - Triggered via API or visual studio "Test Run" button with optional mock payload.
4. **Application Event Trigger**:
   - Ingests internal system events (e.g. lead generated, comment received) normalized through `EventNormalizer.ts`.
