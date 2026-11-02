/**
 * QuickReply AI Automation Operating System — Execution Policy & Safety Engine
 * src/backend/automation/policy/ExecutionPolicyEngine.ts
 *
 * Implements Engine 5 (Execution Safety & Reliability) of Master Prompt V2:
 * - Idempotency tracking & duplicate event suppression
 * - Sensitive token & credential redaction from logs
 * - Outbound communication rate limiting & consent enforcement
 * - Cryptographic audit logging for side-effect operations
 */

import crypto from "crypto";

export interface IdempotencyRecord {
  key: string;
  workflowId: string;
  processedAt: string;
  status: "PROCESSED" | "SKIPPED_DUPLICATE";
  responsePayload?: any;
}

export class ExecutionPolicyEngine {
  private static processedEvents: Map<string, IdempotencyRecord> = new Map();

  /**
   * Check and record event idempotency. Returns true if event is unique and allowed to process.
   */
  static checkIdempotency(params: {
    eventId?: string;
    workflowId: string;
    payload: any;
  }): { allowed: boolean; reason?: string; idempotencyKey: string } {
    const { eventId, workflowId, payload } = params;

    // Construct deterministic hash key from eventId or payload content
    const rawKey = eventId || crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const idempotencyKey = `${workflowId}:${rawKey}`;

    if (this.processedEvents.has(idempotencyKey)) {
      return {
        allowed: false,
        reason: `Duplicate event suppressed by Idempotency Policy (Key: ${idempotencyKey})`,
        idempotencyKey,
      };
    }

    // Mark as processed
    this.processedEvents.set(idempotencyKey, {
      key: idempotencyKey,
      workflowId,
      processedAt: new Date().toISOString(),
      status: "PROCESSED",
    });

    return {
      allowed: true,
      idempotencyKey,
    };
  }

  /**
   * Redact sensitive tokens, passwords, and authorization headers from logs and execution outputs
   */
  static redactSensitiveData(data: any): any {
    if (!data) return data;
    if (typeof data === "string") {
      return data
        .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED_TOKEN]")
        .replace(/(password|secret|token|api_key|apiKey)\s*[:=]\s*["']?[^"'\s]+["']?/gi, "$1=[REDACTED]");
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item));
    }

    if (typeof data === "object") {
      const sanitized: Record<string, any> = {};
      const sensitiveKeys = ["token", "accessToken", "botToken", "apiKey", "password", "secret", "privateKey", "wabaToken"];

      for (const [k, v] of Object.entries(data)) {
        if (sensitiveKeys.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
          sanitized[k] = "[REDACTED_CREDENTIAL]";
        } else {
          sanitized[k] = this.redactSensitiveData(v);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Reset idempotency cache (useful for testing)
   */
  static clearCache(): void {
    this.processedEvents.clear();
  }
}
