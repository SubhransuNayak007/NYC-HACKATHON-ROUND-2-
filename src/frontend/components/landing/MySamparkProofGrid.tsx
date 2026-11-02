"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Zap, Layers, Globe, Clock, MessageSquare, Instagram, Send, TrendingUp } from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

export function MySamparkProofGrid() {
  return (
    <section className="py-24 bg-[#F5F6F0] border-t border-black/5">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Creator Portrait with Headline & Real-time Live Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={heavyCardSpring}
            className="lg:col-span-5 relative rounded-[32px] overflow-hidden shadow-xl bg-zinc-950 group select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80"
              alt="Satisfied Founder"
              width={800}
              height={520}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-[520px] object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live DTC Store Performance
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight uppercase">
                  REAL QUESTIONS. <br />
                  REAL ANSWERS. <br />
                  <span className="text-[#EE7D60]">REAL SALES.</span>
                </h2>
                <p className="text-xs text-slate-300 font-medium max-w-xs">
                  Zero guesswork. Answers pulled directly from your verified product inventory and business policies.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 4 Rich Metric Cards with Live Graphs & Visuals */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Metric 1: 8 Channels */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...heavyCardSpring, delay: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-6 sm:p-7 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl font-black text-[#161616] font-mono">
                    7 <span className="text-sm font-bold text-slate-500 font-sans">CHANNELS</span>
                  </div>
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Instagram, WhatsApp, Facebook, LinkedIn, X, Telegram &amp; YouTube in one calm workspace.
                </p>
              </div>

              {/* Channels Icon Row: All 7 Badges */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 flex-wrap">
                <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold" title="Instagram">IG</div>
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold" title="WhatsApp">WA</div>
                <div className="w-6 h-6 rounded-md bg-blue-100 text-[#1877F2] flex items-center justify-center text-[10px] font-bold" title="Facebook">FB</div>
                <div className="w-6 h-6 rounded-md bg-sky-100 text-[#0A66C2] flex items-center justify-center text-[10px] font-bold" title="LinkedIn">IN</div>
                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold" title="X">𝕏</div>
                <div className="w-6 h-6 rounded-md bg-cyan-100 text-[#229ED9] flex items-center justify-center text-[10px] font-bold" title="Telegram">TG</div>
                <div className="w-6 h-6 rounded-md bg-red-100 text-[#FF0000] flex items-center justify-center text-[10px] font-bold" title="YouTube">YT</div>
              </div>
            </motion.div>

            {/* Metric 2: 7 Engines */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...heavyCardSpring, delay: 0.1 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-6 sm:p-7 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl font-black text-[#161616] font-mono">
                    7 <span className="text-sm font-bold text-slate-500 font-sans">ENGINES</span>
                  </div>
                  <Zap className="w-5 h-5 text-[#EE7D60]" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Catalog RAG, Auto DM, scheduling calendar, unified inbox, analytics, affiliates &amp; web chat.
                </p>
              </div>

              {/* Engine Progress Bars */}
              <div className="space-y-1.5 pt-2 border-t border-black/5">
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>Accuracy Benchmark</span>
                  <span className="text-emerald-600">99.4%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[99.4%]" />
                </div>
              </div>
            </motion.div>

            {/* Metric 3: 24/7 Response Speed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...heavyCardSpring, delay: 0.2 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-6 sm:p-7 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl font-black text-[#161616] font-mono">
                    1.4s <span className="text-sm font-bold text-slate-500 font-sans">AVG</span>
                  </div>
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Instant public replies and private DMs sent while buyer intent is at its highest peak.
                </p>
              </div>

              {/* Latency meter */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[11px] font-mono text-emerald-600 font-bold">
                <span>99.9% Uptime</span>
                <span>Fastest in class</span>
              </div>
            </motion.div>

            {/* Metric 4: Direct ROI Attributed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...heavyCardSpring, delay: 0.3 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-6 sm:p-7 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between space-y-4 select-none cursor-pointer transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl font-black text-[#161616] font-mono">
                    ₹4.2L <span className="text-sm font-bold text-slate-500 font-sans">REV/MO</span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Average monthly revenue recovered from missed DM and comment sales by our top merchants.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[11px] font-bold text-[#EE7D60]">
                <span>Tracked in real time</span>
                <span>1-Click checkout</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
