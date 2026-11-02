/**
 * ============================================================================
 *  QuickReply — Circuit Breaker
 *  src/backend/circuit-breaker.ts
 *
 *  Purpose:
 *    Prevent cascading failures when external dependencies (Meta, Anthropic,
 *    Redis, database) are unreliable. Implements the standard circuit breaker
 *    state machine: CLOSED → OPEN → HALF_OPEN.
 *
 *  States:
 *    CLOSED   — Normal operation. Failures are counted.
 *    OPEN     — Too many failures. Requests are rejected immediately.
 *    HALF_OPEN — Testing recovery. One probe request allowed through.
 *
 *  Design decisions:
 *    • State is stored in process memory (not Redis) to avoid dependency
 *      on Redis when Redis itself may be the failing dependency.
 *    • For multi-instance deployments, each instance has independent circuit
 *      state — this is intentional; it provides per-instance isolation.
 *    • Never throws from the state machine itself — only from wrapped calls.
 * ============================================================================
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** How long (ms) the circuit stays OPEN before moving to HALF_OPEN. Default: 30s */
  openDurationMs?: number;
  /** Number of successful probes in HALF_OPEN before closing. Default: 2 */
  successThreshold?: number;
  /** Name for logging/observability */
  name: string;
}

export class CircuitOpenError extends Error {
  constructor(public readonly circuitName: string, public readonly openUntil: number) {
    super(`Circuit "${circuitName}" is OPEN until ${new Date(openUntil).toISOString()}`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private openUntil = 0;

  private readonly failureThreshold: number;
  private readonly openDurationMs: number;
  private readonly successThreshold: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.openDurationMs = options.openDurationMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  private transitionTo(state: CircuitState): void {
    if (this.state !== state) {
      console.log(`[CircuitBreaker] "${this.name}": ${this.state} → ${state}`);
      this.state = state;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.failureCount = 0;
        this.successCount = 0;
        this.transitionTo("CLOSED");
      }
    } else if (this.state === "CLOSED") {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.successCount = 0;
    if (this.state === "HALF_OPEN") {
      // Probe failed — go back to OPEN
      this.openUntil = Date.now() + this.openDurationMs;
      this.transitionTo("OPEN");
      return;
    }
    if (this.state === "CLOSED") {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.openUntil = Date.now() + this.openDurationMs;
        this.transitionTo("OPEN");
      }
    }
  }

  private maybeTransitionFromOpen(): void {
    if (this.state === "OPEN" && Date.now() >= this.openUntil) {
      this.successCount = 0;
      this.transitionTo("HALF_OPEN");
    }
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @throws CircuitOpenError if the circuit is OPEN
   * @throws original error if the wrapped call fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpen();

    if (this.state === "OPEN") {
      throw new CircuitOpenError(this.name, this.openUntil);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      // Only count genuine failures — not CircuitOpenError from nested calls
      if (!(err instanceof CircuitOpenError)) {
        this.onFailure();
      }
      throw err;
    }
  }

  /**
   * Get current circuit status for observability.
   */
  getStatus(): {
    name: string;
    state: CircuitState;
    failureCount: number;
    openUntil: string | null;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      openUntil: this.state === "OPEN" ? new Date(this.openUntil).toISOString() : null,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  Pre-configured circuit breakers for known external dependencies
// ─────────────────────────────────────────────────────────────

export const circuits = {
  /** Meta Graph API — affects Instagram, WhatsApp */
  metaApi: new CircuitBreaker({
    name: "meta-graph-api",
    failureThreshold: 5,
    openDurationMs: 60_000,  // 1 minute open
    successThreshold: 2,
  }),

  /** Anthropic Claude API */
  anthropicApi: new CircuitBreaker({
    name: "anthropic-api",
    failureThreshold: 3,
    openDurationMs: 30_000,
    successThreshold: 1,
  }),

  /** OpenAI API */
  openaiApi: new CircuitBreaker({
    name: "openai-api",
    failureThreshold: 3,
    openDurationMs: 30_000,
    successThreshold: 1,
  }),

  /** YouTube Data API */
  youtubeApi: new CircuitBreaker({
    name: "youtube-api",
    failureThreshold: 5,
    openDurationMs: 60_000,
    successThreshold: 2,
  }),

  /** LinkedIn API */
  linkedinApi: new CircuitBreaker({
    name: "linkedin-api",
    failureThreshold: 5,
    openDurationMs: 60_000,
    successThreshold: 2,
  }),
};
