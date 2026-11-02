# Threat Model
## QuickReply AI — STRIDE & OWASP API Top 10 Analysis

---

## 1. System Overview & Asset Inventory

| Asset | Sensitivity | Storage Location | Protection Mechanism |
|-------|-------------|------------------|----------------------|
| User Credentials / Passwords | CRITICAL | Not stored directly (Google OAuth / bcrypt) | OAuth 2.0 / Salted hash |
| JWT Signing Secrets (`JWT_SECRET`, `SESSION_SECRET`) | CRITICAL | Server Environment Variables | Inaccessible to client, minimum 32 chars |
| Instagram Long-Lived Access Tokens | CRITICAL | MongoDB / Tenant JSON DB | AES-256-GCM authenticated encryption |
| Token Encryption Key (`TOKEN_ENCRYPTION_KEY`) | CRITICAL | Server Environment Variables | 256-bit entropy |
| Multi-tenant Business Data & Automations | HIGH | Scoped Tenant Collections | Server-side `assertTenantOwnership()` checks |
| Webhook Signing Secrets (`META_WEBHOOK_VERIFY_TOKEN`) | HIGH | Server Environment Variables | HMAC-SHA256 comparison |
| System Audit Logs | HIGH | Structured Logger / Observability Stream | Redaction of secrets, append-only |

---

## 2. Threat Analysis (STRIDE Model)

### S — Spoofing Identity
* **Threat**: Attacker attempts to forge a session token or OAuth state to impersonate another tenant.
* **Mitigations**:
  - JWT tokens signed with HMAC-SHA256 (`src/backend/auth.ts`) using minimum 32-char secret.
  - OAuth state tokens are signed with HMAC-SHA256 and verified using timing-safe comparisons.
  - Meta Webhooks verified via `x-hub-signature-256` HMAC validation.

### T — Tampering with Data
* **Threat**: Attacker modifies encrypted tokens or modifies requests across tenant boundaries.
* **Mitigations**:
  - Authenticated encryption (AES-256-GCM) with 16-byte authentication tags detects any ciphertext tampering.
  - Multi-tenant boundary checks in `assertTenantOwnership()` prevent cross-tenant writes.

### R — Repudiation
* **Threat**: User or attacker performs unauthorized state mutations without a traceable record.
* **Mitigations**:
  - Centralized audit logging (`src/backend/audit-logger.ts`) logs all authentication, authorization, and connection lifecycle events.
  - Every HTTP request receives an immutable correlation ID (`X-Request-ID`).

### I — Information Disclosure
* **Threat**: Secrets, tokens, or other tenants' data leak through API responses, debug endpoints, or CORS misconfiguration.
* **Mitigations**:
  - Wildcard CORS removed; strict origin allowlist in `src/middleware.ts`.
  - Debug endpoints (`/api/debug/db`) strictly disabled in production.
  - Sensitive token fields are stripped before API responses are serialized.
  - CSP forbids `eval()` and limits framing to authorized Meta origins.

### D — Denial of Service
* **Threat**: Resource exhaustion via brute-force login, rapid OAuth initiation, or AI generation abuse.
* **Mitigations**:
  - Tiered rate limits (`src/backend/ratelimit.ts`): Auth (10/min), OAuth initiation (5/15min), AI generation (20/min), Webhooks (100/min).
  - Circuit breakers (`src/backend/circuit-breaker.ts`) prevent cascading failures during third-party outages.

### E — Elevation of Privilege
* **Threat**: Low-privilege user (e.g. VIEWER or OPERATOR) executes high-privilege actions (e.g. Disconnect, Billing).
* **Mitigations**:
  - Centralized RBAC matrix (`src/backend/authorization.ts`) with 7-tier role ranking (`OWNER > ADMIN > MANAGER > OPERATOR > ANALYST > MEMBER > VIEWER`).
  - Action policies explicitly validated before any state change.

---

## 3. Residual Risk & Mitigation Strategy

1. **Third-Party API Outages**: Mitigated via circuit breakers and structured retry budgets with exponential backoff.
2. **Secret Rotation**: Rotating `SESSION_SECRET` requires session re-authentication; token key rotation planned for future key versioning release.
