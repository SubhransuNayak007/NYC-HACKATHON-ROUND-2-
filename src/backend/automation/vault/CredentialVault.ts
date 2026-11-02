/**
 * ============================================================================
 * QuickReply AI Automation Operating System — Secure Credential Vault
 * src/backend/automation/vault/CredentialVault.ts
 *
 * Provides:
 * 1. Opaque credential references (e.g. "cred_gmail_01")
 * 2. Zero-plaintext secret leakage to LLM prompts, frontend JS, or logs
 * 3. AES-256-GCM authenticated encryption at rest
 * 4. In-memory decryption restricted to execution runtime sandbox
 * ============================================================================
 */

import { v4 as uuidv4 } from "uuid";
import { encryptToken, decryptToken, getDB, saveDB } from "@/database/db";

export interface StoredCredential {
  id: string; // cred_<uuid>
  tenantId: string;
  workspaceId: string;
  appId: string; // e.g. "gmail", "google_sheets", "telegram"
  authType: "oauth2" | "api_key" | "webhook_secret";
  accountLabel: string;
  encryptedSecret: string; // AES-256-GCM
  scopes?: string[];
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: string;
  updatedAt: string;
}

export interface SanitizedCredentialReference {
  id: string;
  appId: string;
  accountLabel: string;
  authType: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  scopes?: string[];
  createdAt: string;
}

export class CredentialVault {
  /**
   * Store a third-party credential securely, returning an opaque reference ID
   */
  static async storeCredential(params: {
    tenantId: string;
    workspaceId: string;
    appId: string;
    authType: "oauth2" | "api_key" | "webhook_secret";
    accountLabel: string;
    secretPayload: Record<string, any>;
    scopes?: string[];
  }): Promise<string> {
    const credId = `cred_${uuidv4()}`;
    const encryptedSecret = encryptToken(JSON.stringify(params.secretPayload));

    const cred: StoredCredential = {
      id: credId,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      appId: params.appId,
      authType: params.authType,
      accountLabel: params.accountLabel,
      encryptedSecret,
      scopes: params.scopes || [],
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDB(params.tenantId);
    if (!db.credentialsVault) db.credentialsVault = [];
    db.credentialsVault.push(cred);
    await saveDB(db, params.tenantId);

    return credId;
  }

  /**
   * List sanitized credential references for a tenant (SAFE for client/LLM)
   */
  static async listCredentials(tenantId: string): Promise<SanitizedCredentialReference[]> {
    const db = await getDB(tenantId);
    const list: StoredCredential[] = db.credentialsVault || [];

    return list.map((c) => ({
      id: c.id,
      appId: c.appId,
      accountLabel: c.accountLabel,
      authType: c.authType,
      status: c.status,
      scopes: c.scopes,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Check if an active credential reference exists for an app
   */
  static async hasActiveCredential(tenantId: string, appId: string): Promise<boolean> {
    const db = await getDB(tenantId);
    const list: StoredCredential[] = db.credentialsVault || [];
    return list.some((c) => c.appId === appId && c.status === "ACTIVE");
  }

  /**
   * Resolve plaintext credential payload (STRICTLY RESTRICTED to runtime sandbox)
   * NEVER pass result to LLM prompts, client logs, or frontend responses.
   */
  static async resolveSecretForRuntime(tenantId: string, credId: string): Promise<Record<string, any> | null> {
    const db = await getDB(tenantId);
    const list: StoredCredential[] = db.credentialsVault || [];
    const record = list.find((c) => c.id === credId && c.tenantId === tenantId);

    if (!record || record.status !== "ACTIVE") {
      return null;
    }

    try {
      const decrypted = decryptToken(record.encryptedSecret);
      return JSON.parse(decrypted);
    } catch (err) {
      console.error(`[CredentialVault] Failed to decrypt credential ${credId}:`, err);
      return null;
    }
  }

  /**
   * Redact sensitive tokens and headers from execution logs
   */
  static redactSecrets(text: string): string {
    if (!text) return text;
    return text
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
      .replace(/token=[a-zA-Z0-9_\-\.]+/gi, "token=[REDACTED]")
      .replace(/key=[a-zA-Z0-9_\-\.]+/gi, "key=[REDACTED]")
      .replace(/"secret":\s*"[^"]+"/gi, '"secret": "[REDACTED]"')
      .replace(/"apiKey":\s*"[^"]+"/gi, '"apiKey": "[REDACTED]"');
  }
}
