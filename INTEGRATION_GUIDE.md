# QuickReply Integration & Connector Developer Guide

**Document Version:** 3.0  
**Classification:** Integration Architecture & Engineering Guide  
**Connectors Covered:** Webhook, HTTP, Google Sheets, Gmail, Slack, HubSpot, Canva Connect, Google Drive, OpenAI, Anthropic  
**Last Updated:** 2026-11-01  

---

## 1. Integration Platform Architecture

QuickReply integrates with external SaaS applications and AI foundational models through a unified **Connector Runtime Engine**. This engine abstracts the nuances of OAuth 2.0 flows, API rate limits, error serialization, secret encryption, and SSRF security.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              INTEGRATION RUNTIME LIFECYCLE                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [Visual Canvas / Workflow Engine]                                                    │
│                 │                                                                      │
│                 │ Invokes Node (references `cred_<uuid>`)                              │
│                 ▼                                                                      │
│   [CredentialVault] ──► Decrypts AES-256-GCM In-Memory                                 │
│                 │                                                                      │
│                 │ Evaluates: (expiresAt - NOW) <= 300s ?                               │
│                 ├── YES ──► [OAuthLifecycleManager] (Executes Refresh Grant)           │
│                 │                                                                      │
│                 ▼                                                                      │
│   [SSRF Guard Proxy] ──► Validates IP: Blocks private/loopback/cloud metadata ranges   │
│                 │                                                                      │
│                 ▼                                                                      │
│   [Third-Party External API / Mock Integration Server]                                 │
│                 │                                                                      │
│                 ▼                                                                      │
│   [Telemetry & Redaction Filter] ──► Scrubs Authorization headers, tokens, passwords   │
│                 │                                                                      │
│                 ▼                                                                      │
│   [Committed Node Output Checkpoint]                                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Credential Management

### 2.1 Credential Registration Lifecycle
1. **Creation**: User connects an integration in the UI (OAuth 2.0 popup or API key form).
2. **Encryption at Rest**: `CredentialVault.storeCredential()` encrypts secret tokens using **AES-256-GCM** with a 96-bit random IV and 128-bit authentication tag.
   $$\text{Storage Format: } \text{iv\_hex} : \text{authTag\_hex} : \text{ciphertext\_hex}$$
3. **Opaque Token Binding**: The vault returns an opaque reference: `cred_<uuidv4>`. The workflow JSON stores only this ID.
4. **Decryption at Runtime**: When the Durable Execution Engine invokes a node, `CredentialVault.resolveSecretForRuntime()` decrypts the payload in-memory and injects it into `ctx.credentials`.
5. **Redaction**: Plaintext secrets are scrubbed before writing to logs, step traces, or SSE streams.

### 2.2 Automated Token Refresh Loop
For OAuth 2.0 connectors, credentials maintain `expiresAt` timestamps. Before node dispatch, the engine verifies:
$$\Delta t = \text{expiresAt} - \text{NOW}$$
If $\Delta t \le 300\text{ seconds}$ (5 minutes):
1. `OAuthLifecycleManager` executes an asynchronous refresh grant request to the provider's token endpoint using the stored `refreshToken`.
2. Encrypts and writes the new `accessToken`, `refreshToken`, and updated `expiresAt` atomically to the database.
3. Injects the refreshed access token into the active node context without failing the workflow.

---

## 3. Comprehensive Connector Guides

### 3.1 Webhook Connector (`webhook`)
- **Protocol**: HTTP/1.1 & HTTP/2 Inbound / Outbound.
- **Authentication**: HMAC-SHA256 Secret Header validation (`X-QuickReply-Signature`) or custom API key.
- **Inbound Trigger (`inbound_webhook`)**:
  - Endpoint: `POST /api/webhooks/automation/[endpointId]`
  - Validates payload size ($\le 5\text{MB}$), parses JSON/Form data, and initiates the workflow execution.
  - Replay prevention: Verifies timestamp drift ($\le 300\text{s}$).
- **Outbound Dispatch (`post_transformed_result`)**:
  - Dispatches transformed JSON data to external webhook URLs via `ctx.http.request()`.
  - Supports custom headers, retry policies, and basic auth.

---

### 3.2 HTTP Request Connector (`http`)
- **Protocol**: Universal REST Client (GET, POST, PUT, PATCH, DELETE, HEAD).
- **Authentication**: Bearer Token, Basic Auth, Custom Headers, or None.
- **SSRF Guard Invariant**:
  All targets are resolved through DNS and checked against `src/backend/ssrf-guard.ts`. The request is aborted with HTTP 403 if target resolves to:
  - Loopback (`127.0.0.0/8`, `::1`)
  - Private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Cloud Metadata IP (`169.254.169.254` AWS/GCP/Azure)
- **Features**: Automatic JSON parsing, query parameter encoding, response headers inspection, and status code assertion (`expectedStatusCodes: [200, 201]`).

---

### 3.3 Google Sheets Connector (`google_sheets`)
- **Protocol**: Google Sheets REST API v4.
- **Authentication**: OAuth 2.0 (`https://www.googleapis.com/auth/spreadsheets`).
- **Token Endpoint**: `https://oauth2.googleapis.com/token`.
- **Operations**:
  - `read_sheet`: Reads values from range (e.g. `Sheet1!A1:Z100`). Automatically maps row headers to object keys.
  - `append_row`: Appends one or more rows to a sheet tab using `valueInputOption=USER_ENTERED`.
  - `update_row`: Updates specific row by 1-based index.
  - `clear_rows`: Clears range contents while preserving column headers.
- **Rate Limit Handling**: Google Sheets API enforces 300 requests/minute/project. Retries on HTTP 429 with exponential backoff.

---

### 3.4 Gmail Connector (`gmail`)
- **Protocol**: Gmail REST API v1.
- **Authentication**: OAuth 2.0 (`https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`).
- **Operations**:
  - `new_email_received` (Trigger): Polls or subscribes via Google Cloud Pub/Sub for unread emails matching search query (e.g. `is:unread label:inbox "quote request"`).
  - `search_emails`: Searches inbox using standard Gmail search syntax, returning message IDs and thread IDs.
  - `get_email_details`: Retrieves full RFC 822 MIME payload, decoding base64url message body, sender, subject, and attachments.
  - `send_email`: Constructs MIME message, encodes in base64url, and dispatches via `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`.

---

### 3.5 Slack Connector (`slack`)
- **Protocol**: Slack Web API (`https://slack.com/api/`).
- **Authentication**: OAuth 2.0 Bot Token (`xoxb-...`) with scopes `chat:write`, `channels:read`, `users:read`.
- **Operations**:
  - `post_message`: Posts markdown or Block Kit structured messages to public or private channels (`channel: "#sales-alerts"` or `channelId: "C12345678"`).
  - `post_ephemeral`: Sends user-specific temporary alerts visible only to recipient.
  - `create_channel`: Creates a dedicated deal room or incident channel.
- **Rate Limit**: Tier 3 Slack API allows 50 requests/minute. The connector automatically respects the `Retry-After` header.

---

### 3.6 HubSpot Connector (`hubspot`)
- **Protocol**: HubSpot CRM API v3 (`https://api.hubapi.com/`).
- **Authentication**: OAuth 2.0 with scopes `crm.objects.contacts.write`, `crm.objects.deals.write`.
- **Operations**:
  - `upsert_contact`: Searches contact by email. If found, updates properties (e.g. `lifecyclestage: "salesqualifiedlead"`, `lead_score: 95`); if not found, creates a new contact object.
  - `create_deal`: Creates a pipeline deal associated with the contact ID.
  - `search_contacts`: Advanced filter query over contact attributes.

---

### 3.7 Canva Connect API Connector (`canva`)
- **Protocol**: Canva Connect REST API v1 (`https://api.canva.com/rest/v1`).
- **Authentication**: OAuth 2.0 PKCE flow.
  - Scopes: `design:content:read`, `design:content:write`, `brandtemplate:meta:read`, `brandtemplate:content:read`, `asset:read`, `asset:write`.
  - Authorize URL: `https://www.canva.com/api/oauth/authorize`.
  - Token URL: `https://api.canva.com/rest/v1/oauth/token`.
- **Operations**:
  - `list_templates`: Retrieves available Canva Brand Templates for the organization (`GET /v1/brand-templates`).
  - `autofill_template`: Initiates asynchronous autofill job (`POST /v1/autofills`) mapping workflow data to template variables (e.g. `headline_text`, `metric_kpi`, `architecture_diagram_image`).
  - `export_design`: Requests high-resolution PDF or PNG render (`POST /v1/exports`), polls job status until `completed`, and returns the public CDN download URL.

---

### 3.8 Google Drive Connector (`google_drive`)
- **Protocol**: Google Drive REST API v3.
- **Authentication**: OAuth 2.0 (`https://www.googleapis.com/auth/drive.file`).
- **Operations**:
  - `upload_file`: Uploads binary or stream data (e.g. PDF rendered by Canva or invoice PDF) to specified folder ID.
  - `create_folder`: Organizes files into client or date-partitioned folders.
  - `get_download_link`: Retrieves web view link and direct download URL.

---

### 3.9 OpenAI SDK Connector (`openai`)
- **Protocol**: OpenAI REST API v1 (`https://api.openai.com/v1`).
- **Authentication**: API Key (`Authorization: Bearer sk-...`).
- **Operations**:
  - `chat_completion`: Invokes GPT-4o or GPT-4o-mini with system prompt, temperature, max tokens, and optional JSON schema enforcement (`response_format: { type: "json_object" }`).
  - `create_embeddings`: Generates 1536-dimensional vector embeddings using `text-embedding-3-small`.

---

### 3.10 Anthropic SDK Connector (`anthropic`)
- **Protocol**: Anthropic Messages API v1 (`https://api.anthropic.com/v1/messages`).
- **Authentication**: API Key (`x-api-key: sk-ant-...`).
- **Header**: `anthropic-version: 2023-06-01`.
- **Operations**:
  - `messages_create`: Invokes Claude 3.5 Sonnet or Claude 3.5 Haiku. Supports system instructions, multi-turn message arrays, tool calling definitions, and structured JSON output extraction.

---

## 4. Hermetic Mock Integration Server (`MockIntegrationServer.ts`)

To ensure that automated end-to-end tests (Scenarios A through E) run deterministically in CI/CD environments without relying on paid external accounts, QuickReply provides an internal **Mock Integration Server**:

- **Location**: `src/backend/testing/MockIntegrationServer.ts`
- **Routing**: Mounted at `/api/mock/*`.
- **Supported Endpoints**:
  - `POST /api/mock/google/sheets/append`: Accepts spreadsheet row append payloads, records in memory, and returns `{ updatedRange: "Sheet1!A2:E2" }`.
  - `GET /api/mock/google/sheets/read`: Returns pre-seeded metric rows.
  - `POST /api/mock/gmail/send`: Captures email recipient, subject, and MIME body, returning `{ id: "msg_mock_001" }`.
  - `POST /api/mock/slack/chat.postMessage`: Validates channel and blocks, returning `{ ok: true, ts: "1730448000.000100" }`.
  - `POST /api/mock/hubspot/crm/v3/objects/contacts`: Returns upserted contact record with ID `contact_mock_8819`.
  - `POST /api/mock/canva/v1/autofills`: Creates autofill job returning `{ job: { id: "job_canva_001", status: "completed", result: { design: { id: "design_mock_77" } } } }`.
  - `POST /api/mock/canva/v1/exports`: Generates mock export URL `https://mock.canva.com/exports/brief_mock.pdf`.
  - `POST /api/mock/billing/charge`: Configurable failure endpoint returning HTTP 503 on attempts 1 and 2, and HTTP 200 on attempt 3 (verifying Scenario D retry backoff).

All received requests are recorded in `MockIntegrationServer.getRecordedRequests()`, allowing integration tests to assert exact payload delivery without external network requests.
