"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Check, Play } from "lucide-react";
import { HeroProductDemo } from "./HeroProductDemo";

export function Hero() {
  const scrollToDemo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Warm Gemini AI Ambient Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-radial from-amber-500/12 via-blue-500/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-28 right-1/4 w-[400px] h-[300px] bg-radial from-purple-500/8 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Gemini AI Spark Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/15 backdrop-blur-xs text-xs font-semibold text-[#111827] dark:text-[#F0F2F5] mb-8 shadow-2xs hover:border-amber-500/50 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
          <span>AUTONOMOUS GEMINI-POWERED COMMERCE OS</span>
        </div>

        {/* Editorial Giant Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold text-[#111827] dark:text-white tracking-[-0.035em] leading-[1.05] max-w-5xl mx-auto mb-6">
          YOUR BUSINESS, <br className="hidden sm:inline" />
          <span className="text-slate-800 dark:text-slate-200">ON AUTOPILOT.</span>
        </h1>

        {/* Supporting Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
          The autonomous AI operating system that turns customer messages, social comments, and sales inquiries across
          WhatsApp, Instagram, and YouTube into closed deals and 24/7 delighted customers.
        </p>

        {/* Primary & Secondary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold bg-[#111827] text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-slate-100 transition-all duration-150 shadow-md group"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="#demo"
            onClick={scrollToDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-zinc-900/90 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors shadow-2xs"
          >
            <Play className="w-4 h-4 text-slate-600 dark:text-slate-400 fill-current" />
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Value Proof Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-16">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Instant 2-minute setup</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp Web &amp; Meta Cloud API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Zero ban-risk architecture</span>
          </div>
        </div>

        {/* Hero Live Product Demonstration Container */}
        <div id="demo" className="scroll-mt-28">
          <HeroProductDemo />
        </div>
      </div>
    </section>
  );
}
