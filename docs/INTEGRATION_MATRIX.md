# QuickReply Integration Capability Matrix

**Authoritative System Specification**  
**Version:** 2.0.0 · Production  
**Last Updated:** October 2026

---

## 1. Executive Summary

QuickReply standardizes on **Official Partner Platform APIs** to guarantee enterprise stability, data compliance, and zero account ban risk. This matrix defines the precise supported capabilities, authentication flows, rate limits, and compliance boundaries for every connected channel.

---

## 2. Platform Capability Matrix

| Platform | Official Connector | Auth Method | Inbound Events | Outbound Capabilities | Auto-DM Trigger | Scheduling | Rate Limits & Quotas | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Instagram** | Meta Graph API v21.0 | OAuth 2.0 (Facebook Login for Business) | Reel Comments, Post Comments, Direct Messages, Story Mentions | Public Comment Reply, 1-to-1 Private Direct Message | ✅ Yes (Keyword-Triggered) | ✅ Yes (Single, Carousel, Reels) | 200 calls/hr/user (Meta Tier 1) | 🟢 Live Production |
| **WhatsApp** | Meta WhatsApp Business Cloud API | Embedded Signup / System User Token | Inbound Customer Chats, Interactive Button Clicks, Order Inquiries | Freeform text within 24h Customer Service Window; Approved Meta Templates outside window | ❌ N/A (Direct 1:1 Inbound) | ❌ Broadcast campaigns only via approved templates | 80 messages/sec (Cloud API standard) | 🟢 Live Production |
| **YouTube** | Google YouTube Data API v3 | Google OAuth 2.0 (Audit Scope) | Top-level Video Comments, Comment Thread Replies | Public Channel Comment Reply | ❌ N/A (Public Comments Only) | ❌ N/A | 10,000 units/day quota allocation with backoff ledger | 🟢 Live Production |
| **Facebook** | Meta Graph API v21.0 | OAuth 2.0 (Pages API) | Page Post Comments, Messenger Messages | Public Comment Reply, Messenger DM reply | ✅ Yes (Post Comments to Messenger) | ✅ Yes (Page Feed & Stories) | Shared Meta Graph App Rate Limits | 🟢 Live Production |
| **LinkedIn** | LinkedIn REST API v2 | LinkedIn 3-legged OAuth | Company Page Comments, Direct Inquiries | Company Page Comment Replies | ❌ N/A | ✅ Yes (Articles, Posts, Images) | 100 requests/day/member | 🟢 Live Production |
| **Telegram** | Telegram Bot API | Bot Token (`BotFather`) | Group & Channel Messages, DM Inquiries, Inline Buttons | Immediate Text & Rich Card Replies | ✅ Yes (Bot DM) | ✅ Yes (Channel Broadcasts) | 30 messages/sec | 🟢 Live Production |

---

## 3. WhatsApp Connector Policy & Separation

### Official Meta Cloud API (Default Production Standard)
- **Connector:** `src/channels/whatsapp/WhatsAppCloudProvider.ts`
- **Security:** HMAC-SHA256 signature verification on every inbound Meta webhook.
- **24-Hour Policy:** Outbound replies enforce Meta's Customer Service Window. Responses sent within 24 hours of customer initiation use freeform AI generation. Messages sent outside the 24-hour window require approved Meta template messages (`WhatsAppPolicyService.ts`).
- **Account Safety:** 100% official Meta compliance. Zero account ban risk.

### Legacy / Self-Hosted Web Connector (Baileys)
- **Status:** **Deprecated for Production**. Restricted strictly to local developer sandbox exploration.
- **Risk Assessment:** Unofficial WhatsApp Web reverse-engineering libraries violate Meta Platform Terms of Service and lead to automated phone number suspension when used for commercial bulk messaging.
- **Architecture Isolation:** Baileys dependencies are decoupled from the core Vercel production path. Session storage (`.whatsapp_sessions/`) is not supported on ephemeral serverless platforms.

---

## 4. Quota & Backoff Architecture

### YouTube Data API Quota Guard
- Quota cost for `commentThreads.list`: 1 unit.
- Quota cost for `comments.insert`: 50 units.
- `syncQuotaLedger()` in `src/backend/youtube.ts` persists daily consumption in MongoDB. If quota consumption exceeds 8,500 units (85%), polling switches automatically to exponential backoff (polling every 30 minutes instead of every 30 seconds) to guarantee critical operational headroom.

---

## 5. Security & Multi-Tenant Boundaries
1. **OAuth Encryption:** All client secrets, access tokens, and refresh tokens are encrypted at rest using AES-256-GCM.
2. **Tenant Scoping:** All social posts, comments, conversations, and webhook dispatches are strictly scoped by `tenantId` (the authenticated workspace).
3. **Action Firewall:** Dispatches involving refunds, order cancellations, or discounts greater than configured store thresholds require manual staff authorization.
