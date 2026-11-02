/**
 * ============================================================================
 * QuickReply — High-Throughput Idempotency & Deduplication Engine
 * src/backend/events/IdempotencyEngine.ts
 *
 * Prevents double execution of actions, duplicated webhooks, and retry collisions.
 * ============================================================================
 */

import { getDB, saveDB } from "@/database/db";

export interface IdempotencyRecord {
  key: string;
  tenantId: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  executionId?: string;
  result?: any;
  createdAt: string;
  expiresAt: string;
}

export class IdempotencyEngine {
  private static inMemoryLocks: Map<string, { timestamp: number; status: "LOCKED" | "COMPLETED" }> = new Map();

  /**
   * Acquire a lock or check if an event has already been processed
   */
  static async acquireLock(
    tenantId: string,
    key: string,
    ttlSeconds = 300
  ): Promise<{ acquired: boolean; status: "NEW" | "ALREADY_PROCESSED" | "IN_FLIGHT"; existingRecord?: IdempotencyRecord }> {
    const now = Date.now();

    // 1. In-Memory Fast Check (prevents concurrent microsecond collisions)
    const memLock = this.inMemoryLocks.get(key);
    if (memLock) {
      if (memLock.status === "LOCKED" && now - memLock.timestamp < ttlSeconds * 1000) {
        return { acquired: false, status: "IN_FLIGHT" };
      }
      if (memLock.status === "COMPLETED") {
        return { acquired: false, status: "ALREADY_PROCESSED" };
      }
    }

    // Set lock in memory
    this.inMemoryLocks.set(key, { timestamp: now, status: "LOCKED" });

    // 2. Database Record Verification
    try {
      const db = await getDB(tenantId);
      if (!db.idempotencyRecords) {
        db.idempotencyRecords = [];
      }

      const existing = db.idempotencyRecords.find((r: any) => r.key === key);
      if (existing) {
        if (existing.status === "PROCESSED") {
          this.inMemoryLocks.set(key, { timestamp: now, status: "COMPLETED" });
          return { acquired: false, status: "ALREADY_PROCESSED", existingRecord: existing };
        }
        if (existing.status === "PENDING") {
          const createdAt = new Date(existing.createdAt).getTime();
          if (now - createdAt < ttlSeconds * 1000) {
            return { acquired: false, status: "IN_FLIGHT", existingRecord: existing };
          }
        }
      }

      // Record lock in DB
      const record: IdempotencyRecord = {
        key,
        tenantId,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
      };

      db.idempotencyRecords = db.idempotencyRecords.filter((r: any) => r.key !== key);
      db.idempotencyRecords.push(record);
      await saveDB(db, tenantId);

      return { acquired: true, status: "NEW" };
    } catch (err) {
      console.warn("[IdempotencyEngine] Fallback to in-memory lock due to DB access error:", err);
      return { acquired: true, status: "NEW" };
    }
  }

  /**
   * Mark the idempotency record as successfully processed
   */
  static async complete(tenantId: string, key: string, executionId?: string, result?: any): Promise<void> {
    this.inMemoryLocks.set(key, { timestamp: Date.now(), status: "COMPLETED" });

    try {
      const db = await getDB(tenantId);
      if (!db.idempotencyRecords) db.idempotencyRecords = [];

      const record = db.idempotencyRecords.find((r: any) => r.key === key);
      if (record) {
        record.status = "PROCESSED";
        record.executionId = executionId;
        record.result = result;
      } else {
        db.idempotencyRecords.push({
          key,
          tenantId,
          status: "PROCESSED",
          executionId,
          result,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        });
      }
      await saveDB(db, tenantId);
    } catch (err) {
      console.error("[IdempotencyEngine] Failed to complete idempotency record:", err);
    }
  }

  /**
   * Release lock on failure
   */
  static async release(tenantId: string, key: string, error?: string): Promise<void> {
    this.inMemoryLocks.delete(key);
    try {
      const db = await getDB(tenantId);
      if (db.idempotencyRecords) {
        const record = db.idempotencyRecords.find((r: any) => r.key === key);
        if (record) {
          record.status = "FAILED";
          record.result = { error };
          await saveDB(db, tenantId);
        }
      }
    } catch (err) {
      console.error("[IdempotencyEngine] Failed to release idempotency lock:", err);
    }
  }
}
