/**
 * ============================================================
 *  QuickReply — The Message Machine Physics Engine
 *  src/frontend/components/auth/message-machine/physicsEngine.ts
 *
 *  Continuous deterministic simulation for particles, spring nodes,
 *  signal pulses, and cursor attractor field. Runs outside React state.
 * ============================================================
 */

import { MM_CHANNELS, MM_MESSAGE_SNIPPETS } from "./tokens";

export interface SimulationParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  originX: number;
  originY: number;
  originZ: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  size: number;
  alpha: number;
  color: string;
}

export interface SignalPulse {
  id: number;
  fromChannelIndex: number;
  progress: number; // 0.0 -> 1.0 (towards center)
  speed: number;
  color: string;
}

export interface MessageFragment {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1.0 -> 0.0
  decay: number;
  channelId: string;
}

export interface PhysicsEngineState {
  particles: SimulationParticle[];
  pulses: SignalPulse[];
  fragments: MessageFragment[];
  coreScale: number;
  coreTargetScale: number;
  mouseX: number;
  mouseY: number;
  pointerActive: boolean;
  contractionProgress: number; // 0.0 (expanded) -> 1.0 (fully contracted into auth)
}

export class PhysicsEngine {
  public state: PhysicsEngineState;
  private particleCount: number;
  private nextPulseId = 0;
  private nextFragmentId = 0;
  private pulseTimer = 0;
  private fragmentTimer = 0;

  constructor(particleCount = 500) {
    this.particleCount = particleCount;
    this.state = {
      particles: [],
      pulses: [],
      fragments: [],
      coreScale: 1.0,
      coreTargetScale: 1.0,
      mouseX: 0,
      mouseY: 0,
      pointerActive: false,
      contractionProgress: 0,
    };
    this.initParticles();
  }

  public setParticleCount(count: number) {
    this.particleCount = count;
    this.initParticles();
  }

  private initParticles() {
    this.state.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const radius = 35 + Math.random() * 190;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.7;

      const x = Math.cos(angle) * Math.cos(elevation) * radius;
      const y = Math.sin(elevation) * (radius * 0.75);
      const z = Math.sin(angle) * Math.cos(elevation) * radius;

      const isYellow = Math.random() < 0.22;

      this.state.particles.push({
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        originX: x,
        originY: y,
        originZ: z,
        orbitRadius: radius,
        orbitSpeed: (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1),
        orbitAngle: angle,
        size: isYellow ? 2.4 + Math.random() * 2.2 : 1.2 + Math.random() * 1.6,
        alpha: 0.25 + Math.random() * 0.65,
        color: isYellow ? "#F3C515" : "#111111",
      });
    }
  }

  public updatePointer(x: number, y: number, active: boolean) {
    this.state.mouseX = x;
    this.state.mouseY = y;
    this.state.pointerActive = active;
  }

  public setContraction(target: number) {
    this.state.contractionProgress = target;
  }

  public tick(delta: number, isReducedMotion = false) {
    const s = this.state;

    // Smooth core scale interpolation
    s.coreScale += (s.coreTargetScale - s.coreScale) * 0.1;

    if (isReducedMotion) {
      return;
    }

    // 1. Update orbital particles
    const shrinkMultiplier = 1.0 - s.contractionProgress * 0.85;

    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];

      p.orbitAngle += p.orbitSpeed;

      const targetX = Math.cos(p.orbitAngle) * p.orbitRadius * shrinkMultiplier;
      const targetY = p.originY * shrinkMultiplier;
      const targetZ = Math.sin(p.orbitAngle) * p.orbitRadius * shrinkMultiplier;

      // Mouse attraction / repulsion force
      let fx = 0;
      let fy = 0;
      if (s.pointerActive && s.contractionProgress < 0.5) {
        const dx = s.mouseX - p.x;
        const dy = s.mouseY - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < 220 && dist > 5) {
          const force = Math.exp(-dist * 0.015) * 4.5;
          fx = (dx / dist) * force;
          fy = (dy / dist) * force;
        }
      }

      // Spring to target orbital coordinate
      p.vx = (p.vx + (targetX - p.x) * 0.04 + fx) * 0.86;
      p.vy = (p.vy + (targetY - p.y) * 0.04 + fy) * 0.86;
      p.vz = (p.vz + (targetZ - p.z) * 0.04) * 0.86;

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
    }

    // 2. Spawn and update signal pulses between channel nodes and core
    this.pulseTimer += delta;
    if (this.pulseTimer > 0.45 && s.contractionProgress < 0.4) {
      this.pulseTimer = 0;
      const randomChannel = Math.floor(Math.random() * MM_CHANNELS.length);
      s.pulses.push({
        id: this.nextPulseId++,
        fromChannelIndex: randomChannel,
        progress: 0,
        speed: 0.014 + Math.random() * 0.012,
        color: MM_CHANNELS[randomChannel].color,
      });
    }

    for (let i = s.pulses.length - 1; i >= 0; i--) {
      const pulse = s.pulses[i];
      pulse.progress += pulse.speed;
      if (pulse.progress >= 1.0) {
        s.pulses.splice(i, 1);
        // Pulse hit center -> slight core expansion bump
        s.coreTargetScale = 1.06;
        setTimeout(() => {
          s.coreTargetScale = 1.0;
        }, 120);
      }
    }

    // 3. Spawn and update floating message typography fragments
    this.fragmentTimer += delta;
    if (this.fragmentTimer > 1.8 && s.fragments.length < 8 && s.contractionProgress < 0.4) {
      this.fragmentTimer = 0;
      const randomChannel = MM_CHANNELS[Math.floor(Math.random() * MM_CHANNELS.length)];
      const randomSnippet = MM_MESSAGE_SNIPPETS[Math.floor(Math.random() * MM_MESSAGE_SNIPPETS.length)];
      
      const nodeX = Math.cos(randomChannel.angle) * randomChannel.distance;
      const nodeY = Math.sin(randomChannel.angle) * (randomChannel.distance * 0.75);

      s.fragments.push({
        id: this.nextFragmentId++,
        text: randomSnippet,
        x: nodeX + (Math.random() - 0.5) * 30,
        y: nodeY + (Math.random() - 0.5) * 30,
        vx: -Math.cos(randomChannel.angle) * 0.45 + (Math.random() - 0.5) * 0.2,
        vy: -Math.sin(randomChannel.angle) * 0.45 + (Math.random() - 0.5) * 0.2,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.005,
        channelId: randomChannel.id,
      });
    }

    for (let i = s.fragments.length - 1; i >= 0; i--) {
      const frag = s.fragments[i];
      frag.x += frag.vx;
      frag.y += frag.vy;
      frag.life -= frag.decay;
      if (frag.life <= 0) {
        s.fragments.splice(i, 1);
      }
    }
  }
}
