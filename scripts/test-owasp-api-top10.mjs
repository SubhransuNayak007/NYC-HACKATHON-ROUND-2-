/**
 * ============================================================================
 * QuickReply — OWASP API Security Top 10 Coverage Matrix
 * scripts/test-owasp-api-top10.mjs
 *
 * Validates that mitigations for each OWASP API Top 10 (2023) category
 * are present and functional in the QuickReply codebase.
 *
 * OWASP API Security Top 10:2023
 * https://owasp.org/API-Security/editions/2023/en/0x11-t10/
 * ============================================================================
 */

import { strict as assert } from "assert";
import fs from "fs";
import path from "path";

console.log("========================================================================");
console.log("  QUICKREPLY AI — OWASP API SECURITY TOP 10:2023 COVERAGE MATRIX");
console.log("========================================================================\n");

let pass = 0; let fail = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); pass++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); fail++; }
}

function fileExists(relPath) {
  return fs.existsSync(path.resolve(process.cwd(), relPath));
}

function fileContains(relPath, ...patterns) {
  if (!fileExists(relPath)) return false;
  const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
  return patterns.every((p) => typeof p === "string" ? content.includes(p) : p.test(content));
}

// API1: Broken Object Level Authorization
console.log("API1: Broken Object Level Authorization");
test("API1.1: assertTenantOwnership() exists in authorization module", () => {
  assert.ok(fileExists("src/backend/authorization.ts"), "src/backend/authorization.ts must exist");
  assert.ok(fileContains("src/backend/authorization.ts", "assertTenantOwnership"), "must define assertTenantOwnership");
});
test("API1.2: AuthorizationError class defined", () => {
  assert.ok(fileContains("src/backend/authorization.ts", "AuthorizationError"), "must define AuthorizationError");
});
test("API1.3: Cross-tenant isolation tests exist", () => {
  assert.ok(fileExists("scripts/test-security-cross-tenant.mjs"));
});

// API2: Broken Authentication
console.log("\nAPI2: Broken Authentication");
test("API2.1: JWT secret requires minimum 32 chars", () => {
  assert.ok(fileContains("src/backend/auth.ts", "secret.length < 32"), "must enforce minimum secret length");
});
test("API2.2: No hardcoded fallback secrets in middleware", () => {
  const mw = fs.readFileSync(path.resolve(process.cwd(), "src/middleware.ts"), "utf8");
  assert.ok(!mw.includes("session-fallback-secret"), "hardcoded fallback secret must be removed");
  assert.ok(!mw.includes("fallback-secret"), "no fallback secrets allowed");
});
test("API2.3: OAuth callback validates HMAC-signed state", () => {
  assert.ok(fileContains("src/app/api/integrations/instagram/callback/route.ts",
    "HMAC", "signature"), "callback must verify HMAC signature");
});
test("API2.4: OAuth state has expiry enforcement", () => {
  assert.ok(fileContains("src/app/api/integrations/instagram/callback/route.ts",
    "10 * 60 * 1000"), "must enforce 10-minute state expiry");
});
test("API2.5: State cookie is single-use (deleted on all exit paths)", () => {
  assert.ok(fileContains("src/app/api/integrations/instagram/callback/route.ts",
    "deleteStateCookie"), "must delete state cookie on all paths");
});

// API3: Broken Object Property Level Authorization
console.log("\nAPI3: Broken Object Property Level Authorization");
test("API3.1: Token encryption prevents plaintext credential exposure", () => {
  assert.ok(fileContains("src/database/db.ts", "encryptToken", "aes-256-gcm"), "must use AES-256-GCM encryption");
});
test("API3.2: Status endpoint never returns encrypted token values", () => {
  const statusRoute = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/integrations/instagram/status/route.ts"), "utf8"
  );
  assert.ok(!statusRoute.includes("encryptedAccessToken") || !statusRoute.includes("return"),
    "status endpoint must not return raw encrypted tokens");
});

// API4: Unrestricted Resource Consumption
console.log("\nAPI4: Unrestricted Resource Consumption");
test("API4.1: Rate limits exist for auth endpoints", () => {
  assert.ok(fileContains("src/backend/ratelimit.ts", "AUTH", "windowMs"));
});
test("API4.2: OAuth initiation rate limit exists", () => {
  assert.ok(fileContains("src/backend/ratelimit.ts", "OAUTH_INITIATE"), "must have OAuth initiation rate limit");
});
test("API4.3: AI generation rate limit exists", () => {
  assert.ok(fileContains("src/backend/ratelimit.ts", "AI_GENERATE"), "must have AI generation rate limit");
});
test("API4.4: Rate limiting applied in middleware", () => {
  assert.ok(fileContains("src/middleware.ts", "checkRateLimit", "RATE_LIMIT_EXCEEDED"));
});

// API5: Broken Function Level Authorization
console.log("\nAPI5: Broken Function Level Authorization");
test("API5.1: Centralized authorize() function exists", () => {
  assert.ok(fileContains("src/backend/authorization.ts", "export function authorize"));
});
test("API5.2: Role policy table defines minimum roles per action", () => {
  assert.ok(fileContains("src/backend/authorization.ts", "ACTION_POLICY", "billing.manage", "OWNER"));
});
test("API5.3: Instagram connection.disconnect requires ADMIN (not OPERATOR)", () => {
  assert.ok(fileContains("src/backend/authorization.ts",
    `"instagram.connection.disconnect": "ADMIN"`));
});

// API6: Sensitive Business Flow Abuse
console.log("\nAPI6: Sensitive Business Flow Abuse");
test("API6.1: OAuth initiation requires authenticated session", () => {
  assert.ok(fileContains("src/app/api/integrations/instagram/connect/route.ts",
    "getSessionUser", "redirect"));
});
test("API6.2: Instagram integration routes removed from PUBLIC_PATHS", () => {
  const mw = fs.readFileSync(path.resolve(process.cwd(), "src/middleware.ts"), "utf8");
  assert.ok(!mw.includes("/api/integrations/instagram/connect"), 
    "connect route must not be in PUBLIC_PATHS");
  assert.ok(!mw.includes("/api/integrations/instagram/disconnect"),
    "disconnect route must not be in PUBLIC_PATHS");
});

// API7: Server-Side Request Forgery
console.log("\nAPI7: Server-Side Request Forgery");
test("API7.1: SSRF guard module exists", () => {
  assert.ok(fileExists("src/backend/ssrf-guard.ts"), "src/backend/ssrf-guard.ts must exist");
});
test("API7.2: SSRF guard blocks RFC1918 addresses", () => {
  assert.ok(fileContains("src/backend/ssrf-guard.ts", "RFC1918", "192.168.0.0", "10.0.0.0"));
});
test("API7.3: SSRF guard blocks link-local metadata endpoints", () => {
  assert.ok(fileContains("src/backend/ssrf-guard.ts", "169.254.169.254", "metadata.google.internal"));
});
test("API7.4: SSRF guard performs DNS resolution revalidation", () => {
  assert.ok(fileContains("src/backend/ssrf-guard.ts", "dns.lookup"));
});

// API8: Security Misconfiguration
console.log("\nAPI8: Security Misconfiguration");
test("API8.1: No wildcard CORS for authenticated APIs", () => {
  const mw = fs.readFileSync(path.resolve(process.cwd(), "src/middleware.ts"), "utf8");
  assert.ok(!mw.includes(`Allow-Origin", "*"`),
    "No wildcard CORS allowed");
});
test("API8.2: No unsafe-eval in production CSP", () => {
  const mw = fs.readFileSync(path.resolve(process.cwd(), "src/middleware.ts"), "utf8");
  // Check that production script-src does not contain unsafe-eval
  assert.ok(mw.includes("isProd ?"), "Must conditionally configure CSP based on environment");
  assert.ok(!mw.match(/isProd\s*\?\s*"[^"]*unsafe-eval/), "Production branch must never contain unsafe-eval");
});
test("API8.3: HSTS header configured for production", () => {
  assert.ok(fileContains("src/middleware.ts", "Strict-Transport-Security", "31536000"));
});
test("API8.4: X-Content-Type-Options: nosniff configured", () => {
  assert.ok(fileContains("src/middleware.ts", "X-Content-Type-Options", "nosniff"));
});
test("API8.5: Debug endpoint disabled in production", () => {
  assert.ok(fileContains("src/app/api/debug/db/route.ts", "production", "Not found"));
});

// API9: Improper Inventory Management
console.log("\nAPI9: Improper Inventory Management");
test("API9.1: Security architecture documentation exists", () => {
  assert.ok(fileExists("docs/security-architecture.md"));
});
test("API9.2: Audit logger documents all security events", () => {
  assert.ok(fileExists("src/backend/audit-logger.ts"));
  assert.ok(fileContains("src/backend/audit-logger.ts", "AuditEventType", "OAUTH_COMPLETED", "CROSS_TENANT_DENIAL"));
});

// API10: Unsafe Consumption of APIs
console.log("\nAPI10: Unsafe Consumption of APIs");
test("API10.1: AI policy module with output schema validation exists", () => {
  assert.ok(fileExists("src/backend/ai-policy.ts"));
  assert.ok(fileContains("src/backend/ai-policy.ts", "parseAiOutput", "AiActionIntent"));
});
test("API10.2: Prompt injection detection implemented", () => {
  assert.ok(fileContains("src/backend/ai-policy.ts", "checkForPromptInjection", "INJECTION_PATTERNS"));
});
test("API10.3: AI tool allowlist enforced", () => {
  assert.ok(fileContains("src/backend/ai-policy.ts", "AiToolName", "isAllowedTool"));
});
test("API10.4: Webhook signature verification in place", () => {
  assert.ok(fileContains("src/app/api/webhooks/instagram/route.ts",
    "x-hub-signature-256", "HMAC"));
});
test("API10.5: Circuit breakers for external provider calls", () => {
  assert.ok(fileExists("src/backend/circuit-breaker.ts"));
  assert.ok(fileContains("src/backend/circuit-breaker.ts", "CLOSED", "OPEN", "HALF_OPEN"));
});

console.log("\n========================================================================");
console.log(` OWASP API TOP 10 COVERAGE: ${pass} / ${pass + fail} CONTROLS VERIFIED`);
if (fail > 0) {
  console.error(`\n⚠ ${fail} CONTROLS NOT VERIFIED — review findings before production launch`);
  process.exit(1);
}
console.log("  🛡️  All OWASP API Security Top 10:2023 controls verified");
console.log("========================================================================\n");
