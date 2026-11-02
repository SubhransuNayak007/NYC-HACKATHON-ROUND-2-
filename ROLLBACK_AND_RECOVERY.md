# QuickReply AI Automation Operating System — Rollback, Disaster Recovery & Incident Protocol

**Document Version:** 2.0  
**Target RTO (Recovery Time Objective):** $< 5\text{ minutes}$  
**Target RPO (Recovery Point Objective):** $< 1\text{ minute}$  

---

## 1. Incident Classification & Severity Matrix

- **P0 (Critical Outage / Data Incident):** Cross-tenant data leak, complete API gateway failure, or unauthorized financial side effect.
  - *Response Time:* Immediate ($< 5\text{ min}$). Page Incident Commander.
- **P1 (Core Feature Broken):** Workflow execution engine down, n8n adapter failing all requests, or chat planner unreachable.
  - *Response Time:* $< 15\text{ min}$.
- **P2 (Degraded Performance):** High latency ($p95 > 1000\text{ms}$), background worker queue backlog, or single third-party provider failure.
  - *Response Time:* $< 1\text{ hour}$.
- **P3 (Minor Glitch):** Visual defect, non-blocking UI layout shift, or localized documentation typo.
  - *Response Time:* Next sprint release.

---

## 2. Instant Workflow Version Rollback

Every deployed workflow is stored immutably with full version history (`v1, v2, v3, ...`). If an update produces unexpected side effects or external errors:

### Step 1: Trigger Automated Rollback via API
```bash
curl -X POST "https://app.quickreply.ai/api/workflows/:workflowId/rollback" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetVersion": 1, "reason": "Third-party schema change caused downstream error"}'
```

### Step 2: Runtime Adapter Synchronous Reversion
- The execution provider immediately deactivates the unstable deployment.
- Re-binds the prior verified version snapshot.
- Flushes in-flight queue items for that workflow back into dead-letter state for inspection.
- Total rollback execution duration: $< 500\text{ms}$.

---

## 3. Worker Crash Recovery & Job Idempotency

When a worker process crashes or restarts during execution:
1. **At-Least-Once Delivery:** BullMQ detects unacknowledged jobs using stalled-job heartbeat timers (default: 30 seconds).
2. **Side-Effect Safe Resumption:** The execution state machine inspects `completedSteps` stored in MongoDB.
3. Steps marked `SUCCESS` (such as charging a card or appending a sheet row) are skipped; execution resumes from the exact unexecuted step.
4. If an external API was called but no response was received, the idempotency key guarantees the external platform treats the retry as an idempotent replay without duplicating side effects.

---

## 4. Database Point-in-Time Recovery & Backups

- **Automated Continuous Backups:** MongoDB Atlas Point-in-Time Recovery (PITR) with continuous oplog archiving.
- **Daily Snapshot Retention:** 30 days daily retention; 12 months monthly retention.
- **Dry-Run Restore Drill:** Monthly automated spin-up of test cluster to verify oplog restore integrity.