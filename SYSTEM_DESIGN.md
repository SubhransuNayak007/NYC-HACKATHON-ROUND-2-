# QuickReply AI Automation Operating System — System Design Specification

**Document Version:** 2.0  
**Target:** Highly Available, Low-Latency Distributed AI Automation System  

---

## 1. System Topology & Infrastructure Blueprint

QuickReply is structured into decoupled, independently scalable subsystems:

```
                            [Cloudflare / Edge CDN]
                                       │
                         [TLS Termination & WAF]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
           [Web & API Gateway]                [WebSocket Gateway]
         (Next.js App Router)               (Real-Time Telemetry)
                      │                                 │
         ┌────────────┼─────────────────────────────────┤
         ▼            ▼                                 ▼
   [Auth & RBAC] [Chat Planner]                  [Execution Tracer]
         │            │                                 │
         │     [LangGraph State]                        │
         │            │                                 │
         │     [Workflow Compiler]                      │
         │            │                                 │
         ▼            ▼                                 ▼
   ┌────────────────────────────────────────────────────────┐
   │             Distributed Job Bus (BullMQ)               │
   └──────────────────────────┬─────────────────────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
   [n8n Worker Pool]  [LangGraph Worker]  [Native DAG Worker]
          │                   │                    │
          └───────────────────┼────────────────────┘
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │            Security Vault & Storage Layer              │
   │  MongoDB Atlas Pool · Redis Key-Value · AES-256 GCM    │
   └────────────────────────────────────────────────────────┘
```

---

## 2. Distributed Workload Processing

### 2.1 Asynchronous Job Orchestration (BullMQ + Redis)
1. **Task Ingestion:** When a trigger fires (schedule cron, incoming webhook, manual trigger), an execution job is pushed to the BullMQ `workflow_executions` queue.
2. **Worker Concurrency & Isolation:**
   - Worker processes pull jobs with per-tenant concurrency limits (default: 10 parallel jobs per tenant).
   - No single tenant can starve shared worker threads.
3. **Dead-Letter Handling & Backoff:**
   - Exponential backoff with jitter: $T_{retry} = 2^{attempt} \times 1000\text{ms} \pm 200\text{ms}$.
   - Max retry limit: 3 attempts.
   - On 4th failure, job transitions to `FAILED`, raises an operational alert, and creates an audit incident in `incident_records`.

### 2.2 In-Memory & Distributed State Management
- **Redis Clustered Key-Space:**
  - `session:<token_hash>`: Cached user session TTL 15m.
  - `ratelimit:<tenantId>:<endpoint>`: Token bucket rate limiter.
  - `circuitbreaker:<providerId>`: Failure count and state (`CLOSED`, `HALF_OPEN`, `OPEN`).
  - `thread:<threadId>:checkpoint`: LangGraph conversation thread state.

---

## 3. Reliability & Fault Tolerance

### 3.1 Circuit Breaker Architecture
Every external integration connector (e.g., Google OAuth, Telegram Bot API, n8n instance) is protected by an autonomous circuit breaker:
- **Failure Threshold:** 5 consecutive 5xx or timeout errors within a 60-second window.
- **Trip Action:** Transitions to `OPEN` state; subsequent calls fast-fail with an informative status without hammering downstream endpoints.
- **Cool-Down:** 30 seconds before entering `HALF_OPEN` to test a single probe request.

### 3.2 Idempotency Engine
- Every webhook payload and scheduled execution contains or generates an idempotency key:
  $$\text{Key} = \text{SHA256}(\text{tenantId} + \text{workflowId} + \text{sourcePayloadId})$$
- Keys are cached in Redis with a 24-hour TTL.
- Duplicate deliveries return the existing execution result without re-triggering side effects (e.g., preventing duplicate invoices or double-sent emails).