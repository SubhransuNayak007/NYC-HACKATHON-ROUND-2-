/**
 * EventBus.ts
 * Structured Lifecycle Event Bus for Durable Execution Engine (Requirement R4).
 * Emits and buffers lifecycle events (queued, started, node transitions, completions, failures)
 * with automatic cryptographic secret redaction for real-time SSE canvas telemetry.
 */

import crypto from "node:crypto";
import { EventEmitter } from "node:events";

export type WorkflowLifecycleEventType =
  | "execution.queued"
  | "execution.started"
  | "node.started"
  | "node.completed"
  | "node.failed"
  | "node.retrying"
  | "execution.waiting_approval"
  | "execution.resumed"
  | "execution.completed"
  | "execution.failed"
  | "execution.paused"
  | "execution.cancelled";

export interface WorkflowLifecycleEvent {
  eventId: string;
  executionId: string;
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  eventType: WorkflowLifecycleEventType;
  nodeId?: string;
  nodeType?: string;
  timestamp: string;
  payload: Record<string, any>;
  durationMs?: number;
}

export type EventHandler = (event: WorkflowLifecycleEvent) => void;

/**
 * Secret redaction filter removing tokens, passwords, and authorization headers
 */
export function redactEventPayload(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") {
    if (typeof data === "string") {
      return data
        .replace(/Bearer\s+[A-Za-z0-9_\-\.]{15,}/gi, "Bearer [REDACTED]")
        .replace(/(sk-[A-Za-z0-9]{20,}|xoxb-[A-Za-z0-9\-]+)/g, "[REDACTED_API_KEY]");
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactEventPayload);
  }

  const result: Record<string, any> = {};
  const sensitiveRegex = /password|secret|token|apiKey|authorization|auth|clientSecret|privateKey/i;

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveRegex.test(key) && typeof value === "string") {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactEventPayload(value);
    }
  }

  return result;
}

export class ExecutionEventBus {
  private emitter = new EventEmitter();
  private history = new Map<string, WorkflowLifecycleEvent[]>();
  private readonly maxHistoryPerExecution = 500;

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  /**
   * Publish a lifecycle event with automatic timestamping, unique ID, and secret scrubbing.
   */
  public emitEvent(
    eventData: Omit<WorkflowLifecycleEvent, "eventId" | "timestamp">
  ): WorkflowLifecycleEvent {
    const fullEvent: WorkflowLifecycleEvent = {
      ...eventData,
      eventId: `evt_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      payload: redactEventPayload(eventData.payload || {}),
    };

    // Buffer in execution history
    const execHistory = this.history.get(fullEvent.executionId) || [];
    execHistory.push(fullEvent);
    if (execHistory.length > this.maxHistoryPerExecution) {
      execHistory.shift();
    }
    this.history.set(fullEvent.executionId, execHistory);

    // Emit event-specific and wildcard listeners
    this.emitter.emit(fullEvent.eventType, fullEvent);
    this.emitter.emit(`execution:${fullEvent.executionId}`, fullEvent);
    this.emitter.emit("*", fullEvent);

    return fullEvent;
  }

  /**
   * Subscribe to specific lifecycle event types or wildcard '*'
   */
  public subscribe(
    eventType: WorkflowLifecycleEventType | "*",
    handler: EventHandler
  ): () => void {
    this.emitter.on(eventType, handler);
    return () => this.emitter.off(eventType, handler);
  }

  /**
   * Subscribe to all events for a given execution ID (used by SSE streaming)
   */
  public subscribeExecution(executionId: string, handler: EventHandler): () => void {
    const channel = `execution:${executionId}`;
    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }

  /**
   * Retrieve cached event history for an execution (e.g. for replaying before live streaming)
   */
  public getHistory(executionId: string): WorkflowLifecycleEvent[] {
    return [...(this.history.get(executionId) || [])];
  }

  /**
   * Clear event history for garbage collection
   */
  public clearHistory(executionId: string): void {
    this.history.delete(executionId);
  }
}

// Global singleton instance for shared in-process coordination
export const globalEventBus = new ExecutionEventBus();
