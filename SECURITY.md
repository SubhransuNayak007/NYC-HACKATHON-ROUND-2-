# QuickReply Enterprise Security, Isolation & Compliance Specification

**Document Version:** 3.0  
**Classification:** Core Security & Compliance Architecture  
**Security Standards:** SOC 2 Type II, ISO 27001, OWASP API Top 10 Aligned  
**Cryptography Baseline:** AES-256-GCM, HMAC-SHA256, SHA-256 Chained Audits  
**Last Updated:** 2026-11-01  

---

## 1. Zero-Trust Security Architecture

QuickReply implements a strict **defense-in-depth zero-trust architecture** across all layers of the platform:
1. **Network & Ingress**: All public ingress routes pass through edge rate limiters and strict SSRF firewalls.
2. **Tenant Boundary**: Every database query and API endpoint enforces cryptographic tenant isolation. Cross-tenant access is blocked at the lowest data access boundary.
3. **Secrets Isolation**: Secrets are encrypted at rest with AES-256-GCM and never leave the vault as plaintext. Workflows reference secrets strictly via opaque identifiers (`cred_<uuid>`).
4. **Execution Sandboxing**: User-defined custom scripts execute in isolated worker threads with restricted CPU, memory, and disabled network access.
5. **Tamper-Evident Audit Logging**: System actions are cryptographically chained into an append-only SHA-256 hash sequence.

---

## 2. Multi-Tenant Isolation Architecture

### 2.1 Cryptographic Tenant Partitioning
Tenant identifiers are cryptographically derived and non-enumerable:
$$\text{tenantId} = \text{"tenant\_"} + \text{SHA256}(\text{ownerEmail} \lor \text{primaryAccountId})[0..15]$$

### 2.2 Database Query Boundary (`TenantGuard.ts`)
The persistence layer (`src/database/db.ts`) automatically injects tenant and workspace filters into every read and write operation:

```typescript
export function assertTenantOwnership(
  resourceTenantId: string,
  requestingTenantId: string,
  resourceType: string,
  resourceId: string
): void {
  if (resourceTenantId !== requestingTenantId) {
    AuditLogChainer.recordSecurityEvent({
      eventType: "CROSS_TENANT_ACCESS_DENIED",
      resourceType,
      resourceId,
      attemptedByTenantId: requestingTenantId,
      ownerTenantId: resourceTenantId
    });
    throw new ForbiddenError(`Access denied: Cross-tenant resource access is strictly prohibited`);
  }
}
```

In file fallback mode, each tenant maintains an isolated document store (`src/data/db_<tenantId>.json`), eliminating any risk of cross-tenant directory traversal or data bleed.

---

## 3. 7-Tier Role-Based Access Control (RBAC)

QuickReply defines 7 discrete operational roles, mapping granular permissions across workflows, credentials, deployments, and executions:

| Action / Permission | OWNER | ADMIN | MEMBER | EDITOR | OPERATOR | DEVELOPER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `workspace.manage_billing` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `workspace.delete` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `workspace.manage_members` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credentials.create_update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credentials.view_opaque` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `workflows.create_edit` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| `workflows.delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `workflows.deploy_production`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `workflows.manual_execute` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `approvals.decide` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `scripts.author_sandbox` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `audit_logs.view_export` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `executions.view_telemetry` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. AES-256-GCM Credential Vault

### 4.1 Key Derivation & Encryption Parameters
- **Cipher Algorithm**: `aes-256-gcm` (Authenticated Galois/Counter Mode).
- **Key Derivation**: HKDF (HMAC-based Key Derivation Function) using SHA-256 from the master secret (`TOKEN_ENCRYPTION_KEY` or hashed `SESSION_SECRET`).
- **Initialization Vector (IV)**: 12 bytes (96 bits) of cryptographically secure random bytes generated per encryption call via `crypto.randomBytes(12)`. IVs are NEVER reused.
- **Authentication Tag**: 16 bytes (128 bits) verifying payload integrity and authenticity.
- **Storage Serialization**:
  $$\text{Payload} = \text{iv.toString('hex')} + \text{":"} + \text{authTag.toString('hex')} + \text{":"} + \text{ciphertext.toString('hex')}$$

### 4.2 Decryption & Authentication Verification
During decryption, `crypto.createDecipheriv` verifies the authentication tag before emitting any plaintext. If the ciphertext or tag has been tampered with or corrupted on disk, decryption immediately throws an `AuthenticationTagMismatchError`.

### 4.3 Zero Secret Leakage Invariant
1. The frontend visual canvas receives only opaque metadata:
   `{ id: "cred_88a", appId: "slack", label: "Marketing Slack", status: "ACTIVE" }`.
2. Plaintext tokens are injected into memory **only** within the execution fiber of the active node.
3. Plaintext tokens are destroyed and garbage collected as soon as the node completes execution.

---

## 5. Worker-Thread Script Sandboxing (`ScriptSandbox.ts`)

For custom JavaScript/TypeScript transformation nodes (`customScriptNode`), user code runs inside an isolated worker thread (`node:worker_threads`) with strict security boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SCRIPT WORKER SANDBOX                           │
├────────────────────────────────────────────────────────────────────────┤
│  Host Process (DEE)                                                    │
│      │                                                                 │
│      │ Spawns Worker Thread with Resource Limits                       │
│      ▼                                                                 │
│  Isolated V8 Worker Environment:                                       │
│  • Resource Limit: Memory Max 64MB (`--max-old-space-size=64`)         │
│  • Hard CPU Execution Timeout: 2,000ms                                 │
│  • Inbound Data: `inputs` (JSON clone)                                 │
│                                                                        │
│  STRIPPED GLOBALS:                                                     │
│  process = undefined             fs = undefined                        │
│  require = undefined             net = undefined                       │
│  child_process = undefined       http = undefined                      │
│  eval = undefined                fetch = undefined                     │
│  Function = undefined            global = undefined                    │
│                                                                        │
│  Allowed: Math, Date, JSON, String, Array, Object                      │
│      │                                                                 │
│      │ Execution finishes or throws                                    │
│      ▼                                                                 │
│  Returns JSON-serializable `output`                                    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Timeout Enforcement**: If a script enters an infinite loop (`while(true)`), a timer on the host thread terminates the worker via `worker.terminate()` after 2,000ms and returns `SCRIPT_TIMEOUT_ERROR`.
- **Memory Enforcement**: Scripts attempting to allocate large buffers exceed the 64MB heap ceiling and are terminated immediately with `OOM_KILLED_ERROR`.

---

## 6. Cryptographic Audit Log Hash Chaining

To ensure tamper-evidence for compliance audits, all administrative, credential, and workflow deployment events are recorded in an append-only hash chain:

### 6.1 Mathematical Chaining Specification
- **Genesis Block ($H_0$)**:
  $$H_0 = \text{SHA256}(\text{"QUICKREPLY\_GENESIS\_BLOCK\_2026"})$$
- **Block $n$ Hash ($H_n$)**:
  $$H_n = \text{SHA256}\left(H_{n-1} \,\|\, \text{seq} \,\|\, \text{timestamp} \,\|\, \text{tenantId} \,\|\, \text{userId} \,\|\, \text{eventType} \,\|\, \text{JSON}(\text{details})\right)$$

### 6.2 Verification Algorithm
An administrator or auditor can run `AuditLogChainer.verifyIntegrity(workspaceId)` at any time:
1. Re-computes $H_n'$ from the genesis block forward using recorded fields.
2. Checks $H_n' == \text{storedRecordHash}$.
3. If an attacker modifies even a single character in a past database record, all subsequent hashes become mathematically invalid, identifying the exact record that was altered.

---

## 7. SSRF Protection & Secret Redaction

### 7.1 Server-Side Request Forgery (SSRF) Guard
All outbound HTTP requests from connectors (`ctx.http.request()`) pass through `src/backend/ssrf-guard.ts`:
- Resolves DNS hostname to canonical IP before socket connection.
- Rejects targets in blocked IP ranges:
  - Loopback: `127.0.0.0/8`, `::1`
  - Link-Local: `169.254.0.0/16` (Blocks AWS/GCP instance metadata endpoint `169.254.169.254`)
  - Private Class A: `10.0.0.0/8`
  - Private Class B: `172.16.0.0/12`
  - Private Class C: `192.168.0.0/16`
- Blocks cloud-internal hostnames (`*.internal`, `*.local`, `metadata.google.internal`).

### 7.2 Automatic Secret Redaction Filter
Before persisting step outputs or streaming telemetry over SSE, payloads pass through `CredentialVault.redactSecrets()`:
- **Bearer Tokens**: `Bearer [a-zA-Z0-9_\-\.]{15,}` $\to$ `Bearer [REDACTED]`
- **API Keys**: `(sk-[a-zA-Z0-9]{20,}|xoxb-[a-zA-Z0-9\-]+)` $\to$ `[REDACTED_API_KEY]`
- **Sensitive JSON Keys**: Any key matching `/password|secret|token|apiKey|authorization/i` has its string value replaced with `"[REDACTED]"`.
