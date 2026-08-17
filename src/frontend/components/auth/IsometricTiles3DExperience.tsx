"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Bot, Zap, BarChart2, Share2, Sparkles, Brain, MessageSquare, GitFork } from "lucide-react";

interface IsometricTiles3DProps {
  className?: string;
}

export function IsometricTiles3DExperience({ className = "" }: IsometricTiles3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse position spring motion
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 180, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax rotation & translation transforms
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [52, 44]); // Isometric pitch tilt
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-48, -42]); // Isometric yaw tilt
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-8, 8]);

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
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* ── Volumetric Ambient Glow & Radiant Light Rays ── */}
      <div className="absolute top-1/4 right-1/4 w-[420px] h-[420px] bg-gradient-to-br from-blue-400/35 via-blue-500/20 to-indigo-500/0 rounded-full blur-[70px] pointer-events-none transform -translate-y-6" />
      <div className="absolute top-1/3 right-1/3 w-[280px] h-[280px] bg-sky-300/30 rounded-full blur-[50px] pointer-events-none" />

      {/* ── 3D Isometric Stage Container ── */}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[340px] h-[340px] flex items-center justify-center"
      >
        
        {/* ── GROUND SHADOWS LAYER ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "translateZ(-30px)", transformStyle: "preserve-3d" }}
        >
          {/* Main Blue Center Tile Shadow */}
          <div className="absolute top-[85px] left-[85px] w-[140px] h-[140px] rounded-[36px] bg-blue-600/30 blur-[28px] transform scale-110" />
          {/* Surrounding ambient shadows */}
          <div className="absolute top-[20px] left-[150px] w-[100px] h-[100px] rounded-[28px] bg-slate-400/20 blur-[18px]" />
          <div className="absolute top-[150px] left-[20px] w-[110px] h-[110px] rounded-[28px] bg-slate-400/20 blur-[18px]" />
          <div className="absolute top-[140px] left-[160px] w-[120px] h-[100px] rounded-[28px] bg-blue-400/25 blur-[20px]" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 1: HERO CENTER BLUE GLASS TILE WITH 4-POINT STAR EMBLEM
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            transform: "translateZ(45px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[80px] left-[80px] w-[140px] h-[140px] rounded-[34px] bg-gradient-to-br from-[#2f75ff] via-[#1d64f2] to-[#1249c7] p-[1.5px] shadow-[0_20px_45px_rgba(29,100,242,0.42),inset_0_1px_1px_rgba(255,255,255,0.7)] cursor-pointer group"
        >
          {/* Top Glass Bevel Surface */}
          <div className="w-full h-full rounded-[33px] bg-gradient-to-br from-white/25 via-transparent to-black/15 flex items-center justify-center relative overflow-hidden">
            {/* Luminous Specular Sheen */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/30 rounded-full blur-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-28 h-28 bg-blue-400/20 rounded-full blur-lg pointer-events-none" />

            {/* Central 4-Point AI Sparkle Star */}
            <div className="relative z-10 w-12 h-12 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-10 h-10 fill-white filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)] group-hover:scale-110 transition-transform duration-300"
              >
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 2: TOP BOT / AI ASSISTANT FROSTED GLASS TILE
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
          style={{
            transform: "translateZ(26px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute -top-[15px] left-[95px] w-[110px] h-[95px] rounded-[28px] bg-white/45 backdrop-blur-xl border border-white/80 p-[1px] shadow-[0_12px_28px_rgba(37,99,235,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center group hover:bg-white/60 transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/60 via-white/20 to-blue-50/30 flex items-center justify-center relative overflow-hidden">
            {/* Specular Highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
            <Bot className="w-7 h-7 text-blue-600/80 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 3: RIGHT LIGHTNING / POWER FROSTED GLASS TILE
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 5.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
          style={{
            transform: "translateZ(30px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[90px] left-[235px] w-[105px] h-[120px] rounded-[28px] bg-white/50 backdrop-blur-xl border border-white/85 shadow-[0_14px_32px_rgba(37,99,235,0.14),inset_0_1px_2px_rgba(255,255,255,0.95)] flex items-center justify-center group hover:bg-white/65 transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/65 via-white/25 to-blue-50/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
            <Zap className="w-7 h-7 text-blue-500 fill-blue-500/20 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 4: BOTTOM NODES / AUTOMATION WORKFLOW FROSTED GLASS TILE
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -4.5, 0],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
          style={{
            transform: "translateZ(24px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[230px] left-[75px] w-[110px] h-[100px] rounded-[28px] bg-white/45 backdrop-blur-xl border border-white/80 shadow-[0_12px_28px_rgba(37,99,235,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-center group hover:bg-white/60 transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/60 via-white/20 to-blue-50/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
            <Share2 className="w-6 h-6 text-blue-600/80 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 5: FAR RIGHT ANALYTICS / CHART FROSTED GLASS TILE
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -3.5, 0],
          }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.6,
          }}
          style={{
            transform: "translateZ(18px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[20px] left-[225px] w-[95px] h-[80px] rounded-[24px] bg-white/40 backdrop-blur-lg border border-white/75 shadow-[0_10px_24px_rgba(37,99,235,0.1),inset_0_1px_2px_rgba(255,255,255,0.85)] flex items-center justify-center group hover:bg-white/55 transition-colors"
        >
          <div className="w-full h-full rounded-[23px] bg-gradient-to-br from-white/55 via-white/15 to-blue-50/25 flex items-center justify-center relative overflow-hidden">
            <BarChart2 className="w-5 h-5 text-blue-600/75 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 6: ARCHITECTURAL ELONGATED GLASS PILL (TOP-RIGHT)
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            transform: "translateZ(12px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute -top-[25px] left-[220px] w-[140px] h-[36px] rounded-full bg-white/35 backdrop-blur-md border border-white/70 shadow-xs"
        />

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 7: ARCHITECTURAL ELONGATED GLASS PILL (BOTTOM-LEFT)
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            transform: "translateZ(14px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[170px] -left-[30px] w-[130px] h-[44px] rounded-full bg-white/35 backdrop-blur-md border border-white/70 shadow-xs"
        />

        {/* ══════════════════════════════════════════════════════════════════════
            TILE 8: REAR SLANTED GLASS SLAB (DEEP LAYER)
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            transform: "translateZ(6px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[30px] -left-[20px] w-[100px] h-[110px] rounded-[30px] bg-white/25 backdrop-blur-sm border border-white/50 shadow-2xs"
        />

      </motion.div>
    </div>
  );
}
