"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MessageSquare, GitFork, Brain, Zap } from "lucide-react";

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
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [54, 46]); // Isometric pitch
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-48, -42]); // Isometric yaw
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-blue-400/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-sky-300/25 rounded-full blur-[35px] pointer-events-none" />

      {/* ── Background Subtle Orbit Ring (Clean, no stray dots) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] rounded-full border border-blue-200/30 border-dashed" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-blue-100/20" />
      </div>

      {/* ── 3D Isometric Stage Container ── */}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[320px] h-[320px] flex items-center justify-center"
      >
        {/* ── GROUND SHADOWS LAYER ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "translateZ(-25px)", transformStyle: "preserve-3d" }}
        >
          {/* Main Blue Center Tile Shadow */}
          <div className="absolute top-[90px] left-[90px] w-[140px] h-[140px] rounded-[36px] bg-blue-600/30 blur-[26px] transform scale-110" />
          {/* Satellite shadows */}
          <div className="absolute top-[5px] left-[95px] w-[110px] h-[110px] rounded-[30px] bg-slate-400/20 blur-[18px]" />
          <div className="absolute top-[95px] left-[195px] w-[110px] h-[110px] rounded-[30px] bg-slate-400/20 blur-[18px]" />
          <div className="absolute top-[95px] left-[5px] w-[110px] h-[110px] rounded-[30px] bg-slate-400/20 blur-[18px]" />
          <div className="absolute top-[195px] left-[95px] w-[110px] h-[110px] rounded-[30px] bg-slate-400/20 blur-[18px]" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SATELLITE TILE 1: TOP (PURPLE / BRAIN / CODE)
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          style={{ transform: "translateZ(18px)", transformStyle: "preserve-3d" }}
          className="absolute top-[5px] left-[105px] w-[110px] h-[105px] rounded-[28px] bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group hover:bg-white transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/90 via-white/50 to-indigo-50/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent" />
            <Brain className="w-7 h-7 text-indigo-500 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            SATELLITE TILE 2: RIGHT (BLUE / WORKFLOW NODES)
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
          className="absolute top-[105px] left-[205px] w-[110px] h-[105px] rounded-[28px] bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group hover:bg-white transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/90 via-white/50 to-blue-50/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent" />
            <GitFork className="w-7 h-7 text-blue-600 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            SATELLITE TILE 3: LEFT (BLUE / CHAT MESSAGE)
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -4.5, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
          className="absolute top-[105px] left-[5px] w-[110px] h-[105px] rounded-[28px] bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group hover:bg-white transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/90 via-white/50 to-blue-50/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent" />
            <MessageSquare className="w-7 h-7 text-blue-500 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            SATELLITE TILE 4: BOTTOM (ORANGE / AMBER AUTO BADGE)
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          style={{ transform: "translateZ(18px)", transformStyle: "preserve-3d" }}
          className="absolute top-[205px] left-[105px] w-[110px] h-[105px] rounded-[28px] bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group hover:bg-white transition-colors"
        >
          <div className="w-full h-full rounded-[27px] bg-gradient-to-br from-white/90 via-white/50 to-amber-50/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent" />
            <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs tracking-wider">
              <Zap className="w-4 h-4 fill-amber-500" />
              <span>AUTO</span>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO CENTER: ROYAL BLUE GLOSSY TILE WITH 4-POINT WHITE SPARKLE STAR
            ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "translateZ(36px)", transformStyle: "preserve-3d" }}
          className="absolute top-[90px] left-[90px] w-[140px] h-[140px] rounded-[34px] bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8] p-[1.5px] shadow-[0_16px_36px_rgba(37,99,235,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-pointer group z-20"
        >
          {/* Top Glass Bevel Surface */}
          <div className="w-full h-full rounded-[33px] bg-gradient-to-br from-white/30 via-transparent to-black/15 flex items-center justify-center relative overflow-hidden">
            {/* Luminous Specular Sheen */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/35 rounded-full blur-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-28 h-28 bg-blue-300/20 rounded-full blur-lg pointer-events-none" />

            {/* Central 4-Point AI Sparkle Star */}
            <div className="relative z-10 w-12 h-12 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-11 h-11 fill-white filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] group-hover:scale-110 transition-transform duration-300"
              >
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
