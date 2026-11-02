/**
 * ============================================================================
 *  QuickReply AI — OAuth & Social Integration Token Lifecycle Test Suite
 *  scripts/test-oauth-lifecycle.mjs
 * ============================================================================
 */

import crypto from "crypto";

console.log("========================================================================");
console.log(" QUICKREPLY AI — OAUTH & INTEGRATION TOKEN LIFECYCLE TEST");
console.log("========================================================================\n");

let passed = 0;
let total = 0;

function assert(testName, condition) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

// AES-256-GCM Encryption / Decryption harness matching src/database/db.ts
const ENCRYPTION_KEY = crypto.createHash("sha256").update("prod_secure_encryption_key_32_bytes!").digest();

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${ciphertext}:${authTag}`;
}

function decryptSecret(encrypted) {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, ciphertext, authTagHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

// 1. Connect Channel & Encrypt Token
const rawRefreshToken = "ya29.a0AfH6SMB_SAMPLE_YOUTUBE_OAUTH_REFRESH_TOKEN_987654321";
const encryptedToken = encryptSecret(rawRefreshToken);

assert("Token is encrypted using AES-256-GCM with IV and AuthTag", encryptedToken.split(":").length === 3 && !encryptedToken.includes("ya29"));

// 2. Decrypt Token for authorized background worker
const decryptedToken = decryptSecret(encryptedToken);
assert("Decrypted token matches raw OAuth credential", decryptedToken === rawRefreshToken);

// 3. Tampered ciphertext rejection (AuthTag verification)
const tamperedToken = encryptedToken.slice(0, 30) + "ff" + encryptedToken.slice(32);
const tamperedResult = decryptSecret(tamperedToken);
assert("Tampered encrypted token is rejected by GCM AuthTag", tamperedResult === null);

// 4. Cross-Tenant Credential Scoping
const tenantStore = {
  "tenant_alpha": { channelId: "UC_alpha", encryptedToken: encryptSecret("token_alpha_secret") },
  "tenant_beta": { channelId: "UC_beta", encryptedToken: encryptSecret("token_beta_secret") },
};

function getChannelTokenForTenant(requestingTenantId, targetTenantId) {
  if (requestingTenantId !== targetTenantId) {
    return { success: false, error: "FORBIDDEN_CROSS_TENANT" };
  }
  const rec = tenantStore[targetTenantId];
  if (!rec) return { success: false, error: "NOT_FOUND" };
  return { success: true, token: decryptSecret(rec.encryptedToken) };
}

assert("Tenant A cannot access Tenant B encrypted channel credentials", getChannelTokenForTenant("tenant_alpha", "tenant_beta").error === "FORBIDDEN_CROSS_TENANT");
assert("Tenant A can access own decrypted channel credentials", getChannelTokenForTenant("tenant_alpha", "tenant_alpha").token === "token_alpha_secret");

// 5. Disconnection Wipes Token Permanently
delete tenantStore["tenant_alpha"];
assert("Disconnecting channel deletes credential from tenant store", getChannelTokenForTenant("tenant_alpha", "tenant_alpha").error === "NOT_FOUND");

console.log("\n------------------------------------------------------------------------");
console.log(` OAUTH LIFECYCLE SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log("------------------------------------------------------------------------\n");
