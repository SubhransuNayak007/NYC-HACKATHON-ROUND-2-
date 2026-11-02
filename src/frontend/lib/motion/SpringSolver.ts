/**
 * ============================================================================
 *  QuickReply — Time-Delta Critical Damped Spring Solver
 *  src/frontend/lib/motion/SpringSolver.ts
 * ============================================================================
 */

export interface SpringConfig {
  stiffness: number; // Force multiplier (e.g. 150 - 300)
  damping: number;   // Friction dampening (e.g. 15 - 28)
  mass?: number;      // Inertial mass (default 1)
  precision?: number; // Settle threshold (default 0.001)
}

export const SPRING_PRESETS = {
  cursorFast: { stiffness: 320, damping: 28, mass: 1 },
  interactiveCard: { stiffness: 220, damping: 24, mass: 1 },
  heavyParallax: { stiffness: 120, damping: 18, mass: 1.4 },
  smoothGlide: { stiffness: 180, damping: 22, mass: 1 },
} as const;

export class SpringValue {
  public current: number;
  public target: number;
  public velocity: number = 0;
  private config: SpringConfig;

  constructor(initial: number, config: SpringConfig = SPRING_PRESETS.interactiveCard) {
    this.current = initial;
    this.target = initial;
    this.config = config;
  }

  public setConfig(config: Partial<SpringConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setTarget(target: number) {
    this.target = target;
  }

  public setImmediate(val: number) {
    this.current = val;
    this.target = val;
    this.velocity = 0;
  }

  public update(dt: number): number {
    const { stiffness, damping, mass = 1, precision = 0.001 } = this.config;

    // Semi-implicit Euler integration (stable and accurate across varying dt)
    const displacement = this.target - this.current;
    const springForce = displacement * stiffness;
    const dampingForce = -this.velocity * damping;
    const acceleration = (springForce + dampingForce) / mass;

    this.velocity += acceleration * dt;
    this.current += this.velocity * dt;

    // Settle when practically stationary
    if (Math.abs(this.velocity) < precision && Math.abs(displacement) < precision) {
      this.current = this.target;
      this.velocity = 0;
    }

    return this.current;
  }

  public isSettled(): boolean {
    const precision = this.config.precision || 0.001;
    return this.current === this.target && Math.abs(this.velocity) < precision;
  }
}
