/**
 * ============================================================================
 *  QuickReply — Centralized Audit Logger
 *  src/backend/audit-logger.ts
 *
 *  Purpose:
 *    Record all high-value security events in a structured, consistent
 *    format. Logs are append-only from normal application paths.
 *
 *  Events logged:
 *    OAuth flows, Instagram connect/disconnect, authorization denials,
 *    webhook verification failures, token failures, rate limit events.
 *
 *  NEVER logs:
 *    Access tokens, refresh tokens, passwords, secrets, OAuth codes,
 *    encryption keys, full cookie values.
 *
 *  Data Classification:
 *    audit_logger.ts output is INTERNAL/CONFIDENTIAL.
 *    Never send to analytics services that log to external clouds without
 *    data processing agreements.
 * ============================================================================
 */

export type AuditEventType =
  | "OAUTH_INITIATED"
  | "OAUTH_COMPLETED"
  | "OAUTH_FAILED"
  | "OAUTH_STATE_INVALID"
  | "OAUTH_STATE_EXPIRED"
  | "OAUTH_STATE_REPLAYED"
  | "INSTAGRAM_CONNECTED"
  | "INSTAGRAM_DISCONNECTED"
  | "INSTAGRAM_TOKEN_FAILURE"
  | "INSTAGRAM_REAUTH_REQUIRED"
  | "CROSS_TENANT_DENIAL"
  | "AUTHORIZATION_DENIED"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_DUPLICATE"
  | "CSRF_VIOLATION"
  | "RATE_LIMIT_HIT"
  | "SESSION_INVALID"
  | "SUSPICIOUS_REQUEST_BLOCKED"
  | "AI_OUTPUT_REJECTED"
  | "AI_PROMPT_INJECTION_DETECTED"
  | "CREDENTIAL_WIPE_COMPLETED"
  | "SECURITY_CONFIG_MISSING";

export interface AuditEvent {
  eventType: AuditEventType;
  requestId?: string;
  tenantId?: string; // email or orgId — NEVER the full credential
  resourceType?: string;
  resourceId?: string;
  action?: string;
  outcome: "SUCCESS" | "FAILURE" | "BLOCKED" | "DENIED";
  message: string;
  metadata?: Record<string, string | number | boolean>; // safe, non-sensitive
  timestamp: string;
}

// Patterns that must be redacted from any metadata before logging
const REDACT_PATTERNS = [
  /access.?token/i,
  /refresh.?token/i,
  /client.?secret/i,
  /api.?key/i,
  /password/i,
  /authorization/i,
  /session.?token/i,
  /cookie/i,
  /secret/i,
  /private.?key/i,
];

function redactMetadata(
  metadata: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const redacted: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const isSensitiveKey = REDACT_PATTERNS.some((p) => p.test(key));
    if (isSensitiveKey) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 200) {
      // Truncate very long strings to prevent log flooding
      redacted[key] = value.slice(0, 200) + "...[TRUNCATED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Log a security audit event.
 *
 * Usage:
 *   import { auditLog } from "@/backend/audit-logger";
 *   auditLog({
 *     eventType: "INSTAGRAM_CONNECTED",
 *     requestId,
 *     tenantId: user.email,
 *     resourceType: "instagram-connection",
 *     resourceId: connection.id,
 *     outcome: "SUCCESS",
 *     message: `Instagram account @${username} connected`,
 *   });
 */
export function auditLog(event: Omit<AuditEvent, "timestamp">): void {
  const safeMetadata = event.metadata ? redactMetadata(event.metadata) : undefined;

  const auditEntry: AuditEvent = {
    ...event,
    metadata: safeMetadata,
    timestamp: new Date().toISOString(),
  };

  // Output as structured JSON — picked up by log aggregation systems (Datadog, CloudWatch, etc.)
  console.log(JSON.stringify({ audit: auditEntry }));
}

/**
 * Log a security denial event and throw an error.
 * Convenience wrapper for authorization failures.
 */
export function auditDenial(
  requestId: string,
  tenantId: string,
  action: string,
  resourceId: string,
  reason: string
): void {
  auditLog({
    eventType: "AUTHORIZATION_DENIED",
    requestId,
    tenantId,
    action,
    resourceId,
    outcome: "DENIED",
    message: reason,
  });
}

/**
 * Log a cross-tenant access attempt — always a high-severity security event.
 */
export function auditCrossTenantDenial(
  requestId: string,
  requestingTenant: string,
  targetResourceType: string,
  targetResourceId: string
): void {
  auditLog({
    eventType: "CROSS_TENANT_DENIAL",
    requestId,
    tenantId: requestingTenant,
    resourceType: targetResourceType,
    resourceId: targetResourceId,
    outcome: "DENIED",
    message: `Cross-tenant access attempt: ${requestingTenant} attempted to access ${targetResourceType}/${targetResourceId}`,
    metadata: { severity: "HIGH" },
  });
}
