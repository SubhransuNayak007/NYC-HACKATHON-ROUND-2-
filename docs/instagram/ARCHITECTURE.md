# QuickReply AI — 24/7 Autonomous Instagram Architecture

## 1. Executive Summary

Quick Reply AI provides a **production-grade, 24/7 autonomous Instagram operations engine** built directly on official Meta Graph APIs (`v19.0+`) and Webhooks.

The system does **NOT** require an open browser, active dashboard, or client-side execution. Background event queues, worker runtimes, webhook processors, and schedulers run continuously on the server.

---

## 2. Core Architectural Components

### A. 24/7 Server-Side Runtime (`InstagramWorkerRuntime.ts`)
- **Continuous Ingestion**: Webhooks sent by Meta are validated and queued immediately with a 200 OK response.
- **Idempotency & Deduplication**: Each inbound event generates a SHA-256 payload hash `sha256(tenantId:eventId:type:content)`. Duplicate deliveries from Meta are recognized and marked `IGNORED_DUPLICATE` without re-executing actions.
- **Anti-Loop Safety**: Prevents self-echoes (`is_echo === true`) and bounds recursion depth to $\le 2$.

### B. Dynamic Capability Service (`InstagramCapabilityService.ts`)
- Discovers account type (`BUSINESS` vs `CREATOR` vs `PERSONAL`) and authorized OAuth scopes.
- Evaluates 18+ capabilities independently with states: `AVAILABLE`, `UNAVAILABLE`, `REQUIRES_PERMISSION`, `REQUIRES_ACCOUNT_TYPE`.
- Zero fake success or artificial green checkmarks.

### C. AI Decision & Safety Engine (`InstagramDecisionEngine.ts`)
- **18+ Intent Classification**: `PRICE`, `LEAD`, `PURCHASE_INTENT`, `SUPPORT`, `COMPLAINT`, `SHIPPING`, `REFUND`, `SPAM`, `LEGAL`, `URGENT`, `PRAISE`, etc.
- **Sentiment Scoring**: `positive`, `neutral`, `negative`, `very_negative`, `mixed`.
- **Lead Scoring**: Computes dynamic score (0–100) and lifecycle stage (`HOT`, `WARM`, `COLD`).
- **Prompt Injection Defense**: Neutralizes jailbreaks and treats untrusted customer input strictly as data.
- **Escalation Rules**: High-risk intents (`LEGAL`, `REFUND`, `very_negative`) route to human review.

### D. Media Publishing Pipeline (`MetaApiClient.ts`)
- Implements Meta's official Container-based Publishing Pipeline:
  1. `POST /{ig_user_id}/media` (Create Container with image/video/reels/stories)
  2. `GET /{container_id}` (Check Container Status)
  3. `POST /{ig_user_id}/media_publish` (Publish Container)
- Posts are only marked `PUBLISHED` upon confirmation of the official Meta Media ID.

---

## 3. Webhook Flow Diagram

```text
Customer Comment / DM on Instagram
        ↓
Meta Webhook Event (X-Hub-Signature-256)
        ↓
/api/instagram/webhooks (HMAC Verification)
        ↓
Immediate 200 OK Response to Meta
        ↓
Durable Event Queue (Deduplication Check)
        ↓
InstagramWorkerRuntime (Background Worker)
        ↓
InstagramDecisionEngine (Intent + Sentiment + Lead Score + RAG)
        ↓
Action Orchestrator (Meta Graph API)
        ↓
State Committed to Multi-Tenant DB
        ↓
Dashboard Reflects Real Truth (When Opened)
```
