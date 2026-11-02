"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Bot,
  MessageSquare,
  Wand2,
  ShieldCheck,
  Brain,
  GitFork,
  Zap,
} from "lucide-react";
import { IsometricTiles3DExperience } from "./IsometricTiles3DExperience";

export function EnterpriseDashboardPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#FAFBFD] via-[#F6F8FC] to-[#F0F4FA] rounded-[28px] sm:rounded-[32px] border border-white/90 p-6 sm:p-7 xl:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)] select-none">
      
      {/* ── Ambient Soft Glow ── */}
      <div className="absolute top-0 right-0 w-[420px] h-[340px] bg-gradient-to-bl from-blue-200/25 via-indigo-100/20 to-transparent rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[260px] bg-gradient-to-tr from-sky-100/30 to-transparent rounded-full blur-[60px] pointer-events-none" />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO & 3D AI ORBIT
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 flex items-center justify-between gap-4 min-h-[160px]">
        {/* Left Headline & Description */}
        <div className="space-y-2 max-w-[340px] xl:max-w-[370px]">
          <h2 className="text-[26px] sm:text-[30px] xl:text-[34px] font-bold text-[#172033] tracking-tight leading-[1.15]">
            Build, Deploy &amp; Manage <br />
            Enterprise <span className="text-[#4568D8]">AI Agents</span>
          </h2>
          <p className="text-[11.5px] xl:text-[12px] text-[#64748B] leading-relaxed max-w-[320px]">
            Manage every AI agent, workflow, and business automation from one intelligent platform built for modern enterprises.
          </p>
        </div>

        {/* Right 3D Orbit Visualization */}
        <div className="w-[260px] h-[200px] shrink-0 relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center scale-[0.85] origin-center">
            <IsometricTiles3DExperience />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — 4 KPI METRIC CARDS
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 grid grid-cols-2 sm:grid-cols-4 gap-2.5 xl:gap-3 my-2">
        
        {/* KPI 1: AI Agents */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[20px] p-3.5 border border-[#EDF2F7] shadow-[0_4px_14px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-full bg-[#EDF3FF] text-[#4568D8] flex items-center justify-center mb-2">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] block">AI Agents</span>
            <span className="text-[22px] font-bold text-[#172033] tracking-tight leading-none block my-1">24</span>
            <span className="text-[10px] text-[#94A3B8] font-normal block">Total Agents</span>
          </div>
          <div className="text-[10px] font-semibold text-[#2F9E73] flex items-center gap-0.5 mt-2">
            <span>&uarr; 18%</span>
          </div>
        </motion.div>

        {/* KPI 2: Conversations */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[20px] p-3.5 border border-[#EDF2F7] shadow-[0_4px_14px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-full bg-[#EAF7F1] text-[#2F9E73] flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] block">Conversations</span>
            <span className="text-[22px] font-bold text-[#172033] tracking-tight leading-none block my-1">8,543</span>
            <span className="text-[10px] text-[#94A3B8] font-normal block">Total Conversations</span>
          </div>
          <div className="text-[10px] font-semibold text-[#2F9E73] flex items-center gap-0.5 mt-2">
            <span>&uarr; 32%</span>
          </div>
        </motion.div>

        {/* KPI 3: Tasks Automated */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[20px] p-3.5 border border-[#EDF2F7] shadow-[0_4px_14px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#5B5CE2] flex items-center justify-center mb-2">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] block">Tasks Automated</span>
            <span className="text-[22px] font-bold text-[#172033] tracking-tight leading-none block my-1">12,453</span>
            <span className="text-[10px] text-[#94A3B8] font-normal block">Completed Tasks</span>
          </div>
          <div className="text-[10px] font-semibold text-[#2F9E73] flex items-center gap-0.5 mt-2">
            <span>&uarr; 24%</span>
          </div>
        </motion.div>

        {/* KPI 4: Success Rate */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[20px] p-3.5 border border-[#EDF2F7] shadow-[0_4px_14px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-full bg-[#FFF5E5] text-[#D97706] flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#64748B] block">Success Rate</span>
            <span className="text-[22px] font-bold text-[#172033] tracking-tight leading-none block my-1">98.6%</span>
            <span className="text-[10px] text-[#94A3B8] font-normal block">Overall Success</span>
          </div>
          <div className="text-[10px] font-semibold text-[#2F9E73] flex items-center gap-0.5 mt-2">
            <span>&uarr; 2.4%</span>
          </div>
        </motion.div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PLATFORM ACTIVITY PANEL
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 bg-white/95 rounded-[24px] p-4 xl:p-4.5 border border-[#EDF2F7] shadow-[0_6px_22px_rgba(0,0,0,0.03)] space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-[#172033] tracking-tight">Platform Activity</span>
          <button
            type="button"
            className="text-[10.5px] font-semibold text-[#64748B] hover:text-[#172033] bg-[#F8FAFC] hover:bg-[#F1F5F9] px-3 py-1 rounded-full border border-slate-200/80 transition-colors shadow-2xs cursor-pointer"
          >
            View all
          </button>
        </div>

        {/* Stacked Activities with Timeline Line */}
        <div className="relative space-y-2.5">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[20px] top-4 bottom-4 w-[1.5px] bg-slate-100/90 z-0 pointer-events-none" />

          {/* Activity 1: AI Knowledge Base Sync */}
          <div className="relative z-10 p-3 rounded-[16px] bg-[#FAFBFD] border border-slate-100/90 shadow-2xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#EDF3FF] text-[#4568D8] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11.5px] font-semibold text-[#172033] truncate">
                  Autonomous AI knowledge base sync
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[10.5px] font-semibold text-[#4568D8]">Working...</span>
                <span className="w-2 h-2 rounded-full bg-[#4568D8] animate-pulse" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-gradient-to-r from-[#4568D8] to-[#5267D9] rounded-full" />
            </div>
          </div>

          {/* Activity 2: Customer Conversation Analysis */}
          <div className="relative z-10 p-3 rounded-[16px] bg-[#FAFBFD] border border-slate-100/90 shadow-2xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#EAF7F1] text-[#2F9E73] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11.5px] font-semibold text-[#172033] truncate">
                  Customer conversation analysis
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[10.5px] font-semibold text-[#2F9E73]">Active</span>
                <span className="w-2 h-2 rounded-full bg-[#2F9E73] animate-pulse" />
              </div>
            </div>
            {/* Dynamic Conversation Snippet */}
            <div className="pl-9 space-y-0.5">
              <p className="text-[10px] text-[#475569] font-medium leading-tight">
                <span className="font-semibold text-[#172033]">@alex_dtc:</span> &ldquo;Is this model available in size M?&rdquo;
              </p>
              <p className="text-[10px] text-[#2F9E73] font-semibold flex items-center gap-1 leading-tight">
                <Zap className="w-2.5 h-2.5 fill-current shrink-0" />
                <span>Yes! 4 units left in size M at ₹2,499 with express shipping ⚡</span>
              </p>
            </div>
          </div>

          {/* Activity 3: Workflow Automation Setup */}
          <div className="relative z-10 p-3 rounded-[16px] bg-[#FAFBFD] border border-slate-100/90 shadow-2xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#F1EEFF] text-[#5B5CE2] flex items-center justify-center shrink-0">
                  <GitFork className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11.5px] font-semibold text-[#172033] truncate">
                  Workflow automation setup
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[10.5px] font-semibold text-[#2F9E73]">Done</span>
                <span className="w-2 h-2 rounded-full bg-[#2F9E73]" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[88%] bg-gradient-to-r from-[#2F9E73] to-[#10B981] rounded-full" />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
