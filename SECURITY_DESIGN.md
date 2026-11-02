# QuickReply AI Automation Operating System — Security Architecture & Threat Model

**Document Version:** 2.0  
**Security Classification:** Enterprise Level 3 Certified  
**Compliance Baseline:** SOC 2 Type II, ISO 27001, OWASP API Security Top 10  

---

## 1. Zero-Trust Security Tenets

1. **No Plaintext Secrets at Rest or in Flight:** All credentials, tokens, and OAuth keys are encrypted with AES-256-GCM.
2. **Credential Reference Decoupling:** AI conversation threads, LLM prompts, workflow JSON specifications, and client browsers ONLY see opaque references (`cred_xxx`). Decryption occurs exclusively inside the isolated runtime execution boundary.
3. **Cryptographic Multi-Tenant Isolation:** Tenant context is derived strictly from verified cryptographic JWT / HMAC tokens on the server. Client-provided tenant headers are disregarded.
4. **Autonomous Action Firewall:** External write operations (financial transactions, external communications, data deletions) are gated by automated risk scoring and explicit Human-in-the-Loop review.
5. **Constant-Time Verification:** All secret comparisons, tokens, and HMACs use `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

---

## 2. Threat Modeling & OWASP API Top 10 Mitigations

| Threat Vector | OWASP Ref | QuickReply Enterprise Mitigation |
|---|---|---|
| **Broken Object Level Auth (BOLA / IDOR)** | API1:2023 | All object queries enforce compound key `{ id, tenantId }`. Users cannot inspect or mutate other tenants' workflows, conversations, or executions. |
| **Broken Authentication** | API2:2023 | Dual-layer JWT + HMAC session tokens with rotation, secure HTTP-only cookies, and PKCE-protected OAuth flows. |
| **Broken Object Property Level Auth** | API3:2023 | Strict Zod schema validation on inbound payloads. Extraneous and sensitive fields are stripped before database persistence. |
| **Unrestricted Resource Consumption** | API4:2023 | Token bucket rate limiting per IP and per tenant (`100 req/min` for APIs, `20 req/min` for LLM calls). BullMQ per-tenant queue concurrency limits. |
| **Broken Function Level Authorization** | API5:2023 | Explicit role checks (`ADMIN`, `OPERATOR`, `VIEWER`) validated in `src/backend/authorization.ts` before executing workflow publishing or credential rotation. |
| **Server-Side Request Forgery (SSRF)** | API7:2023 | Webhook dispatchers validate target URLs against private RFC 1918 / localhost IP blocklists. Only public routable HTTPS endpoints are permitted. |
| **Security Misconfiguration** | API8:2023 | Strict Content Security Policy (CSP), HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. |
| **Improper Inventory Management** | API9:2023 | OpenAPI 3.1 contracts and strict endpoint versioning. Deprecated endpoints are routed through formal migration deprecation notices. |
| **Unsafe Consumption of Third-Party APIs** | API10:2023 | All inbound webhook payloads and integration responses undergo schema sanitization before being processed by the workflow engine. |

---

## 3. Side-Effect Classification & Action Firewall Matrix

Every action node in the integration catalog possesses an immutable `sideEffect` classification:

```
                  ┌──────────────────────────────────────────────┐
                  │          Inbound Action Execution            │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                                 [Evaluate Risk]
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
        [SAFE_READ]                 [REVERSIBLE]           [EXTERNAL / FINANCIAL]
      e.g. Gmail Query           e.g. Add Sheet Row          e.g. Send Email, Refund
             │                           │                           │
             ▼                           ▼                           ▼
      Auto-Execute                Auto-Execute +              [Risk Check / Policy]
      + Trace Log                 Audit Trail                        │
                                                                     ├─ High Risk ──> [Gate in WAITING_APPROVAL]
                                                                     │                (Owner notified via UI/Bot)
                                                                     │
                                                                     └─ Low Risk  ──> Auto-Execute + Trace
```

---

## 4. Webhook Security & Anti-Replay Guardrails

1. **Cryptographic Signatures:** Every external webhook (Stripe, GitHub, Telegram, Meta) is verified using platform-specific HMAC signatures (`stripe-signature`, `x-hub-signature-256`, etc.).
2. **Replay Window Enforcement:** Webhooks with timestamps older than 300 seconds are rejected immediately.
3. **Idempotent Ingestion:** The unique webhook ID is saved in Redis for 24 hours. Duplicates receive an instant `200 OK` acknowledgement without re-triggering execution.