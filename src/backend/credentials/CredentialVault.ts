/**
 * QuickReply Secure Credential Vault
 * src/backend/credentials/CredentialVault.ts
 *
 * Implements:
 * 1. AES-256-GCM authenticated encryption at rest (96-bit IV, 128-bit auth tag)
 * 2. Opaque credential references (cred_<uuidv4>)
 * 3. Strict per-workspace isolation (tenantId + workspaceId)
 * 4. Automatic secret redaction for logs, error messages, and telemetry
 * 5. In-memory decryption strictly for execution runtime
 */

import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";

export type CredentialAuthType = "oauth2" | "api_key" | "webhook_secret" | "basic" | "custom";

export interface StoredCredentialRecord {
  id: string; // cred_<uuid>
  tenantId: string;
  workspaceId: string;
  appId: string; // e.g. "google_sheets", "gmail", "slack", "hubspot", "canva", "openai", "anthropic"
  authType: CredentialAuthType;
  accountLabel: string;
  encryptedSecret: string; // iv_hex:authTag_hex:ciphertext_hex
  scopes?: string[];
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt?: number; // epoch ms for OAuth access token
  createdAt: string;
  updatedAt: string;
}

export interface SanitizedCredentialReference {
  id: string;
  appId: string;
  accountLabel: string;
  authType: CredentialAuthType;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  scopes?: string[];
  expiresAt?: number;
  createdAt: string;
}

export interface StoreCredentialParams {
  tenantId: string;
  workspaceId: string;
  appId: string;
  authType: CredentialAuthType;
  accountLabel: string;
  secretPayload: Record<string, any>;
  scopes?: string[];
  expiresAt?: number;
}

export class CredentialVault {
  // In-memory memory-store fallback to ensure resilience across hermetic tests
  private static memoryStore: Map<string, StoredCredentialRecord> = new Map();

  /**
   * Derive or load the 256-bit AES encryption key.
   */
  public static getEncryptionKey(): Buffer {
    const envKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (envKey && envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    const seed =
      process.env.TOKEN_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      process.env.SESSION_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.APP_SECRET ||
      "quickreply_production_vault_master_seed_2026";

    return crypto.createHash("sha256").update(seed).digest();
  }

  /**
   * Encrypt arbitrary string or JSON using AES-256-GCM.
   * Output format: `iv_hex:authTag_hex:ciphertext_hex`
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext) return "";
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypt AES-256-GCM ciphertext payload.
   */
  public static decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) return "";
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format. Expected iv_hex:authTag_hex:ciphertext_hex");
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Store a credential securely and return its opaque identifier (`cred_<uuid>`).
   */
  public static async storeCredential(params: StoreCredentialParams): Promise<{ id: string; credentialId: string }> {
    const credId = `cred_${uuidv4()}`;
    const encryptedSecret = this.encrypt(JSON.stringify(params.secretPayload));

    const record: StoredCredentialRecord = {
      id: credId,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      appId: params.appId,
      authType: params.authType,
      accountLabel: params.accountLabel,
      encryptedSecret,
      scopes: params.scopes || [],
      status: "ACTIVE",
      expiresAt: params.expiresAt || params.secretPayload?.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Store in memory map
    const key = `${params.tenantId}:${params.workspaceId}:${credId}`;
    this.memoryStore.set(key, record);
    this.memoryStore.set(credId, record);

    // 2. Persist to storage backend if available
    try {
      const dbModule = await this.tryGetDB();
      if (dbModule) {
        const db = await dbModule.getDB(params.tenantId);
        if (!db.credentialsVault) db.credentialsVault = [];
        db.credentialsVault.push(record);
        await dbModule.saveDB(db, params.tenantId);
      }
    } catch {
      // Storage backend optional in standalone unit tests
    }

    return { id: credId, credentialId: credId };
  }

  /**
   * Decrypt and resolve credential secret for node execution runtime.
   * Strict per-workspace isolation: verifies both tenantId and workspaceId.
   */
  public static async resolveSecretForRuntime(
    tenantId: string,
    workspaceId: string,
    credId: string
  ): Promise<Record<string, any> | null> {
    const record = await this.findCredentialRecord(tenantId, workspaceId, credId);
    if (!record || record.status !== "ACTIVE") {
      return null;
    }

    try {
      const decryptedJson = this.decrypt(record.encryptedSecret);
      return JSON.parse(decryptedJson);
    } catch (err: any) {
      console.error(`[CredentialVault] Failed to decrypt credential ${credId}:`, err?.message);
      return null;
    }
  }

  /**
   * Update the secret payload of an existing credential (e.g. after OAuth token refresh).
   */
  public static async updateCredentialSecret(
    tenantId: string,
    workspaceId: string,
    credId: string,
    updatedSecretPayload: Record<string, any>,
    newExpiresAt?: number
  ): Promise<boolean> {
    const record = await this.findCredentialRecord(tenantId, workspaceId, credId);
    if (!record) return false;

    const newEncrypted = this.encrypt(JSON.stringify(updatedSecretPayload));
    record.encryptedSecret = newEncrypted;
    record.updatedAt = new Date().toISOString();
    if (newExpiresAt !== undefined) {
      record.expiresAt = newExpiresAt;
    } else if (updatedSecretPayload.expiresAt) {
      record.expiresAt = updatedSecretPayload.expiresAt;
    }

    const key = `${tenantId}:${workspaceId}:${credId}`;
    this.memoryStore.set(key, record);
    this.memoryStore.set(credId, record);

    try {
      const dbModule = await this.tryGetDB();
      if (dbModule) {
        const db = await dbModule.getDB(tenantId);
        if (db.credentialsVault) {
          const idx = db.credentialsVault.findIndex((c: any) => c.id === credId);
          if (idx !== -1) {
            db.credentialsVault[idx] = record;
            await dbModule.saveDB(db, tenantId);
          }
        }
      }
    } catch {
      // Fallback
    }

    return true;
  }

  /**
   * Retrieve sanitized credential reference without exposing secret data.
   */
  public static async getCredentialMetadata(
    tenantId: string,
    workspaceId: string,
    credId: string
  ): Promise<SanitizedCredentialReference | null> {
    const record = await this.findCredentialRecord(tenantId, workspaceId, credId);
    if (!record) return null;

    return {
      id: record.id,
      appId: record.appId,
      accountLabel: record.accountLabel,
      authType: record.authType,
      status: record.status,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  /**
   * List all sanitized credentials for a specific tenant and workspace.
   */
  public static async listCredentials(tenantId: string, workspaceId: string): Promise<SanitizedCredentialReference[]> {
    const results: SanitizedCredentialReference[] = [];

    // Check DB
    try {
      const dbModule = await this.tryGetDB();
      if (dbModule) {
        const db = await dbModule.getDB(tenantId);
        const list: StoredCredentialRecord[] = db.credentialsVault || [];
        for (const item of list) {
          if (item.tenantId === tenantId && item.workspaceId === workspaceId) {
            results.push({
              id: item.id,
              appId: item.appId,
              accountLabel: item.accountLabel,
              authType: item.authType,
              status: item.status,
              scopes: item.scopes,
              expiresAt: item.expiresAt,
              createdAt: item.createdAt,
            });
          }
        }
      }
    } catch {
      // Fallback to memory store
    }

    // Merge memory store items if not already present
    this.memoryStore.forEach((record) => {
      if (
        record.tenantId === tenantId &&
        record.workspaceId === workspaceId &&
        !results.some((r) => r.id === record.id)
      ) {
        results.push({
          id: record.id,
          appId: record.appId,
          accountLabel: record.accountLabel,
          authType: record.authType,
          status: record.status,
          scopes: record.scopes,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt,
        });
      }
    });

    return results;
  }

  /**
   * Check if an active credential exists for an appId within the workspace.
   */
  public static async hasActiveCredential(tenantId: string, workspaceId: string, appId: string): Promise<boolean> {
    const list = await this.listCredentials(tenantId, workspaceId);
    return list.some((c) => c.appId === appId && c.status === "ACTIVE");
  }

  /**
   * Redact sensitive secrets from logs, strings, and stack traces.
   */
  public static redactSecrets(text: string): string {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/bearer\s+[a-zA-Z0-9_\-\.\~]+/gi, "Bearer [REDACTED]")
      .replace(/xoxb-[a-zA-Z0-9_\-]+/gi, "xoxb-[REDACTED]")
      .replace(/sk-[a-zA-Z0-9_\-]+/gi, "sk-[REDACTED]")
      .replace(/sk-ant-[a-zA-Z0-9_\-]+/gi, "sk-ant-[REDACTED]")
      .replace(/token=([^\s&"']+)/gi, "token=[REDACTED]")
      .replace(/api_?key=([^\s&"']+)/gi, "apiKey=[REDACTED]")
      .replace(/access_?token=([^\s&"']+)/gi, "accessToken=[REDACTED]")
      .replace(/refresh_?token=([^\s&"']+)/gi, "refreshToken=[REDACTED]")
      .replace(/client_?secret=([^\s&"']+)/gi, "clientSecret=[REDACTED]")
      .replace(/"(access_token|refreshToken|apiKey|clientSecret|secret|password)":\s*"[^"]+"/gi, '"$1": "[REDACTED]"');
  }

  /**
   * Recursively redact secrets within JSON serializable objects.
   */
  public static redactObject<T>(obj: T): T {
    if (!obj || typeof obj !== "object") {
      if (typeof obj === "string") {
        return this.redactSecrets(obj) as any;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as any;
    }

    const copy: Record<string, any> = {};
    const sensitiveKeys = new Set([
      "accesstoken",
      "access_token",
      "refreshtoken",
      "refresh_token",
      "apikey",
      "api_key",
      "clientsecret",
      "client_secret",
      "secret",
      "password",
      "authorization",
      "x-api-key",
      "token",
    ]);

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        copy[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        copy[key] = this.redactObject(value);
      } else if (typeof value === "string") {
        copy[key] = this.redactSecrets(value);
      } else {
        copy[key] = value;
      }
    }

    return copy as T;
  }

  /**
   * Helper to lookup credential record with workspace isolation.
   */
  private static async findCredentialRecord(
    tenantId: string,
    workspaceId: string,
    credId: string
  ): Promise<StoredCredentialRecord | null> {
    // 1. Check in-memory store
    const key = `${tenantId}:${workspaceId}:${credId}`;
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key)!;
    }

    // Check by credId with verification
    if (this.memoryStore.has(credId)) {
      const candidate = this.memoryStore.get(credId)!;
      if (candidate.tenantId === tenantId && candidate.workspaceId === workspaceId) {
        return candidate;
      }
    }

    // 2. Check storage DB
    try {
      const dbModule = await this.tryGetDB();
      if (dbModule) {
        const db = await dbModule.getDB(tenantId);
        const list: StoredCredentialRecord[] = db.credentialsVault || [];
        const record = list.find((c) => c.id === credId && c.tenantId === tenantId && c.workspaceId === workspaceId);
        if (record) {
          this.memoryStore.set(key, record);
          this.memoryStore.set(credId, record);
          return record;
        }
      }
    } catch {
      // Fallback
    }

    return null;
  }

  private static async tryGetDB(): Promise<any> {
    try {
      return await import("@/database/db");
    } catch {
      return null;
    }
  }
}
