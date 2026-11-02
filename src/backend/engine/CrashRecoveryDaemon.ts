/**
 * CrashRecoveryDaemon.ts
 * Automated Crash Recovery & In-Flight Execution Resumption Daemon (Requirement R4).
 * Periodically scans the persistence store for orphaned or interrupted executions
 * (e.g. after server reboot, crash, or OOM) and automatically re-activates them
 * from their last atomic checkpoint without duplicating side effects.
 */

import { CheckpointManager, ExecutionCheckpoint, globalCheckpointManager } from "./CheckpointManager";
import { ExecutionEventBus, globalEventBus } from "./EventBus";

export interface RecoverableEngine {
  resumeFromCheckpoint(checkpoint: ExecutionCheckpoint): Promise<any>;
}

export interface RecoveryReport {
  timestamp: string;
  scannedCount: number;
  recoveredCount: number;
  failedCount: number;
  recoveredExecutionIds: string[];
  errors: { executionId: string; error: string }[];
}

export class CrashRecoveryDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private checkpointManager: CheckpointManager = globalCheckpointManager,
    private eventBus: ExecutionEventBus = globalEventBus
  ) {}

  /**
   * Start recurring daemon timer
   */
  public start(
    engine: RecoverableEngine,
    intervalMs: number = 30_000,
    heartbeatTimeoutMs: number = 120_000
  ): void {
    if (this.timer) {
      this.stop();
    }

    // Initial immediate scan
    this.scanAndRecover(engine, heartbeatTimeoutMs).catch((err) => {
      console.error("[CrashRecoveryDaemon] Initial scan error:", err);
    });

    // Scheduled interval
    this.timer = setInterval(() => {
      this.scanAndRecover(engine, heartbeatTimeoutMs).catch((err) => {
        console.error("[CrashRecoveryDaemon] Periodic scan error:", err);
      });
    }, intervalMs);

    // Unref timer so it doesn't hold open process during CLI test runs
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stop recurring daemon timer
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Scan for orphaned executions and resume them from last committed checkpoint
   */
  public async scanAndRecover(
    engine: RecoverableEngine,
    heartbeatTimeoutMs: number = 120_000
  ): Promise<RecoveryReport> {
    if (this.isProcessing) {
      return {
        timestamp: new Date().toISOString(),
        scannedCount: 0,
        recoveredCount: 0,
        failedCount: 0,
        recoveredExecutionIds: [],
        errors: [{ executionId: "none", error: "Recovery scan already in progress" }],
      };
    }

    this.isProcessing = true;
    const report: RecoveryReport = {
      timestamp: new Date().toISOString(),
      scannedCount: 0,
      recoveredCount: 0,
      failedCount: 0,
      recoveredExecutionIds: [],
      errors: [],
    };

    try {
      const candidates = await this.checkpointManager.listIncompleteCheckpoints(heartbeatTimeoutMs);
      report.scannedCount = candidates.length;

      for (const checkpoint of candidates) {
        try {
          // Touch heartbeat to prevent dual-processing
          checkpoint.lastHeartbeatAt = new Date().toISOString();
          checkpoint.status = "RUNNING";
          await this.checkpointManager.saveCheckpoint(checkpoint);

          this.eventBus.emitEvent({
            executionId: checkpoint.executionId,
            tenantId: checkpoint.tenantId,
            workspaceId: checkpoint.workspaceId,
            workflowId: checkpoint.workflowId,
            eventType: "execution.resumed",
            payload: {
              reason: "CRASH_RECOVERY_DAEMON",
              recoveredFromNodeId: checkpoint.currentNodeId,
              completedCount: checkpoint.completedNodeIds.length,
            },
          });

          // Resume execution asynchronously
          engine.resumeFromCheckpoint(checkpoint).catch((execErr: any) => {
            console.error(`[CrashRecoveryDaemon] Execution ${checkpoint.executionId} failed after recovery:`, execErr);
          });

          report.recoveredCount++;
          report.recoveredExecutionIds.push(checkpoint.executionId);
        } catch (recoverErr: any) {
          report.failedCount++;
          report.errors.push({
            executionId: checkpoint.executionId,
            error: recoverErr.message || String(recoverErr),
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return report;
  }
}

export const globalCrashRecoveryDaemon = new CrashRecoveryDaemon();
