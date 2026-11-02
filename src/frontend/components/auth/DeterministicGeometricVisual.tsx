"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Layers, MessageSquare, GitFork, Zap } from "lucide-react";

interface DeterministicGeometricVisualProps {
  className?: string;
}

/**
 * DeterministicGeometricVisual — Zero-AI-Slop Engineered 2.5D Geometric Product Graphic
 * Consistent bevel logic, unified light source, restrained shadows, bounded bounding box.
 */
export function DeterministicGeometricVisual({ className = "" }: DeterministicGeometricVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse parallax motion with tight spring damping to prevent excessive drift
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 220, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Subtle isometric tilt (pitch & yaw) bounded safely
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [54, 48]);
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-46, -42]);
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-[230px] flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Subtle Atmospheric Floor Glow (Soft, not blown-out) */}
      <div className="absolute w-[260px] h-[180px] bg-blue-400/15 rounded-full blur-[40px] pointer-events-none transform translate-y-2" />

      {/* 3D Isometric Composition Root */}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[280px] h-[220px] flex items-center justify-center"
      >
        {/* ── Ground Contact Shadows ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "translateZ(-20px)", transformStyle: "preserve-3d" }}
        >
          {/* Main Blue Shadow */}
          <div className="absolute top-[65px] left-[90px] w-[100px] h-[100px] rounded-[28px] bg-blue-700/25 blur-[18px]" />
          {/* Top Companion Shadow */}
          <div className="absolute top-[10px] left-[130px] w-[70px] h-[65px] rounded-[20px] bg-slate-500/15 blur-[12px]" />
          {/* Left Companion Shadow */}
          <div className="absolute top-[90px] left-[15px] w-[75px] h-[70px] rounded-[22px] bg-slate-500/15 blur-[12px]" />
          {/* Right Companion Shadow */}
          <div className="absolute top-[80px] left-[165px] w-[80px] h-[75px] rounded-[22px] bg-slate-500/15 blur-[12px]" />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECONDARY TILE 1: TOP FROSTED WHITE TILE (Layers / Architecture)
            ══════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            transform: "translateZ(20px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[8px] left-[120px] w-[80px] h-[72px] rounded-[22px] bg-white/70 backdrop-blur-md border border-white/90 p-[1px] shadow-[0_8px_20px_rgba(37,99,235,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center group"
        >
          <div className="w-full h-full rounded-[21px] bg-gradient-to-br from-white/80 via-white/40 to-blue-50/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-600/75 group-hover:scale-105 transition-transform" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SECONDARY TILE 2: LEFT FROSTED WHITE TILE (Message / Chat)
            ══════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          style={{
            transform: "translateZ(24px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[85px] left-[10px] w-[82px] h-[74px] rounded-[22px] bg-white/70 backdrop-blur-md border border-white/90 p-[1px] shadow-[0_8px_20px_rgba(37,99,235,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center group"
        >
          <div className="w-full h-full rounded-[21px] bg-gradient-to-br from-white/80 via-white/40 to-blue-50/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600/75 group-hover:scale-105 transition-transform" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            HERO CENTER: COBALT BLUE SQUIRCLE TILE WITH 4-POINT STAR EMBLEM
            ══════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            transform: "translateZ(38px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[58px] left-[85px] w-[108px] h-[108px] rounded-[28px] bg-gradient-to-br from-[#2f75ff] via-[#1d64f2] to-[#1249c7] p-[1.5px] shadow-[0_16px_36px_rgba(29,100,242,0.38),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center group cursor-pointer"
        >
          <div className="w-full h-full rounded-[26.5px] bg-gradient-to-br from-white/20 via-transparent to-black/15 flex items-center justify-center relative overflow-hidden">
            {/* Top specular highlight */}
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/25 rounded-full blur-md pointer-events-none" />

            {/* Central 4-Point AI Star Emblem */}
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 fill-white filter drop-shadow-[0_2px_6px_rgba(255,255,255,0.6)] group-hover:scale-110 transition-transform duration-300"
            >
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SECONDARY TILE 3: RIGHT FROSTED WHITE TILE (GitFork / Workflow)
            ══════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -3.5, 0] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          style={{
            transform: "translateZ(26px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[75px] left-[175px] w-[88px] h-[78px] rounded-[24px] bg-white/70 backdrop-blur-md border border-white/90 p-[1px] shadow-[0_8px_20px_rgba(37,99,235,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center group"
        >
          <div className="w-full h-full rounded-[23px] bg-gradient-to-br from-white/80 via-white/40 to-blue-50/20 flex items-center justify-center">
            <GitFork className="w-5 h-5 text-blue-600/75 group-hover:scale-105 transition-transform" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SECONDARY TILE 4: LOWER-LEFT PILL TILE (Power / Lightning)
            ══════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          style={{
            transform: "translateZ(18px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[148px] left-[55px] w-[95px] h-[52px] rounded-full bg-white/65 backdrop-blur-md border border-white/85 p-[1px] shadow-[0_6px_16px_rgba(37,99,235,0.06),inset_0_1px_1px_rgba(255,255,255,0.85)] flex items-center justify-center group"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-white/75 via-white/35 to-blue-50/20 flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500/85" />
            <span className="text-[10px] font-bold text-slate-700 font-mono tracking-tight">AUTO</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
