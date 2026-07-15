"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, Zap, Clock, CheckCircle2, Sparkles, Layers, ArrowUpRight } from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

// Platform Mini Badges for 6 Platforms
const PLATFORM_CHIPS = [
  { name: "Instagram", bg: "bg-pink-50 text-pink-600 border-pink-200", label: "IG" },
  { name: "Facebook", bg: "bg-blue-50 text-blue-600 border-blue-200", label: "FB" },
  { name: "X", bg: "bg-slate-100 text-slate-900 border-slate-300", label: "𝕏" },
  { name: "LinkedIn", bg: "bg-sky-50 text-sky-700 border-sky-200", label: "IN" },
  { name: "Pinterest", bg: "bg-red-50 text-red-600 border-red-200", label: "PIN" },
  { name: "YouTube", bg: "bg-rose-50 text-rose-600 border-rose-200", label: "YT" },
];

export function MySamparkProofGrid() {
  return (
    <section className="py-24 bg-[#F5F6F0] border-t border-black/5" id="proof-grid">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with "By the numbers" Pill */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={appleSpring}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
            <span>By the numbers</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight"
          >
            PROVEN BY <br />
            COMMERCE{" "}
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              LEADERS.
            </span>
          </motion.h2>
          <p className="mt-3 text-sm text-slate-600 font-medium max-w-lg mx-auto">
            Everything your brand needs to capture high-intent buyers the exact second they interact.
          </p>
        </div>

        {/* Main Grid: Left Lifestyle Visual + Right 3 Stacked Metric Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: High-Quality Warm Lifestyle Entrepreneur Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="lg:col-span-5 relative rounded-[32px] overflow-hidden shadow-xl bg-zinc-950 group select-none min-h-[500px] flex flex-col justify-between"
          >
            {/* High Quality Warm Lifestyle Photograph of Young Entrepreneur in front of Inventory */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1556742049-0a67e5572263?w=1000&auto=format&fit=crop&q=85"
              alt="Young Entrepreneur Managing Store Inventory"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            
            {/* Warm Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/20 z-0" />

            {/* Top Live Performance Pill */}
            <div className="relative z-10 p-7 flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-sm border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Merchant Performance
              </span>
              <span className="text-white/70 text-xs font-mono font-medium">99.9% UPTIME</span>
            </div>

            {/* Bottom Content Card */}
            <div className="relative z-10 p-7 sm:p-9 space-y-3">
              <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                REAL QUESTIONS. <br />
                REAL ANSWERS. <br />
                <span className="text-[#EE7D60]">REAL SALES.</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-sm leading-relaxed">
                Zero guesswork. Answers pulled directly from your verified product inventory, pricing tiers, and business policies.
              </p>

              <div className="pt-2 flex items-center gap-2 text-white/90 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Syncs with live Shopify, WooCommerce &amp; custom catalogs</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3 Stacked Rich Metric Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-5">
            {/* Metric 1: 6 PLATFORMS (Cyan Accent #7FE8E3) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...heavyCardSpring, delay: 0 }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.985 }}
              className="p-7 sm:p-8 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-all hover:shadow-md relative overflow-hidden"
            >
              {/* Cyan Subtle Accent Glow / Bar */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7FE8E3]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="text-4xl sm:text-5xl font-black text-[#161616] font-mono tracking-tight">
                    6
                  </div>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-black bg-[#7FE8E3] text-[#0d3b38] uppercase tracking-wider">
                      PLATFORMS
                    </span>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Unified Omnichannel Intelligence
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#7FE8E3]/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-[#0d5954]" />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Instagram, Facebook, X, LinkedIn, Pinterest &amp; YouTube connected directly into one single autonomous AI inbox.
              </p>

              {/* 6 Platform Badges Row */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5">
                {PLATFORM_CHIPS.map((chip, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${chip.bg} flex items-center gap-1.5 shadow-2xs`}
                  >
                    <span className="font-mono text-[11px] font-black">{chip.label}</span>
                    <span>{chip.name}</span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Metric 2: 7 TOOLS (Warm Gold Accent #F6C15C) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...heavyCardSpring, delay: 0.1 }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.985 }}
              className="p-7 sm:p-8 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-all hover:shadow-md relative overflow-hidden"
            >
              {/* Warm Gold Accent Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F6C15C]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="text-4xl sm:text-5xl font-black text-[#161616] font-mono tracking-tight">
                    7
                  </div>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-black bg-[#F6C15C] text-[#4a3407] uppercase tracking-wider">
                      TOOLS
                    </span>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      All-in-One Autonomous Suite
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#F6C15C]/20 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-[#8c5e00]" />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Comment-to-DM, AI Catalog RAG, Multi-Platform Scheduler, Unified Inbox, ROI Analytics, Storefront Widget &amp; Partner Marketing.
              </p>

              {/* Accuracy Benchmark Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-black/5">
                <div className="flex justify-between text-xs text-slate-700 font-bold">
                  <span>AI Catalog Grounding Accuracy</span>
                  <span className="text-[#8c5e00] font-mono font-black">99.4% Verified</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#F6C15C] h-full w-[99.4%] rounded-full" />
                </div>
              </div>
            </motion.div>

            {/* Metric 3: 24/7 (Bold Black Metric) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...heavyCardSpring, delay: 0.2 }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.985 }}
              className="p-7 sm:p-8 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-all hover:shadow-md relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="text-4xl sm:text-5xl font-black text-[#161616] font-mono tracking-tight">
                    24/7
                  </div>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-black bg-[#161616] text-white uppercase tracking-wider">
                      ALWAYS ACTIVE
                    </span>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Sub-Second Instant Response Speed
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#161616]" />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                1.4s average response speed. Public replies and private DMs fire while buyer intent is at its highest peak — day, night, and weekends.
              </p>

              {/* Latency & Speed Metric Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs font-mono font-bold">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  1.4s Median Latency
                </span>
                <span className="text-slate-600">Zero Missed Opportunities</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

