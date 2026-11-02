/**
 * ============================================================================
 *  QuickReply — Centralized High-Precision Motion Clock
 *  src/frontend/lib/motion/MotionClock.ts
 * ============================================================================
 *  Refresh-rate independent (60Hz, 120Hz, 144Hz, 240Hz) master animation loop.
 *  Decouples visual animation cycles entirely from React state reconciliation.
 */

type FrameCallback = (dt: number, timestamp: number) => void;

class MasterMotionClock {
  private subscribers = new Set<FrameCallback>();
  private isRunning = false;
  private reqId: number | null = null;
  private previousTime = 0;

  public subscribe(callback: FrameCallback): () => void {
    this.subscribers.add(callback);
    if (!this.isRunning && typeof window !== "undefined") {
      this.start();
    }
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private start() {
    this.isRunning = true;
    this.previousTime = performance.now();
    const tick = (now: number) => {
      // Clamp delta time to max 50ms (0.05s) to avoid explosion on tab refocus
      const dt = Math.min((now - this.previousTime) / 1000, 0.05);
      this.previousTime = now;

      // Notify all tick subscribers
      this.subscribers.forEach((callback) => {
        try {
          callback(dt, now);
        } catch (err) {
          console.error("MotionClock subscriber error:", err);
        }
      });

      if (this.isRunning) {
        this.reqId = requestAnimationFrame(tick);
      }
    };

    this.reqId = requestAnimationFrame(tick);
  }

  private stop() {
    this.isRunning = false;
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }
  }
}

export const motionClock = new MasterMotionClock();
