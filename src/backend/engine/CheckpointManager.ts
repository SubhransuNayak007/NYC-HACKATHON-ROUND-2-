/**
 * CheckpointManager.ts
 * Atomic Checkpoint Persistence & State Coordinator (Requirement R4).
 * Commits execution checkpoints to persistent disk storage and in-memory caches after
 * every node transition (NODE_STARTED, NODE_COMPLETED, NODE_FAILED, NODE_SKIPPED)
 * to guarantee durability across server crashes, reboots, and redeployments.
 */

import fs from "node:fs";
import path from "node:path";

export type ExecutionStatus =
  | "QUEUED"
  | "STARTED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "WAITING_RETRY"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED";

export interface NodeRetryRecord {
  attemptCount: number;
  nextRetryAt: string;
  lastError: string;
}

export interface LoopContext {
  currentIndex: number;
  totalItems: number;
  currentItem: any;
  accumulator?: any;
}

export interface AccumulatedState {
  $json: Record<string, any>;
  $node: Record<string, { output: any }>;
  $env: Record<string, any>;
  $loop?: LoopContext;
}

export interface ExecutionCheckpoint {
  executionId: string;
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;

  // Frontier Tracking
  currentNodeId: string | null;
  completedNodeIds: string[];
  pendingNodeIds: string[];
  skippedNodeIds: string[];

  // Output and State Context
  nodeOutputs: Record<string, any>;
  accumulatedState: AccumulatedState;

  // Retry and Timing
  retryState: Record<string, NodeRetryRecord>;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface NodeTransitionOptions {
  nodeId: string;
  status: "NODE_STARTED" | "NODE_COMPLETED" | "NODE_FAILED" | "NODE_SKIPPED";
  output?: any;
  error?: string;
}

export class CheckpointManager {
  private inMemoryCheckpoints = new Map<string, ExecutionCheckpoint>();
  private storageDir: string;

  constructor(customStorageDir?: string) {
    if (customStorageDir) {
      this.storageDir = customStorageDir;
    } else {
      // Resolve path within project data
      const candidates = [
        path.resolve(process.cwd(), "src/data/checkpoints"),
        path.resolve(process.cwd(), "NYC-HACKATHON-ROUND-2-/src/data/checkpoints"),
      ];
      this.storageDir = candidates[0];
    }

    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {
      // Ignore if directory creation is handled elsewhere
    }
  }

  /**
   * Save execution checkpoint atomically to persistent disk storage and in-memory cache
   */
  public async saveCheckpoint(checkpoint: ExecutionCheckpoint): Promise<void> {
    const updated: ExecutionCheckpoint = {
      ...checkpoint,
      lastHeartbeatAt: checkpoint.lastHeartbeatAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update memory
    this.inMemoryCheckpoints.set(updated.executionId, updated);

    // Atomically persist to disk
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      const filePath = path.join(this.storageDir, `${updated.executionId}.json`);
      const tempPath = path.join(this.storageDir, `${updated.executionId}.tmp`);
      const data = JSON.stringify(updated, null, 2);

      fs.writeFileSync(tempPath, data, "utf8");
      try {
        fs.renameSync(tempPath, filePath);
      } catch {
        // Fallback on Windows if rename fails due to file lock
        fs.writeFileSync(filePath, data, "utf8");
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    } catch (err: any) {
      console.warn(`[CheckpointManager] Warning: failed to persist checkpoint to disk: ${err.message}`);
    }
  }

  /**
   * Retrieve an execution checkpoint by ID
   */
  public async getCheckpoint(executionId: string): Promise<ExecutionCheckpoint | null> {
    // 1. Check memory cache
    if (this.inMemoryCheckpoints.has(executionId)) {
      return this.inMemoryCheckpoints.get(executionId)!;
    }

    // 2. Check disk
    try {
      const filePath = path.join(this.storageDir, `${executionId}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const cp = JSON.parse(raw) as ExecutionCheckpoint;
        this.inMemoryCheckpoints.set(executionId, cp);
        return cp;
      }
    } catch (err: any) {
      console.warn(`[CheckpointManager] Failed to read checkpoint from disk for ${executionId}: ${err.message}`);
    }

    return null;
  }

  /**
   * Atomically commit a node transition and update the execution frontier
   */
  public async updateNodeTransition(
    executionId: string,
    transition: NodeTransitionOptions
  ): Promise<ExecutionCheckpoint> {
    const existing = await this.getCheckpoint(executionId);
    if (!existing) {
      throw new Error(`Checkpoint not found for execution ID: ${executionId}`);
    }

    const completed = new Set(existing.completedNodeIds);
    const skipped = new Set(existing.skippedNodeIds);
    const pending = new Set(existing.pendingNodeIds);
    const outputs = { ...existing.nodeOutputs };
    const accumulated = { ...existing.accumulatedState };

    pending.delete(transition.nodeId);

    if (transition.status === "NODE_STARTED") {
      existing.currentNodeId = transition.nodeId;
      existing.status = "RUNNING";
    } else if (transition.status === "NODE_COMPLETED") {
      completed.add(transition.nodeId);
      if (transition.output !== undefined) {
        outputs[transition.nodeId] = transition.output;
        accumulated.$json = transition.output;
        accumulated.$node[transition.nodeId] = { output: transition.output };
      }
      existing.currentNodeId = null;
    } else if (transition.status === "NODE_SKIPPED") {
      skipped.add(transition.nodeId);
      existing.currentNodeId = null;
    } else if (transition.status === "NODE_FAILED") {
      existing.status = "FAILED";
      existing.error = transition.error || "Node execution failed";
      existing.currentNodeId = null;
    }

    const updatedCheckpoint: ExecutionCheckpoint = {
      ...existing,
      completedNodeIds: Array.from(completed),
      skippedNodeIds: Array.from(skipped),
      pendingNodeIds: Array.from(pending),
      nodeOutputs: outputs,
      accumulatedState: accumulated,
    };

    await this.saveCheckpoint(updatedCheckpoint);
    return updatedCheckpoint;
  }

  /**
   * List all incomplete executions whose last heartbeat has expired (crashed or orphaned)
   */
  public async listIncompleteCheckpoints(
    heartbeatTimeoutMs: number = 120_000
  ): Promise<ExecutionCheckpoint[]> {
    const cutoffTime = Date.now() - heartbeatTimeoutMs;
    const candidates: ExecutionCheckpoint[] = [];

    // Scan memory
    for (const cp of this.inMemoryCheckpoints.values()) {
      if (
        ["STARTED", "RUNNING", "WAITING_RETRY", "PAUSED"].includes(cp.status)
      ) {
        const lastHb = new Date(cp.lastHeartbeatAt).getTime();
        if (lastHb < cutoffTime) {
          candidates.push(cp);
        }
      }
    }

    // Scan disk for files not in memory
    try {
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          const execId = file.replace(/\.json$/, "");
          if (this.inMemoryCheckpoints.has(execId)) continue;

          try {
            const raw = fs.readFileSync(path.join(this.storageDir, file), "utf8");
            const cp = JSON.parse(raw) as ExecutionCheckpoint;
            if (["STARTED", "RUNNING", "WAITING_RETRY", "PAUSED"].includes(cp.status)) {
              const lastHb = new Date(cp.lastHeartbeatAt).getTime();
              if (lastHb < cutoffTime) {
                candidates.push(cp);
              }
            }
          } catch {
            // Ignore corrupted disk entries
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return candidates;
  }

  /**
   * Delete checkpoint record upon permanent cleanup
   */
  public async deleteCheckpoint(executionId: string): Promise<boolean> {
    this.inMemoryCheckpoints.delete(executionId);
    try {
      const filePath = path.join(this.storageDir, `${executionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch {
      return false;
    }
    return true;
  }
}

export const globalCheckpointManager = new CheckpointManager();
