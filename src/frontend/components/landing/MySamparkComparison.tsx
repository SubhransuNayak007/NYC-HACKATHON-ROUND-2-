"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

const COMPARISON_ROWS = [
  {
    feature: "Answers",
    others: "One fixed canned message",
    quickreply: "Answers dynamically from your real catalog",
  },
  {
    feature: "Prices & Stock",
    others: "Whatever it guesses",
    quickreply: "Your exact live prices, variations, and stock",
  },
  {
    feature: "Triggers",
    others: "Keyword only",
    quickreply: "Keywords, comments, DMs, or every post",
  },
  {
    feature: "Platforms",
    others: "Instagram only",
    quickreply: "Instagram + WhatsApp + Facebook + LinkedIn, one inbox",
  },
  {
    feature: "Campaigns & Scheduling",
    others: "Not included",
    quickreply: "Schedule & auto-publish across 8 platforms",
  },
  {
    feature: "Website Chat Widget",
    others: "Not included",
    quickreply: "Branded AI chat widget included",
  },
  {
    feature: "Human Handover",
    others: "Not supported",
    quickreply: "Take over from AI seamlessly any time",
  },
  {
    feature: "Pricing",
    others: "Per seat, per month lock-in",
    quickreply: "1 credit = 1 AI reply, manual replies 100% free",
  },
];

export function MySamparkComparison() {
  return (
    <section className="py-24 bg-[#F5F6F0]" id="comparison">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
            Why us
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight">
            NOT EVERY &quot;AUTO REPLY&quot; <br />
            ACTUALLY{" "}
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              ANSWERS.
            </span>
          </h2>
        </div>

        {/* Comparison Table with Spring Entrance & High-Contrast Typography */}
        <div className="rounded-[32px] border border-black/10 bg-white shadow-xl overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-12 bg-[#FAF8F5] p-5 sm:p-7 border-b border-black/5 text-xs sm:text-sm font-black">
                <div className="col-span-4 text-slate-500 uppercase font-mono tracking-wider">What&apos;s included</div>
                <div className="col-span-4 text-slate-500 uppercase font-mono tracking-wider">Other auto-reply tools</div>
                <div className="col-span-4 text-[#EE7D60] uppercase font-mono flex items-center gap-1.5 font-black tracking-wider">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>QuickReply</span>
                </div>
              </div>

              <div className="divide-y divide-black/5">
                {COMPARISON_ROWS.map((row, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ backgroundColor: "rgba(250, 248, 245, 0.7)" }}
                    transition={appleSpring}
                    className="grid grid-cols-12 p-5 sm:p-6 text-sm items-center transition-colors"
                  >
                    <div className="col-span-4 font-bold text-[#161616] text-sm sm:text-base pr-4">
                      {row.feature}
                    </div>
                    <div className="col-span-4 text-slate-600 font-medium flex items-center gap-2.5 pr-4 text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-[11px] shrink-0">
                        ✕
                      </span>
                      <span>{row.others}</span>
                    </div>
                    <div className="col-span-4 text-[#161616] font-bold flex items-center gap-2.5 text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] shrink-0">
                        ✓
                      </span>
                      <span>{row.quickreply}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
