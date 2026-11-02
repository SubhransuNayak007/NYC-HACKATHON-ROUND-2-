/**
 * ============================================================
 *  QuickReply Autonomous OS — Reliability Engine & Self-Healing
 *  src/backend/reliability/ReliabilityEngine.ts
 *
 *  Makes sure the system keeps working 24/7:
 *  - Circuit Breakers per provider
 *  - Dead Letter Queue (DLQ) with deterministic replay
 *  - Connection Watchdog & Automatic Reconnect
 *  - Zero-Loss event tracking
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import { CircuitBreaker } from "./CircuitBreaker";
import { type BusinessEvent, DurableEventBus } from "../events/EventBus";
import { getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";

export interface DLQEntry {
  id: string;
  originalEvent: BusinessEvent;
  error: string;
  failedAt: string;
  retryCount: number;
  resolved: boolean;
}

export class ReliabilityEngine {
  private static instance: ReliabilityEngine;

  // Circuit Breakers Registry
  private circuitBreakers: Record<string, CircuitBreaker> = {
    whatsapp: new CircuitBreaker("whatsapp", { failureThreshold: 5, resetTimeoutMs: 30000 }),
    instagram: new CircuitBreaker("instagram", { failureThreshold: 5, resetTimeoutMs: 30000 }),
    linkedin: new CircuitBreaker("linkedin", { failureThreshold: 5, resetTimeoutMs: 30000 }),
    ai_provider: new CircuitBreaker("ai_provider", { failureThreshold: 3, resetTimeoutMs: 15000 }),
    database: new CircuitBreaker("database", { failureThreshold: 3, resetTimeoutMs: 10000 }),
  };

  // Dead Letter Queue
  private dlq: Map<string, DLQEntry> = new Map();

  private isWatchdogRunning = false;

  private constructor() {
    this.startWatchdog();
  }

  static getInstance(): ReliabilityEngine {
    if (!this.instance) {
      this.instance = new ReliabilityEngine();
    }
    return this.instance;
  }

  /**
   * Execute an operation guarded by a named Circuit Breaker
   */
  async executeWithCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const cb = this.circuitBreakers[circuitName] || this.circuitBreakers.database;
    return cb.execute(operation);
  }

  /**
   * Records a failed event into the Dead Letter Queue
   */
  moveToDLQ(event: BusinessEvent, error: string): void {
    const id = `dlq_${uuidv4()}`;
    const entry: DLQEntry = {
      id,
      originalEvent: event,
      error,
      failedAt: new Date().toISOString(),
      retryCount: 0,
      resolved: false,
    };
    this.dlq.set(id, entry);
    console.error(`🚨 [ReliabilityEngine] Event moved to DLQ: [${id}] - Error: ${error}`);
  }

  /**
   * Replays an event from the DLQ after remediation
   */
  async replayDLQ(dlqId: string): Promise<{ success: boolean; error?: string }> {
    const entry = this.dlq.get(dlqId);
    if (!entry) {
      return { success: false, error: "DLQ entry not found." };
    }

    const bus = DurableEventBus.getInstance();
    await bus.publish(
      entry.originalEvent.topic,
      entry.originalEvent.payload,
      {
        organizationId: entry.originalEvent.organizationId,
        priority: entry.originalEvent.priority,
        source: entry.originalEvent.source,
        provider: entry.originalEvent.provider,
      }
    );

    entry.resolved = true;
    return { success: true };
  }

  /**
   * Returns all active DLQ items
   */
  getDLQ(): DLQEntry[] {
    return Array.from(this.dlq.values()).filter((e) => !e.resolved);
  }

  /**
   * Continuous Watchdog: Monitors channel sessions and performs self-healing reconnects
   */
  private startWatchdog(): void {
    if (this.isWatchdogRunning) return;
    this.isWatchdogRunning = true;

    setInterval(async () => {
      try {
        await this.checkWhatsAppHealth();
      } catch (err) {
        console.error("[Reliability Watchdog] Error in watchdog tick:", err);
      }
    }, 30000); // 30s heartbeat
  }

  /**
   * Self-healing WhatsApp check: detects session issues and recovers
   */
  private async checkWhatsAppHealth(): Promise<void> {
    const wa = getWhatsAppProvider();
    const status = wa.getStatus();

    // If configured and state is errored, trigger graceful reconnect
    if (status.status === "error") {
      console.log("[Reliability Watchdog] 🔄 WhatsApp session error detected. Triggering self-healing reconnect...");
      await wa.connect().catch((e) => console.warn("[Reliability Watchdog] Reconnect attempt error:", e));
    }
  }

  /**
   * Returns complete reliability diagnostics
   */
  getDiagnostics() {
    return {
      circuitBreakers: Object.values(this.circuitBreakers).map((cb) => cb.getState()),
      dlqDepth: this.getDLQ().length,
      timestamp: new Date().toISOString(),
    };
  }
}
