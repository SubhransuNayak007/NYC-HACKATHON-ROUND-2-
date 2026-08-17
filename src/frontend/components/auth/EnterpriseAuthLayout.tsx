"use client";

import React, { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check } from "lucide-react";

interface EnterpriseAuthLayoutProps {
  children: ReactNode;
  headerRight?: ReactNode;
}

// ── WORKFLOW QUEUE TASKS ──
interface WorkflowTask {
  id: string;
  title: string;
  category?: string;
  status: "working" | "done";
}

const WORKFLOW_TASKS: WorkflowTask[] = [
  {
    id: "task-1",
    title: "Identify code optimization opportunities and performance improvements",
    category: "AI Code Analysis",
    status: "working",
  },
  {
    id: "task-2",
    title: "Multi-channel comment-to-DM routing on WhatsApp & Instagram",
    category: "Social Automation",
    status: "done",
  },
  {
    id: "task-3",
    title: "Autonomous AI knowledge base sync and semantic vector retrieval",
    category: "RAG Pipeline",
    status: "done",
  },
  {
    id: "task-4",
    title: "Automated 24/7 lead qualification and intelligent CRM sync",
    category: "Growth Agent",
    status: "done",
  },
];

export function EnterpriseAuthLayout({
  children,
  headerRight,
}: EnterpriseAuthLayoutProps) {
  // Live typing effect on active task
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const activeTask = WORKFLOW_TASKS[activeTaskIndex];

  // ── TYPING SIMULATION & TASK ROTATION ──
  useEffect(() => {
    let charIdx = 0;
    setTypedText("");
    const fullText = activeTask.title;

    const typeInterval = setInterval(() => {
      if (charIdx <= fullText.length) {
        setTypedText(fullText.slice(0, charIdx));
        charIdx++;
      } else {
        clearInterval(typeInterval);
        // Wait 3.5s then cycle to next task
        setTimeout(() => {
          setActiveTaskIndex((prev) => (prev + 1) % WORKFLOW_TASKS.length);
        }, 3500);
      }
    }, 38);

    return () => clearInterval(typeInterval);
  }, [activeTaskIndex]);

  // ── 3D PARALLAX POINTER TRACKING ──
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* ── Main High-Fidelity Floating Canvas (Exact Dribbble Match) ── */}
      <div className="w-full max-w-[1240px] min-h-[720px] lg:min-h-[760px] bg-white rounded-[28px] sm:rounded-[36px] border border-slate-200/90 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.06),0_0_1px_1px_rgba(0,0,0,0.02)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT ZONE: Authentication Form & Brand Navigation (Cols: 6)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative bg-[#fafafa]">
          
          {/* Top Header Bar */}
          <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
            {/* Logo + Brand Name + Enterprise Subtitle */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                {/* Four-pointed AI Star Icon */}
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] tracking-tight text-slate-900 leading-none">
                  QuickReply
                </span>
                <span className="text-[9px] font-extrabold tracking-[0.14em] text-slate-400 uppercase mt-0.5">
                  ENTERPRISE
                </span>
              </div>
            </Link>

            {/* Contextual Header Switcher (e.g. "Already have an account? [Login]") */}
            {headerRight && (
              <div className="flex items-center text-xs text-slate-500">
                {headerRight}
              </div>
            )}
          </div>

          {/* Center Form Container */}
          <div className="w-full max-w-[370px] mx-auto my-auto py-2">
            {children}
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-center justify-between w-full pt-6 mt-6 border-t border-slate-200/60 text-[11px] text-slate-400 font-medium">
            <span>&copy; 2026 QuickReply.ai</span>
            <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-pointer transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="font-semibold">ENG</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT ZONE: Animated 3D Isometric Tile & Live Workflow Engine (Cols: 6)
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="hidden lg:flex lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-[#d9ebff] via-[#eaf2ff] to-[#a8cffd] p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-l border-slate-200/60 select-none cursor-default"
        >
          {/* Luminous Ambient Background Glow Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.35, 0.5, 0.35],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-16 -right-16 w-80 h-80 bg-blue-300/40 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute -bottom-16 -left-16 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl pointer-events-none"
          />

          {/* Top Feature Headline & Description */}
          <div className="relative z-10 space-y-2.5 pt-2">
            <h2 className="text-[26px] xl:text-[30px] font-bold text-slate-900 tracking-tight leading-[1.18] max-w-[390px]">
              Build, Deploy &amp; Manage Enterprise AI Agents
            </h2>
            <p className="text-xs xl:text-[13px] text-slate-600 leading-relaxed max-w-[400px]">
              Manage every AI agent, workflow, and business automation from one intelligent platform built for modern enterprises.
            </p>
          </div>

          {/* Center 3D Isometric AI Glass Tile with Organic Floating Bounce */}
          <div className="relative my-4 flex items-center justify-end pr-4">
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotateX: [55 + mousePos.y * 8, 55 + mousePos.y * 8, 55 + mousePos.y * 8],
                rotateZ: [-45 + mousePos.x * 10, -45 + mousePos.x * 10, -45 + mousePos.x * 10],
              }}
              transition={{
                y: {
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotateX: { duration: 0.2, ease: "easeOut" },
                rotateZ: { duration: 0.2, ease: "easeOut" },
              }}
              className="relative w-80 h-56 flex items-center justify-center"
              style={{
                perspective: 1200,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Isometric 3D Grid of Frosted Glass Diamond Tiles */}
              <div
                className="absolute inset-0 grid grid-cols-3 gap-3 origin-center scale-105"
                style={{
                  transform: "perspective(1200px) rotateX(55deg) rotateZ(-45deg) translateZ(0)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Row 1 */}
                <div className="h-20 rounded-2xl bg-white/40 backdrop-blur-md border border-white/70 shadow-sm" />
                <div className="h-20 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 shadow-md" />
                <div className="h-20 rounded-2xl bg-white/40 backdrop-blur-md border border-white/70 shadow-sm" />

                {/* Row 2 */}
                <div className="h-20 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 shadow-md" />

                {/* Center Elevated 3D Blue AI Star Emblem */}
                <motion.div
                  animate={{
                    translateZ: [30, 42, 30],
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-[0_22px_45px_rgba(37,99,235,0.5)] relative flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/30 pointer-events-none" />
                    {/* Glowing White 4-Point AI Star */}
                    <svg className="w-9 h-9 fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" viewBox="0 0 24 24">
                      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                    </svg>
                  </div>
                </motion.div>

                <div className="h-20 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 shadow-md" />

                {/* Row 3 */}
                <div className="h-20 rounded-2xl bg-white/40 backdrop-blur-md border border-white/70 shadow-sm" />
                <div className="h-20 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 shadow-md" />
                <div className="h-20 rounded-2xl bg-white/40 backdrop-blur-md border border-white/70 shadow-sm" />
              </div>
            </motion.div>
          </div>

          {/* Bottom Live Animated Workflow Execution Reel (Exact Motion from Video) */}
          <div className="relative z-10 space-y-2.5 overflow-hidden">
            {/* Active Running Task Card with Live Typing */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTask.id}
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -22, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-lg border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  </div>
                  <span className="font-medium text-slate-800 truncate max-w-[240px] xl:max-w-[280px]">
                    {typedText}
                    <span className="animate-pulse text-blue-600 font-bold">|</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-amber-600">Working...</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Static Done Task Card 2 */}
            <motion.div
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="p-3.5 rounded-2xl bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
                <div className="flex flex-col gap-1 w-32 xl:w-44">
                  <div className="h-2 rounded-full bg-slate-300/60 w-full" />
                  <div className="h-2 rounded-full bg-slate-300/40 w-2/3" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-600">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </motion.div>

            {/* Static Done Task Card 3 */}
            <motion.div
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.0,
              }}
              className="p-3.5 rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 shadow-xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
                <div className="flex flex-col gap-1 w-24 xl:w-36">
                  <div className="h-2 rounded-full bg-slate-300/50 w-full" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-600/80">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
}
