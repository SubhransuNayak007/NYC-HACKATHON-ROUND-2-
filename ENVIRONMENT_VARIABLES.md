# QuickReply AI Automation Operating System — Environment Configuration Reference

**Document Version:** 2.0  
**Security Policy:** Never commit actual plaintext secrets. All variables below are documented with template placeholders and security classifications.

---

## 1. Core Platform Configuration

| Variable | Type | Required | Description | Example |
|---|---|---|---|---|
| `NODE_ENV` | String | Yes | Runtime environment (`development`, `staging`, `production`) | `production` |
| `APP_URL` | URL | Yes | Canonical public URL of the SaaS platform | `https://app.quickreply.ai` |
| `NEXT_PUBLIC_APP_URL` | URL | Yes | Client-accessible URL for frontend navigation | `https://app.quickreply.ai` |
| `PORT` | Number | No | HTTP port (default: 3000) | `3000` |

---

## 2. Database & State Storage

| Variable | Type | Required | Description | Sensitivity |
|---|---|---|---|---|
| `MONGODB_URI` | Connection String | Yes | MongoDB Atlas replica-set connection URI with credentials and options | Critical (Secret) |
| `REDIS_URL` | Connection String | Yes | Redis / Upstash connection URI for distributed job queue and rate limiting | Critical (Secret) |

---

## 3. Security & Cryptographic Secrets

| Variable | Type | Required | Description | Sensitivity |
|---|---|---|---|---|
| `SESSION_SECRET` | Hex / Base64 String | Yes | Session signature secret (min 32 characters) | Critical (Secret) |
| `JWT_SECRET` | Hex / Base64 String | Yes | JWT token signing key (min 32 characters) | Critical (Secret) |
| `TOKEN_ENCRYPTION_KEY` | 64 Hex String | Yes | AES-256-GCM symmetric master key for encrypting credentials at rest | Highest (Master Key) |
| `CRON_SECRET` | String | Yes | Bearer token required for executing background cron endpoints | Critical (Secret) |

---

## 4. AI & LLM Provider API Keys

| Variable | Type | Required | Description | Sensitivity |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | String | Yes | Anthropic Claude API key for reply generation and reasoning | Critical (Secret) |
| `GEMINI_API_KEY` | String | No | Google Gemini API key for multimodal reasoning and OCR extraction | Critical (Secret) |

---

## 5. Execution Runtimes (n8n & External Services)

| Variable | Type | Required | Description | Sensitivity |
|---|---|---|---|---|
| `N8N_API_URL` | URL | No | Base URL of n8n instance for external workflow deployment | Confidential |
| `N8N_API_KEY` | String | No | API key for authenticated n8n REST endpoints | Critical (Secret) |

---

## 6. Integration Platforms & Connectors

| Variable | Type | Required | Description | Sensitivity |
|---|---|---|---|---|
| `GOOGLE_CLIENT_ID` | String | No | Google OAuth 2.0 Client ID for Gmail & Google Sheets | Public / Safe |
| `GOOGLE_CLIENT_SECRET` | String | No | Google OAuth 2.0 Client Secret | Critical (Secret) |
| `TELEGRAM_BOT_TOKEN` | String | No | Telegram Bot Token for notification alerts and mini-app webhooks | Critical (Secret) |
| `META_APP_ID` | String | No | Meta / Facebook App ID | Public / Safe |
| `META_APP_SECRET` | String | No | Meta App Secret for Instagram Graph API | Critical (Secret) |
| `WHATSAPP_ACCESS_TOKEN` | String | No | Meta System User permanent token for WhatsApp Cloud API | Critical (Secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | String | No | Registered WhatsApp Cloud Business Phone Number ID | Public / Safe |
| `STRIPE_SECRET_KEY` | String | No | Stripe secret key for SaaS subscriptions and checkout sessions | Critical (Secret) |
| `STRIPE_WEBHOOK_SECRET` | String | No | Stripe webhook signing secret for cryptographic verification | Critical (Secret) |
