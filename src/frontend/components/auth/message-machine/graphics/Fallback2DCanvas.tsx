"use client";

/**
 * ============================================================
 *  QuickReply — 2D Canvas Fallback
 *  src/frontend/components/auth/message-machine/graphics/Fallback2DCanvas.tsx
 * ============================================================
 */

import React, { useEffect, useRef } from "react";
import { PhysicsEngine } from "../physicsEngine";
import { MM_CHANNELS, MM_COLORS } from "../tokens";

interface Fallback2DCanvasProps {
  physics: PhysicsEngine;
  contractionProgress: number;
  isReducedMotion?: boolean;
}

export function Fallback2DCanvas({
  physics,
  contractionProgress,
  isReducedMotion = false,
}: Fallback2DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    let lastTime = performance.now();

    const render = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      physics.setContraction(contractionProgress);
      physics.tick(delta, isReducedMotion);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const shrink = 1.0 - contractionProgress * 0.85;

      // 1. Draw connection lines
      if (contractionProgress < 0.8) {
        ctx.strokeStyle = MM_COLORS.border;
        ctx.lineWidth = 1;
        MM_CHANNELS.forEach((ch) => {
          const targetX = centerX + Math.cos(ch.angle) * ch.distance * shrink;
          const targetY = centerY + Math.sin(ch.angle) * (ch.distance * 0.75) * shrink;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
        });

        // Draw signal pulses
        physics.state.pulses.forEach((pulse) => {
          const ch = MM_CHANNELS[pulse.fromChannelIndex];
          const startX = centerX + Math.cos(ch.angle) * ch.distance * shrink;
          const startY = centerY + Math.sin(ch.angle) * (ch.distance * 0.75) * shrink;

          const px = startX + (centerX - startX) * pulse.progress;
          const py = startY + (centerY - startY) * pulse.progress;

          ctx.fillStyle = MM_COLORS.yellowPrimary;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Draw central yellow core
      const coreR = 38 * physics.state.coreScale * (1.0 - contractionProgress * 0.35);
      ctx.fillStyle = MM_COLORS.yellowPrimary;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw orbiting particles
      physics.state.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (1.0 - contractionProgress * 0.5);
        ctx.beginPath();
        ctx.arc(centerX + p.x, centerY + p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      reqIdRef.current = requestAnimationFrame(render);
    };

    reqIdRef.current = requestAnimationFrame(render);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [physics, contractionProgress, isReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
