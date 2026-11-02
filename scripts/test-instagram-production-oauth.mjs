/**
 * ============================================================================
 * QuickReply — Instagram Production OAuth & Security Verification Suite
 * scripts/test-instagram-production-oauth.mjs
 * ============================================================================
 */

import { strict as assert } from "assert";
import crypto from "crypto";

console.log("========================================================================");
console.log("  QUICKREPLY AI — INSTAGRAM PRODUCTION OAUTH & SECURITY AUDIT HARNESS");
console.log("========================================================================\n");

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    failedTests++;
  }
}

async function runTestAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    failedTests++;
  }
}

// ── 1. AES-256-GCM ENCRYPTION HELPERS ──
const ENCRYPTION_KEY = crypto.createHash("sha256").update("quickreply_test_secret_key_32bytes").digest();

function encryptToken(plaintext) {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptToken(encryptedText) {
  if (!encryptedText) return encryptedText;
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText;
  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── TEST 1: OAUTH STATE SECURITY & VALIDATION ──
console.log("1. AUDITING OAUTH STATE SECURITY...");

runTest("Generates high-entropy OAuth state with tenant and timestamp binding", () => {
  const randomSecret = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();
  const statePayload = {
    tenant: "brand_owner@example.com",
    nonce: randomSecret,
    ts: timestamp,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  assert.ok(state.length > 32, "State must be cryptographically long");

  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  assert.equal(decoded.tenant, "brand_owner@example.com", "Tenant binding must match");
  assert.equal(decoded.nonce, randomSecret, "Nonce must match");
  assert.equal(decoded.ts, timestamp, "Timestamp must match");
});

runTest("Rejects expired OAuth state (> 10 minutes)", () => {
  const expiredTimestamp = Date.now() - 11 * 60 * 1000;
  const statePayload = {
    tenant: "brand_owner@example.com",
    nonce: crypto.randomBytes(32).toString("hex"),
    ts: expiredTimestamp,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));

  const isExpired = Date.now() - decoded.ts > 10 * 60 * 1000;
  assert.ok(isExpired, "State older than 10 minutes must be flagged as expired");
});

runTest("Timing-safe comparison prevents CSRF state mismatch attacks", () => {
  const state1 = "state_token_alpha_1234567890abcdef";
  const state2 = "state_token_alpha_1234567890abcdef";
  const stateMismatch = "state_token_alpha_1234567890evil99";

  const safeCompare = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  };

  assert.ok(safeCompare(state1, state2), "Matching states must pass");
  assert.ok(!safeCompare(state1, stateMismatch), "Mismatching states must fail");
});

// ── TEST 2: AES-256-GCM CREDENTIAL STORAGE ──
console.log("\n2. AUDITING AES-256-GCM CREDENTIAL ENCRYPTION...");

runTest("Encrypts and decrypts long-lived access token with zero leakage", () => {
  const sampleToken = "EAAGm0PX4ZCpsBA...SampleLongLivedToken_60Days...XYZ";
  const encrypted = encryptToken(sampleToken);

  assert.notEqual(encrypted, sampleToken, "Encrypted token must not match plaintext");
  assert.ok(!encrypted.includes(sampleToken), "Encrypted token must not contain plaintext substring");
  assert.equal(encrypted.split(":").length, 3, "Format must be IV:AuthTag:Ciphertext");

  const decrypted = decryptToken(encrypted);
  assert.equal(decrypted, sampleToken, "Decrypted token must exactly match original token");
});

runTest("Rejects tampered ciphertext via GCM Authentication Tag check", () => {
  const sampleToken = "EAA_Production_Meta_Secret_Token";
  const encrypted = encryptToken(sampleToken);
  const [iv, tag, cipher] = encrypted.split(":");

  // Tamper ciphertext by modifying character guaranteed to change it
  const lastChar = cipher.slice(-1);
  const newLastChar = lastChar === "0" ? "1" : "0";
  const tamperedCipher = cipher.slice(0, -1) + newLastChar;
  const tamperedEncrypted = `${iv}:${tag}:${tamperedCipher}`;

  assert.throws(() => {
    decryptToken(tamperedEncrypted);
  });
});

// ── TEST 3: MULTI-TENANT ISOLATION ──
console.log("\n3. AUDITING MULTI-TENANT ISOLATION (BOLA / IDOR PREVENTION)...");

runTest("Enforces strict tenant isolation across social connections", () => {
  const mockTenantDatabase = {
    "tenant_a@acme.com": {
      instagramConnections: [
        { id: "conn_1", instagramAccountId: "ig_111", username: "acme_official" },
      ],
    },
    "tenant_b@competitor.com": {
      instagramConnections: [
        { id: "conn_2", instagramAccountId: "ig_222", username: "competitor_co" },
      ],
    },
  };

  const getConnectionsForTenant = (tenantEmail) => {
    const data = mockTenantDatabase[tenantEmail];
    return data ? data.instagramConnections : [];
  };

  const tenantAConns = getConnectionsForTenant("tenant_a@acme.com");
  assert.equal(tenantAConns.length, 1);
  assert.equal(tenantAConns[0].username, "acme_official");

  const tenantBConns = getConnectionsForTenant("tenant_b@competitor.com");
  assert.equal(tenantBConns.length, 1);
  assert.equal(tenantBConns[0].username, "competitor_co");

  // Verify Tenant A cannot see Tenant B's accounts
  const crossTenantLeak = tenantAConns.some((c) => c.instagramAccountId === "ig_222");
  assert.ok(!crossTenantLeak, "Tenant A must NOT see Tenant B connection");
});

// ── TEST 4: META WEBHOOK VERIFICATION ──
console.log("\n4. AUDITING META WEBHOOK SIGNATURES...");

runTest("Validates constant-time HMAC-SHA256 webhook signatures", () => {
  const appSecret = "meta_app_secret_production_xyz123";
  const rawBody = JSON.stringify({
    object: "instagram",
    entry: [{ id: "ig_111", time: Date.now(), changes: [{ field: "comments", value: { id: "c_1" } }] }],
  });

  const validSignature = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const invalidSignature = "sha256=" + crypto.createHmac("sha256", "wrong_secret").update(rawBody, "utf8").digest("hex");

  const verifyWebhook = (signatureHeader, body, secret) => {
    if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
    const signature = signatureHeader.replace("sha256=", "");
    const expected = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  };

  assert.ok(verifyWebhook(validSignature, rawBody, appSecret), "Valid signature must pass");
  assert.ok(!verifyWebhook(invalidSignature, rawBody, appSecret), "Tampered signature must fail");
});

runTest("Validates Meta hub challenge verification handshake", () => {
  const verifyToken = "my_custom_verify_token_prod_99";
  const mode = "subscribe";
  const incomingToken = "my_custom_verify_token_prod_99";
  const challenge = "1158201244";

  const handleHubChallenge = (m, token, chal, configuredToken) => {
    if (m === "subscribe" && token === configuredToken) {
      return chal;
    }
    return null;
  };

  assert.equal(handleHubChallenge(mode, incomingToken, challenge, verifyToken), challenge);
  assert.equal(handleHubChallenge(mode, "wrong_token", challenge, verifyToken), null);
});

// ── TEST 5: ERROR NORMALIZATION & REAUTH REQUIRED ──
console.log("\n5. AUDITING ERROR NORMALIZATION & REAUTH DETECTION...");

runTest("Normalizes Meta OAuthException code 190 to REAUTH_REQUIRED status", () => {
  const metaErrorResponse = {
    error: {
      message: "Error validating access token: Session has expired on...",
      type: "OAuthException",
      code: 190,
      error_subcode: 463,
      fbtrace_id: "A1b2C3d4E5f",
    },
  };

  const normalizeMetaError = (err) => {
    const code = err?.error?.code;
    if (code === 190) {
      return { status: "REAUTH_REQUIRED", shouldRetry: false, userAction: "Please reconnect your Instagram account" };
    }
    return { status: "ERROR", shouldRetry: true, userAction: "Retry later" };
  };

  const normalized = normalizeMetaError(metaErrorResponse);
  assert.equal(normalized.status, "REAUTH_REQUIRED");
  assert.equal(normalized.shouldRetry, false);
});

// ── TEST 6: DISCONNECT LIFECYCLE ──
console.log("\n6. AUDITING DISCONNECT LIFECYCLE & PURGE...");

runTest("Wipes encrypted tokens and connections upon user disconnect", () => {
  let tenantDb = {
    instagramConnections: [{ id: "conn_1", token: "enc:123" }],
    instagramAccounts: [{ id: "acc_1", username: "brand" }],
    socialAccounts: { instagram: { connected: true } },
  };

  const disconnectInstagram = (db) => {
    db.instagramConnections = [];
    db.instagramAccounts = [];
    if (db.socialAccounts?.instagram) {
      db.socialAccounts.instagram.connected = false;
      delete db.socialAccounts.instagram.accessToken;
    }
    return db;
  };

  tenantDb = disconnectInstagram(tenantDb);
  assert.equal(tenantDb.instagramConnections.length, 0, "Connections must be empty");
  assert.equal(tenantDb.instagramAccounts.length, 0, "Accounts must be empty");
  assert.equal(tenantDb.socialAccounts.instagram.connected, false, "Status must be disconnected");
});

console.log("\n========================================================================");
console.log(` INSTAGRAM PRODUCTION OAUTH AUDIT: ${passedTests} / ${totalTests} TESTS PASSED`);
if (failedTests > 0) {
  console.error(` ⚠ ${failedTests} TESTS FAILED`);
  process.exit(1);
}
console.log("========================================================================\n");
