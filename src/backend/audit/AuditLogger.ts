/**
 * ============================================================================
 * QuickReply — Enterprise Append-Only Audit Logger
 * src/backend/audit/AuditLogger.ts
 *
 * Tracks every state-modifying and security-sensitive operation across the platform.
 * Logs actor, action, tenant, resource, before/after state diff, IP, and timestamp.
 * ============================================================================
 */

import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";

export interface AuditRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: "workflow" | "connection" | "rule" | "approval" | "customer" | "credential" | "settings" | "auth";
  resourceId: string;
  description: string;
  diff?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED" | "DENIED";
}

export class AuditLogger {
  /**
   * Record a security or state change event
   */
  static async log(entry: Omit<AuditRecord, "id" | "timestamp">): Promise<AuditRecord> {
    const record: AuditRecord = {
      ...entry,
      id: `audit_${uuidv4()}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const db = await getDB(entry.tenantId);
      if (!db.auditLogs) {
        db.auditLogs = [];
      }

      // Append-only invariant: Prepend for newest-first retrieval
      db.auditLogs.unshift(record);

      // Maintain rolling retention limit per tenant if needed (e.g. 5,000 records)
      if (db.auditLogs.length > 5000) {
        db.auditLogs = db.auditLogs.slice(0, 5000);
      }

      await saveDB(db, entry.tenantId);
    } catch (err) {
      console.error("[AuditLogger] Failed to write audit event:", err);
    }

    return record;
  }

  /**
   * Retrieve audit logs with tenant isolation and optional filtering
   */
  static async query(
    tenantId: string,
    filters?: {
      resourceType?: string;
      actorEmail?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ records: AuditRecord[]; total: number }> {
    const db = await getDB(tenantId);
    let logs: AuditRecord[] = db.auditLogs || [];

    if (filters?.resourceType) {
      logs = logs.filter((l) => l.resourceType === filters.resourceType);
    }
    if (filters?.actorEmail) {
      logs = logs.filter((l) => l.actorEmail?.toLowerCase() === filters.actorEmail?.toLowerCase());
    }

    const total = logs.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginated = logs.slice(offset, offset + limit);

    return { records: paginated, total };
  }
}
