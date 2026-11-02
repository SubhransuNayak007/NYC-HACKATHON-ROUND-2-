# Instagram Professional API Integration Guide
## Official Meta Graph API v19.0+ Architecture

---

## 1. Overview & Permissions

QuickReply connects to Instagram Business and Creator accounts through the official **Meta Graph API v19.0+**.

### Required Scopes
- `instagram_basic`: Read profile information and media.
- `instagram_content_publish`: Publish posts, reels, and stories.
- `instagram_manage_comments`: Read, delete, and reply to comments on Instagram posts.
- `instagram_manage_messages`: Send and receive Instagram Direct Messages (requires Meta Business Verification).
- `pages_show_list`: Discover Facebook Pages connected to the user's Meta account.
- `pages_read_engagement`: Access engagement metrics and page data.
- `pages_manage_posts`: Manage post interactions on associated Pages.
- `business_management`: Read business account associations.

---

## 2. OAuth 2.0 Flow Architecture

```
User Browser                     QuickReply Backend                         Meta OAuth Server
     │                                    │                                         │
     │── 1. GET /api/integrations/        │                                         │
     │      instagram/connect ───────────>│                                         │
     │                                    │── 2. Generate signed state cookie       │
     │<── 3. 302 Redirect to Meta Dialog ─│                                         │
     │                                                                              │
     │── 4. User Approves Scopes ──────────────────────────────────────────────────>│
     │                                                                              │
     │<── 5. Redirect to Callback with code & state ────────────────────────────────│
     │                                                                              │
     │── 6. GET /api/integrations/                                                  │
     │      instagram/callback ──────────>│                                         │
     │                                    │── 7. Verify HMAC State & Expiry (<10m)  │
     │                                    │── 8. Delete State Cookie                │
     │                                    │── 9. Exchange code for short-lived token │
     │                                    │      ──────────────────────────────────>│
     │                                    │<───── Returns short-lived token ────────│
     │                                    │── 10. Exchange for 60-day LL Token ────>│
     │                                    │<───── Returns long-lived token ─────────│
     │                                    │── 11. Discover Instagram Accounts ─────>│
     │                                    │<───── Returns page & IG accounts ───────│
     │                                    │── 12. AES-256-GCM Encrypt Token         │
     │                                    │── 13. Persist scoped to Tenant          │
     │<── 14. 302 Redirect to Dashboard ──│                                         │
```

---

## 3. Token Security & Storage

1. **At Rest**: Long-lived access tokens are encrypted using **AES-256-GCM** with unique 12-byte random IVs and 16-byte authentication tags.
2. **In Transit**: All communication with Graph API is enforced over TLS 1.3/HTTPS.
3. **In Memory**: Decrypted tokens are never stored in global variables or passed to client-side code.
4. **Lifecycle**:
   - `CONNECTED`: Active token valid.
   - `REAUTH_REQUIRED`: Error code 190 / expired token detected; user prompted to reconnect.
   - `DISCONNECTED`: User triggered revocation; encrypted tokens wiped from database.

---

## 4. Webhook Security

- Incoming webhooks from Meta are received at `/api/webhooks/instagram`.
- Every payload must include `x-hub-signature-256`.
- Signatures are verified using constant-time `crypto.timingSafeEqual` with `META_APP_SECRET`.
- Events are deduplicated using an idempotency hash to prevent replay loops.
