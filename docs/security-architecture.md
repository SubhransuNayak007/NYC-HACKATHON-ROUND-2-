# Security Architecture
## QuickReply AI — Zero-Trust, Secure-by-Design, Multi-Tenant

> **Security Reality Baseline**: This architecture is engineered for attack resistance, least privilege, defense-in-depth, and observable failures. It does not claim to be breach-proof, zero-day immune, or free from supply-chain risk. The goal is: small attack surface, fast detection, minimal blast radius, safe failure, and rapid recovery.

---

## Trust Zones

| Zone | Description | Trust Level |
|------|-------------|-------------|
| **ZONE 0** | Internet / Unknown clients | UNTRUSTED |
| **ZONE 1** | Browser (user's device) | UNTRUSTED |
| **ZONE 2** | Public API / Edge (Next.js middleware) | BOUNDARY |
| **ZONE 3** | Application services (API route handlers) | AUTHENTICATED |
| **ZONE 4** | Background workers / Queue | AUTHENTICATED |
| **ZONE 5** | Database (MongoDB) | SENSITIVE |
| **ZONE 6** | Secret management (.env / environment) | SECRET |
| **ZONE 7** | External providers (Meta, Google, Anthropic) | AUTHENTICATED EXTERNAL |

No zone automatically trusts another. Every boundary enforces: authentication, authorization, input validation, rate limiting, logging, and timeouts.

---

## Authentication Architecture

### Application Identity (who is the user?)
- JWT access tokens (15-min TTL) in `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- Refresh tokens (90-day TTL) — `src/backend/auth.ts`
- Legacy HMAC session cookies for backwards compatibility
- Verified in `src/middleware.ts` on every request

### Instagram Integration Identity (what Instagram account is connected?)
- **Separate from application login** — never used as a session token
- Stored as AES-256-GCM encrypted blob in MongoDB
- Only decrypted server-side, never sent to browser
- Lifecycle: `PENDING → CONNECTED → HEALTHY / REAUTH_REQUIRED → DISCONNECTED`

---

## OAuth State Security

```
Browser → GET /api/integrations/instagram/connect (requires authenticated session)
  ↓
  Generate state payload: { tenant: email, nonce: 256-bit random, ts: timestamp }
  Sign payload with HMAC-SHA256(SESSION_SECRET)
  Store in HttpOnly cookie: "<base64url_payload>.<hmac_signature>"
  Send payload-only to Meta as `state` parameter
  ↓
Meta → GET /api/integrations/instagram/callback
  ↓
  Retrieve signed cookie
  Verify HMAC signature (constant-time)
  Verify state matches cookie payload (constant-time)
  Verify timestamp (reject if > 10 minutes)
  Delete cookie immediately (single-use)
  Extract tenant from verified payload
  Exchange code → short-lived token → long-lived token
  Encrypt token (AES-256-GCM)
  Persist to database under verified tenantId
  Audit log: INSTAGRAM_CONNECTED
  Redirect → /dashboard/platforms?connected=instagram
```

---

## CORS Policy

- **No wildcard CORS** (`*`) for authenticated APIs
- Explicit allowlist from `ALLOWED_ORIGINS` environment variable
- Origins not on the allowlist: `Access-Control-Allow-Origin` header is omitted (browser blocks request)
- Credentials (`Access-Control-Allow-Credentials: true`) only granted to explicitly allowlisted origins

---

## Content Security Policy

- `unsafe-eval` removed
- `unsafe-inline` scoped to styles only (required by Next.js SSR; script inline removed)
- `object-src 'none'` — no embedded objects/plugins
- `base-uri 'self'` — prevents base tag injection
- `form-action 'self'` — prevents form hijacking to external destinations
- HSTS enforced in production (`max-age=31536000; includeSubDomains; preload`)

---

## Multi-Tenant Isolation (OWASP API1)

- Every sensitive database entity is scoped to `tenantId` (the user's email / organization ID)
- Tenant ID is derived **exclusively from the verified server-side session** — never from request body or query parameters
- Object-level authorization via `assertTenantOwnership()` in `src/backend/authorization.ts`
- Automated cross-tenant isolation tests in `scripts/test-security-cross-tenant.mjs`

---

## Rate Limiting (OWASP API4)

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 10 req | 1 min/IP |
| OAuth initiation | 5 req | 15 min/user |
| General API | 120 req | 1 min/user |
| AI generation | 20 req | 1 min/org |
| Webhooks | 100 req | 1 min/IP |

Backed by Redis (in-memory fallback). Rate limiting is fail-open: if Redis fails, requests are allowed through (logged).

---

## SSRF Defense (OWASP API7)

- All server-side URL fetches pass through `src/backend/ssrf-guard.ts`
- Blocks: RFC1918, loopback, link-local, metadata endpoints (169.254.169.254, metadata.google.internal)
- DNS-resolves destination and re-validates the resolved IP
- Provider calls use explicit allowlist mode

---

## AI Security (OWASP API10)

- Platform content (Instagram comments, messages) is treated as DATA, never as INSTRUCTIONS
- Prompt injection detection via `src/backend/ai-policy.ts:checkForPromptInjection()`
- AI output validated against strict schema before dispatch
- Tool allowlist enforced: AI cannot call tools outside `AiToolName` union type
- No database credentials or access tokens ever included in AI context

---

## Circuit Breakers

| Dependency | Failure Threshold | Open Duration |
|-----------|-------------------|---------------|
| Meta Graph API | 5 failures | 60 seconds |
| Anthropic API | 3 failures | 30 seconds |
| OpenAI API | 3 failures | 30 seconds |
| YouTube API | 5 failures | 60 seconds |
| LinkedIn API | 5 failures | 60 seconds |

Implemented in `src/backend/circuit-breaker.ts`. State is process-local (intentional: avoids Redis dependency when Redis may be the failing service).

---

## Known Limitations

1. **Meta API permissions** — `instagram_manage_messages` scope requires Meta Business Verification. Features dependent on this scope will return `UNSUPPORTED_BY_PROVIDER` if not granted.
2. **Token refresh** — Instagram long-lived tokens (60-day) must be refreshed before expiry. There is no automatic server-push notification of expiry; the system polls token health.
3. **Webhook delivery** — Meta does not guarantee exactly-once webhook delivery. All webhook event handlers are idempotent.
4. **Redis dependency** — Rate limiting and distributed locking degrade to in-memory fallback when Redis is unavailable. In-memory state is not shared across horizontal instances.
5. **Session secret** — If `SESSION_SECRET` is rotated, all existing sessions and OAuth state cookies are immediately invalidated. Plan rotations for low-traffic windows.
6. **AES-256-GCM key version** — Token encryption does not yet implement multi-version key rotation. Rotating `TOKEN_ENCRYPTION_KEY` requires re-encrypting existing tokens.
