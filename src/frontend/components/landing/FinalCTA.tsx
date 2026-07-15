"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-24 bg-[#FAF8F5] dark:bg-[#050810] relative overflow-hidden border-t border-black/[0.06] dark:border-white/[0.08]">
      {/* Warm Gemini AI ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-radial from-amber-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#0D1117]/90 backdrop-blur-md p-8 sm:p-14 lg:p-16 text-center shadow-xl relative overflow-hidden">
          {/* Subtle Corner Aura */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-purple-500/10 to-transparent blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/15 text-xs font-semibold text-[#111827] dark:text-[#F0F2F5] mb-8">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>START SCALING IN MINUTES</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#111827] dark:text-white leading-tight max-w-3xl mx-auto mb-6">
            Ready to put your customer conversations on autopilot?
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-10">
            Join forward-thinking brands that close sales, answer questions, and delight customers 24/7 without growing support headcount.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-[#111827] text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-slate-100 transition-colors shadow-lg group"
            >
              <span>Start Free Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="mailto:subhransu.nayak.418@gmail.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF8F5] dark:bg-zinc-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <span>Talk to Enterprise Sales</span>
            </a>
          </div>

          <p className="mt-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
            No credit card required · Free 14-day trial · Instant setup
          </p>
        </div>
      </div>
    </section>
  );
}
