# QuickReply AI — LinkedIn Enterprise Automation Architecture

## 1. System Overview
The QuickReply LinkedIn Automation platform connects to LinkedIn's official REST APIs (v202401+) for Member Profiles and Company Pages. It enforces a strict **Zero-Mock Policy**: operations are executed against live endpoints, credentials are encrypted at rest using AES-256-GCM, and publication status is confirmed via provider response URNs.

```text
LinkedIn Workspace
        ↓
OAuth v2 with CSRF State & Scopes
        ↓
AES-256-GCM Token Encryption
        ↓
Organization ACL & Role Discovery
        ↓
Dynamic Capability Matrix (Granted vs Denied vs Unavailable)
        ↓
AI Content Studio (12 Formats + Quality Gate)
        ↓
Durable Scheduler with Idempotency Key
        ↓
Official LinkedIn REST API (/rest/posts)
        ↓
Provider Post URN Confirmation
        ↓
Omnichannel Social Inbox & Real Analytics
```

## 2. Hard Platform Boundaries
1. **Personal 1-on-1 Direct Messaging**: Automated private DMs and scraping of member inboxes are strictly restricted by LinkedIn Developer policies and will not be faked or simulated.
2. **Member Story Publishing**: Deprecated by LinkedIn; marked as unsupported.
3. **Fail-Closed Operations**: If credentials expire or scopes are revoked, operations fail safely with structured HTTP 401/403 status codes.

## 3. Security Model
- **Tenant Isolation**: Every LinkedIn connection, post, and comment is scoped to an immutable canonical `tenantId`.
- **Token Security**: Tokens are never returned to client components. Stored as `iv:ciphertext:authTag`.
- **Quality Gate**: Automatic protection against ReDoS, prompt injections, and SSRF URLs.
