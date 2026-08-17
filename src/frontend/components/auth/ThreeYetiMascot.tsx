"use client";

import React, { useEffect, useRef, useState } from "react";

export type MascotMode =
  | "idle"
  | "email_focused"
  | "password_focused"
  | "password_peeking"
  | "submitting"
  | "success";

export interface ThreeYetiMascotProps {
  mode?: MascotMode;
  charCount?: number;
  typingProgress?: number; // 0 to 1 across form
}

// ── 2ND-ORDER SPRING-DAMPER PHYSICS ──
class SpringDamper {
  target: number;
  current: number;
  velocity: number;
  stiffness: number;
  damping: number;
  mass: number;

  constructor(initial = 0, stiffness = 120, damping = 14, mass = 1.0) {
    this.target = initial;
    this.current = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = Math.max(0.001, mass);
  }

  setTarget(t: number) {
    this.target = t;
  }

  update(dt: number): number {
    const step = Math.min(dt, 0.033);
    const springForce = -this.stiffness * (this.current - this.target);
    const dampingForce = -this.damping * this.velocity;
    const accel = (springForce + dampingForce) / this.mass;
    this.velocity += accel * step;
    this.current += this.velocity * step;
    return this.current;
  }
}

export function ThreeYetiMascot({
  mode = "idle",
  charCount = 0,
  typingProgress = 0,
}: ThreeYetiMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameIdxRef = useRef(0);

  // Springs for smooth 3D parallax tilt & reactions
  const springRotX = useRef(new SpringDamper(0, 140, 16));
  const springRotY = useRef(new SpringDamper(0, 140, 16));
  const springScale = useRef(new SpringDamper(1.0, 120, 14));
  const springTranslateY = useRef(new SpringDamper(0, 140, 16));

  // Confetti particles for success/submitting mode
  const confettiRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rot: number;
      vRot: number;
    }>
  >([]);

  // ── PRELOAD ALL HIGH-RES AUTHENTIC WEBP FRAMES ──
  useEffect(() => {
    const TOTAL_FRAMES = 148;
    const loadedImgs: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, "0");
      img.src = `/mascot/frames/f_${frameNum}.webp`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= 20 && !imagesLoaded) {
          setImagesLoaded(true);
        }
      };
      loadedImgs.push(img);
    }
    framesRef.current = loadedImgs;

    // Initialize confetti
    const colors = ["#ffd166", "#06d6a0", "#118ab2", "#ff70a6", "#ff9f1c", "#ffffff"];
    confettiRef.current = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 400,
      y: Math.random() * 200 - 100,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    }));
  }, []);

  // ── MOUSE POINTER TRACKING FOR KINETIC 3D PARALLAX ──
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normX = (e.clientX - centerX) / (rect.width / 2);
      const normY = (e.clientY - centerY) / (rect.height / 2);

      const clampedX = Math.max(-1, Math.min(1, normX));
      const clampedY = Math.max(-1, Math.min(1, normY));

      if (mode === "idle") {
        springRotX.current.setTarget(-clampedY * 8.5); // Tilt Up/Down
        springRotY.current.setTarget(clampedX * 10.5); // Tilt Left/Right
        springTranslateY.current.setTarget(0);
        springScale.current.setTarget(1.0);
      }
    };

    const handlePointerLeave = () => {
      springRotX.current.setTarget(0);
      springRotY.current.setTarget(0);
      springScale.current.setTarget(1.0);
      springTranslateY.current.setTarget(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    const c = containerRef.current;
    if (c) c.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (c) c.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [mode]);

  // ── HANDLE FORM STATE TRANSITIONS ──
  useEffect(() => {
    if (mode === "email_focused") {
      springRotX.current.setTarget(-3.5);
      springRotY.current.setTarget(-5.0 + typingProgress * 4.0);
      springScale.current.setTarget(1.04);
      springTranslateY.current.setTarget(-8);
    } else if (mode === "password_focused") {
      springRotX.current.setTarget(4.0);
      springRotY.current.setTarget(0);
      springScale.current.setTarget(0.98);
      springTranslateY.current.setTarget(6);
    } else if (mode === "password_peeking") {
      springRotX.current.setTarget(-2.0);
      springRotY.current.setTarget(6.5);
      springScale.current.setTarget(1.02);
      springTranslateY.current.setTarget(-4);
    } else if (mode === "submitting" || mode === "success") {
      springRotX.current.setTarget(-5.0);
      springRotY.current.setTarget(0);
      springScale.current.setTarget(1.08);
      springTranslateY.current.setTarget(-18);
    } else {
      springScale.current.setTarget(1.0);
      springTranslateY.current.setTarget(0);
    }
  }, [mode, typingProgress]);

  // ── 60FPS CANVAS PLAYBACK ENGINE & KINETIC PHYSICS ──
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameAccum = 0;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      // Advance video frames smoothly at 30fps
      frameAccum += dt;
      const frameInterval = 1.0 / 30.0;
      if (frameAccum >= frameInterval) {
        frameAccum -= frameInterval;
        const total = framesRef.current.length;
        if (total > 0) {
          currentFrameIdxRef.current = (currentFrameIdxRef.current + 1) % total;
        }
      }

      // Update spring physics
      const rotX = springRotX.current.update(dt);
      const rotY = springRotY.current.update(dt);
      const scale = springScale.current.update(dt);
      const transY = springTranslateY.current.update(dt);

      // Apply 3D kinetic transform to container
      if (containerRef.current) {
        containerRef.current.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(
          2
        )}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale.toFixed(3)}, ${scale.toFixed(
          3
        )}, 1) translateY(${transY.toFixed(1)}px)`;
      }

      // Draw current frame to canvas
      const canvas = canvasRef.current;
      if (canvas && framesRef.current.length > 0) {
        const ctx = canvas.getContext("2d");
        const curImg = framesRef.current[currentFrameIdxRef.current];
        if (ctx && curImg && curImg.complete && curImg.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(curImg, 0, 0, canvas.width, canvas.height);

          // Draw celebratory confetti if submitting or success
          if (mode === "submitting" || mode === "success") {
            confettiRef.current.forEach((p) => {
              p.y += p.vy;
              p.x += p.vx;
              p.rot += p.vRot;
              if (p.y > canvas.height + 20) {
                p.y = -20;
                p.x = Math.random() * canvas.width;
              }
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate((p.rot * Math.PI) / 180);
              ctx.fillStyle = p.color;
              ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
              ctx.restore();
            });
          }
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[480px] sm:min-h-[580px] rounded-[28px] overflow-hidden select-none flex flex-col justify-between shadow-2xl transition-shadow duration-300 bg-[#7cc2e8]"
      style={{
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* ── High-Performance Canvas Display ── */}
      <canvas
        ref={canvasRef}
        width={640}
        height={684}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* ── Instant High-Res Poster Fallback ── */}
      {!imagesLoaded && (
        <img
          src="/mascot/yeti_hero.webp"
          alt="Authentic Fluffy Yeti Mascot"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── Dynamic Ambient Soft Glow Overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

      {/* ── Shy / Password Peek Overlay Animation ── */}
      {mode === "password_focused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fadeIn transition-opacity duration-300">
          <div className="bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-xl flex items-center gap-2">
            <span className="text-xl">🙈</span>
            <span className="text-white text-xs font-semibold tracking-wide uppercase">
              Covering Eyes...
            </span>
          </div>
        </div>
      )}

      {mode === "password_peeking" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fadeIn transition-opacity duration-300">
          <div className="bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-xl flex items-center gap-2">
            <span className="text-xl">🫣</span>
            <span className="text-white text-xs font-semibold tracking-wide uppercase">
              Peeking!
            </span>
          </div>
        </div>
      )}

      {/* ── Top Floating Badge Spacer ── */}
      <div className="relative z-10 p-5 sm:p-6" />

      {/* ── Bottom Tracked Headline: EXPLORE. LEARN. GROW. ── */}
      <div className="relative z-10 p-5 sm:p-7 pointer-events-none">
        <h2 className="text-2xl sm:text-[32px] font-black text-white leading-[1.08] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] uppercase">
          EXPLORE.
          <br />
          <span className="tracking-tight text-white">LEARN. GROW.</span>
        </h2>
      </div>
    </div>
  );
}
