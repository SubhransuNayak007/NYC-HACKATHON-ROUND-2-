"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Sparkles, Layers, MessageSquare, GitFork, Zap, Check, Play, Pause } from "lucide-react";

interface Reference3DIsometricStageProps {
  className?: string;
  isAutoRunning: boolean;
  onToggleAuto: () => void;
  activeTile: string;
  onSelectTile: (tile: string) => void;
}

/**
 * Reference3DIsometricStage
 * 100% Deterministic 2.5D Isometric Physics Stage matching the reference video & screenshot.
 * Features:
 * - Real tactile spring physics on all tiles (press, bounce, elevation)
 * - Interactive AUTO button tile with active pulsating state
 * - Connecting isometric optical circuit lines with animated signal pulses
 * - Ambient particle constellation and soft ground shadows
 * - Mouse parallax tilt with strict damping to prevent runaway
 */
export function Reference3DIsometricStage({
  className = "",
  isAutoRunning,
  onToggleAuto,
  activeTile,
  onSelectTile,
}: Reference3DIsometricStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pressedTile, setPressedTile] = useState<string | null>(null);

  // Mouse position spring motion for smooth parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 220, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax pitch & yaw transforms bounded safely
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [56, 50]);
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-47, -43]);
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
    setPressedTile(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-[270px] flex items-center justify-center select-none overflow-visible ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* ── Floor Glow & Orbital Ambient Waves ── */}
      <div className="absolute w-[380px] h-[240px] bg-gradient-to-tr from-blue-400/20 via-sky-300/15 to-transparent rounded-full blur-[50px] pointer-events-none transform translate-y-3" />
      
      {/* Isometric Concentric Floor Rings */}
      <div
        className="absolute w-[360px] h-[360px] rounded-full border border-blue-400/15 pointer-events-none"
        style={{
          transform: "rotateX(53deg) rotateZ(-45deg) scale(1.05)",
          transformStyle: "preserve-3d",
        }}
      />
      <div
        className="absolute w-[260px] h-[260px] rounded-full border border-blue-400/20 border-dashed pointer-events-none"
        style={{
          transform: "rotateX(53deg) rotateZ(-45deg) scale(0.9)",
          transformStyle: "preserve-3d",
        }}
      />

      {/* Floating Ambient Signal Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[18%] left-[22%] w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-ping" />
        <div className="absolute top-[28%] right-[20%] w-1.5 h-1.5 rounded-full bg-blue-500/60" />
        <div className="absolute bottom-[24%] left-[28%] w-1 h-1 rounded-full bg-sky-400/60" />
        <div className="absolute bottom-[18%] right-[26%] w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />
      </div>

      {/* ── 3D Isometric Preserved-Stage ── */}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[340px] h-[270px] flex items-center justify-center cursor-default"
      >
        
        {/* ════════════════════════════════════════════════════════════════
            1. GROUND CONTACT SHADOWS & CIRCUIT WIRE PATHS (translateZ = -26px)
            ════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "translateZ(-26px)", transformStyle: "preserve-3d" }}
        >
          {/* Main Blue Center Shadow */}
          <div className="absolute top-[82px] left-[92px] w-[136px] h-[136px] rounded-[38px] bg-blue-700/35 blur-[22px] transform scale-110" />
          
          {/* Top-Left Companion Shadow */}
          <div className="absolute top-[8px] left-[45px] w-[100px] h-[90px] rounded-[26px] bg-slate-500/16 blur-[16px]" />
          
          {/* Top-Right Companion Shadow */}
          <div className="absolute top-[8px] left-[185px] w-[100px] h-[90px] rounded-[26px] bg-slate-500/16 blur-[16px]" />
          
          {/* Bottom-Left Companion Shadow */}
          <div className="absolute top-[148px] left-[45px] w-[100px] h-[90px] rounded-[26px] bg-slate-500/16 blur-[16px]" />
          
          {/* Bottom-Right AUTO Shadow */}
          <div className={`absolute top-[148px] left-[185px] w-[100px] h-[90px] rounded-[26px] blur-[16px] transition-all duration-300 ${
            isAutoRunning ? "bg-amber-600/30" : "bg-slate-500/16"
          }`} />

          {/* Circuit Lines Connecting Companion Nodes to Center */}
          <svg className="absolute inset-0 w-full h-full stroke-blue-400/25 fill-none stroke-[1.5] stroke-dasharray-[4_3]">
            <line x1="95" y1="55" x2="160" y2="150" />
            <line x1="235" y1="55" x2="160" y2="150" />
            <line x1="95" y1="195" x2="160" y2="150" />
            <line x1="235" y1="195" x2="160" y2="150" />
          </svg>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            2. TOP-LEFT TILE: NEURAL KNOWLEDGE / LAYERS MESH
            ════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: activeTile === "knowledge" ? [0, -7, 0] : [0, -4, 0],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          whileHover={{ scale: 1.06, translateZ: 34 }}
          whileTap={{ scale: 0.94, translateZ: 14 }}
          onClick={() => onSelectTile("knowledge")}
          style={{
            transform: `translateZ(${activeTile === "knowledge" ? 32 : 22}px)`,
            transformStyle: "preserve-3d",
          }}
          className={`absolute top-[10px] left-[42px] w-[104px] h-[92px] rounded-[28px] p-[1.5px] cursor-pointer transition-all duration-200 ${
            activeTile === "knowledge"
              ? "bg-gradient-to-br from-blue-400 via-white to-blue-200 ring-2 ring-blue-500/40 shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
              : "bg-white/60 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(37,99,235,0.08)]"
          }`}
        >
          <div className="w-full h-full rounded-[26px] bg-gradient-to-br from-white/85 via-white/45 to-blue-50/25 flex flex-col items-center justify-center relative overflow-hidden group">
            {/* Top Specular Sheen */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
            
            {/* Layered Knowledge Mesh Icon */}
            <Layers className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${
              activeTile === "knowledge" ? "text-blue-600 stroke-[2.2]" : "text-blue-600/75 stroke-[1.8]"
            }`} />
            <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-1">
              RAG SYNC
            </span>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            3. TOP-RIGHT TILE: NETWORK ROUTING / BRANCH NODES
            ════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: activeTile === "workflow" ? [0, -7, 0] : [0, -4.5, 0],
          }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          whileHover={{ scale: 1.06, translateZ: 34 }}
          whileTap={{ scale: 0.94, translateZ: 14 }}
          onClick={() => onSelectTile("workflow")}
          style={{
            transform: `translateZ(${activeTile === "workflow" ? 32 : 22}px)`,
            transformStyle: "preserve-3d",
          }}
          className={`absolute top-[10px] left-[188px] w-[104px] h-[92px] rounded-[28px] p-[1.5px] cursor-pointer transition-all duration-200 ${
            activeTile === "workflow"
              ? "bg-gradient-to-br from-blue-400 via-white to-blue-200 ring-2 ring-blue-500/40 shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
              : "bg-white/60 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(37,99,235,0.08)]"
          }`}
        >
          <div className="w-full h-full rounded-[26px] bg-gradient-to-br from-white/85 via-white/45 to-blue-50/25 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
            
            {/* GitFork Branch Network Icon */}
            <GitFork className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${
              activeTile === "workflow" ? "text-blue-600 stroke-[2.2]" : "text-blue-600/75 stroke-[1.8]"
            }`} />
            <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-1">
              ROUTING
            </span>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            4. BOTTOM-LEFT TILE: CONVERSATION ANALYSIS & CHAT BUBBLE
            ════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: activeTile === "conversation" ? [0, -7, 0] : [0, -4.2, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          whileHover={{ scale: 1.06, translateZ: 34 }}
          whileTap={{ scale: 0.94, translateZ: 14 }}
          onClick={() => onSelectTile("conversation")}
          style={{
            transform: `translateZ(${activeTile === "conversation" ? 32 : 22}px)`,
            transformStyle: "preserve-3d",
          }}
          className={`absolute top-[152px] left-[42px] w-[104px] h-[92px] rounded-[28px] p-[1.5px] cursor-pointer transition-all duration-200 ${
            activeTile === "conversation"
              ? "bg-gradient-to-br from-blue-400 via-white to-blue-200 ring-2 ring-blue-500/40 shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
              : "bg-white/60 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(37,99,235,0.08)]"
          }`}
        >
          <div className="w-full h-full rounded-[26px] bg-gradient-to-br from-white/85 via-white/45 to-blue-50/25 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
            
            {/* Chat Bubble Icon */}
            <MessageSquare className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${
              activeTile === "conversation" ? "text-blue-600 stroke-[2.2]" : "text-blue-600/75 stroke-[1.8]"
            }`} />
            <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-1">
              CHATS
            </span>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            5. BOTTOM-RIGHT TILE: TACTILE "AUTO" RUNNING BUTTON TILE
            ════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: isAutoRunning ? [0, -6, 0] : [0, -3.8, 0],
          }}
          transition={{ duration: isAutoRunning ? 2.5 : 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
          whileHover={{ scale: 1.08, translateZ: 38 }}
          whileTap={{ scale: 0.92, translateZ: 12 }}
          onClick={() => {
            onToggleAuto();
            onSelectTile("auto");
          }}
          style={{
            transform: `translateZ(${isAutoRunning ? 36 : 22}px)`,
            transformStyle: "preserve-3d",
          }}
          className={`absolute top-[152px] left-[188px] w-[104px] h-[92px] rounded-[28px] p-[1.5px] cursor-pointer transition-all duration-300 ${
            isAutoRunning
              ? "bg-gradient-to-br from-amber-400 via-amber-200 to-amber-500 shadow-[0_14px_32px_rgba(245,158,11,0.35)] ring-2 ring-amber-400"
              : "bg-white/65 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(37,99,235,0.08)] hover:bg-white/80"
          }`}
        >
          <div className={`w-full h-full rounded-[26px] flex flex-col items-center justify-center relative overflow-hidden group transition-colors ${
            isAutoRunning
              ? "bg-gradient-to-br from-amber-50 via-white to-amber-100/70"
              : "bg-gradient-to-br from-white/85 via-white/45 to-amber-50/30"
          }`}>
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
            
            {/* Animated Zap / Auto Icon */}
            <div className="flex items-center gap-1">
              <Zap className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                isAutoRunning ? "text-amber-500 fill-amber-500 animate-bounce" : "text-amber-600/80"
              }`} />
              <span className={`text-[12px] font-black tracking-wider ${
                isAutoRunning ? "text-amber-700" : "text-slate-700"
              }`}>
                AUTO
              </span>
            </div>

            {/* Status Pulse Tag */}
            <div className="mt-1 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isAutoRunning ? "bg-amber-500 animate-ping" : "bg-slate-300"
              }`} />
              <span className={`text-[9px] font-extrabold uppercase tracking-tight ${
                isAutoRunning ? "text-amber-700" : "text-slate-400"
              }`}>
                {isAutoRunning ? "RUNNING" : "STANDBY"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            6. HERO CENTER ROYAL BLUE SQUIRCLE WITH 4-POINT STAR EMBLEM
            ════════════════════════════════════════════════════════════════ */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.05, translateZ: 52 }}
          whileTap={{ scale: 0.94, translateZ: 20 }}
          onClick={() => {
            onToggleAuto();
            onSelectTile("hero");
          }}
          style={{
            transform: "translateZ(46px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-[76px] left-[86px] w-[138px] h-[138px] rounded-[36px] bg-gradient-to-br from-[#2f75ff] via-[#1d64f2] to-[#1249c7] p-[1.5px] shadow-[0_22px_48px_rgba(29,100,242,0.44),inset_0_1px_2px_rgba(255,255,255,0.8)] flex items-center justify-center group cursor-pointer"
        >
          {/* Top Glass Bevel Surface */}
          <div className="w-full h-full rounded-[34.5px] bg-gradient-to-br from-white/25 via-transparent to-black/15 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Luminous Specular Sheen */}
            <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/30 rounded-full blur-lg pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full blur-md pointer-events-none" />

            {/* Central 4-Point AI Sparkle Star */}
            <div className="relative z-10 w-12 h-12 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-11 h-11 fill-white filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] group-hover:scale-115 transition-transform duration-300"
              >
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>

            {/* Mode Tag */}
            <div className="relative z-10 mt-0.5 text-[9px] font-extrabold text-blue-100 tracking-wider uppercase">
              {isAutoRunning ? "24/7 ACTIVE" : "AUTONOMOUS"}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
