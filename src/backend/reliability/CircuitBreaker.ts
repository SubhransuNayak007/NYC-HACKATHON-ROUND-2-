/**
 * ============================================================
 *  QuickReply Autonomous OS — Circuit Breaker
 *  src/backend/reliability/CircuitBreaker.ts
 *
 *  Protects the execution plane from cascading failures and rate-limit exhaustion.
 *  Trips to OPEN on repeated 429/5xx errors, preventing API hammer loops.
 * ============================================================
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Failures before opening (default: 5)
  resetTimeoutMs?: number;   // Cool-down before testing half-open (default: 30,000 ms)
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(public readonly serviceName: string, config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.resetTimeoutMs = config.resetTimeoutMs || 30000;
  }

  /**
   * Executes a protected call through the circuit breaker
   */
  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error(
          `Circuit breaker for '${this.serviceName}' is OPEN. Requests blocked to protect external rate limits.`
        );
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      console.warn(`[CircuitBreaker] Circuit for '${this.serviceName}' TRIPPED to OPEN (${this.failureCount} failures).`);
    }
  }

  getState(): { name: string; state: CircuitState; failureCount: number } {
    return {
      name: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
    };
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
  }
}
