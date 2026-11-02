"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export const COMPARISON_ROWS = [
  {
    feature: "Website chat",
    other: "The widget, and nothing else",
    ours: "Widget, plus Instagram and Facebook, from one AI",
  },
  {
    feature: "Install",
    other: "Developer, or a plugin per platform",
    ours: "One snippet, with install detection",
  },
  {
    feature: "Answers",
    other: "Generic model plus a help doc",
    ours: "Your catalog, your pages and your own Q&A",
  },
  {
    feature: "Prices",
    other: "Whatever it guesses",
    ours: "Your exact prices and stock",
  },
  {
    feature: "Product matching",
    other: "No catalog to match against",
    ours: "Map a product straight to the post — exact match, every time",
  },
  {
    feature: "Triggers",
    other: "Keyword only",
    ours: "Keyword — or reply to every comment",
  },
  {
    feature: "When it's not sure",
    other: "Guesses, or stays silent",
    ours: "Skips the reply and notifies your team instead",
  },
  {
    feature: "Human handover",
    other: "Not supported",
    ours: "Notified the moment AI is unsure — take over instantly",
  },
  {
    feature: "Campaigns",
    other: "Not included",
    ours: "Schedule & auto-publish, 6 platforms",
  },
  {
    feature: "Pricing",
    other: "Per seat, per month",
    ours: "1 credit = 1 AI reply, manual is free",
  },
];

/**
 * Strategic Dark Comparison Table matching mysampark.com frame_001
 * With high-craft mobile segmented toggle and desktop pop-out card
 */
export function DarkComparisonSection() {
  const [mobileTab, setMobileTab] = useState<"sideBySide" | "quickreply" | "others">("sideBySide");

  return (
    <section
      className="relative z-20 isolate mx-auto max-w-[1360px] overflow-x-clip px-4 sm:px-6 py-12 sm:py-20"
      style={{ overflowX: "clip" }}
      id="comparison"
    >
      <div className="rounded-[32px] sm:rounded-[36px] bg-[#161615] px-4 sm:px-8 md:px-16 py-14 sm:py-20 text-white shadow-2xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80">
            Why us
          </span>
          <h2 className="font-anton mt-5 text-4xl sm:text-5xl md:text-7xl tracking-tight text-[#F7F4EF] leading-[0.96]">
            NOT EVERY CHAT WIDGET ACTUALLY ANSWERS.
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-white/60 max-w-md mx-auto leading-relaxed">
            See how QuickReply replaces 4 separate subscriptions with one verified AI commerce engine.
          </p>
        </div>

        {/* Mobile View (< lg): High-Craft Segmented Card Layout */}
        <div className="mt-10 lg:hidden">
          <div className="flex justify-center mb-6">
            <div className="inline-flex max-w-full rounded-full bg-[#20201E] p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setMobileTab("sideBySide")}
                className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors ${
                  mobileTab === "sideBySide" ? "bg-white text-black shadow-xs" : "text-white/70 hover:text-white"
                }`}
              >
                Side by Side
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("quickreply")}
                className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors ${
                  mobileTab === "quickreply" ? "bg-[#EE7D60] text-white shadow-xs" : "text-white/70 hover:text-white"
                }`}
              >
                QuickReply
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("others")}
                className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors ${
                  mobileTab === "others" ? "bg-neutral-800 text-white shadow-xs" : "text-white/70 hover:text-white"
                }`}
              >
                <span className="inline sm:hidden">Others</span>
                <span className="hidden sm:inline">Other Widgets</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.feature}
                className="rounded-2xl border border-white/10 bg-[#20201E] p-4 text-xs space-y-2.5"
              >
                <div className="font-bold text-white text-sm border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>{row.feature}</span>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono">
                    Direct Comparison
                  </span>
                </div>

                {(mobileTab === "sideBySide" || mobileTab === "quickreply") && (
                  <div className="rounded-xl bg-[#FAF8F5] p-3 text-[#161615] flex items-start gap-2.5">
                    <span className="font-black text-emerald-600 shrink-0 text-sm">✓</span>
                    <div>
                      <span className="font-bold text-[10px] uppercase text-[#EE7D60] block tracking-wider">
                        QuickReply
                      </span>
                      <span className="font-semibold text-xs leading-snug">{row.ours}</span>
                    </div>
                  </div>
                )}

                {(mobileTab === "sideBySide" || mobileTab === "others") && (
                  <div className="rounded-xl bg-black/40 p-3 text-white/70 flex items-start gap-2.5 border border-white/5">
                    <span className="font-bold text-rose-400 shrink-0 text-xs">✕</span>
                    <div>
                      <span className="font-medium text-[10px] uppercase text-white/40 block tracking-wider">
                        Other Chat Widgets
                      </span>
                      <span className="text-xs leading-snug">{row.other}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View (>= lg): 3-Column Comparison Matrix matching mysampark.com frame_001 */}
        <div className="mx-auto mt-20 hidden lg:grid max-w-[1140px] grid-cols-12 items-stretch">
          {/* Col 1: What's included */}
          <div className="flex flex-col justify-between py-6 col-span-3">
            <div className="h-14 px-4 font-bold text-sm text-white flex items-center">
              What&apos;s included
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.feature}
                className="flex h-16 items-center border-t border-white/10 px-4 text-xs font-medium text-white/60"
              >
                {row.feature}
              </div>
            ))}
          </div>

          {/* Col 2: Other chat widgets */}
          <div className="flex flex-col justify-between rounded-l-2xl bg-[#20201E] py-6 col-span-4">
            <div className="h-14 px-6 font-bold text-sm text-white flex items-center">
              Other chat widgets
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.feature}
                className="flex h-16 items-center gap-3 border-t border-white/10 px-6 text-xs text-white/55"
              >
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span className="leading-snug">{row.other}</span>
              </div>
            ))}
          </div>

          {/* Col 3: Elevated Pop-Out Cream Card (QuickReply) */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            className="relative z-10 -my-6 flex flex-col justify-between rounded-[28px] bg-[#F7F4EF] py-8 text-[#161615] shadow-[0_28px_80px_rgba(0,0,0,0.45)] col-span-5"
          >
            <div className="flex h-14 items-center justify-center gap-2.5 px-8 font-black text-xl text-[#F05A28]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F05A28] text-xs font-bold text-white shadow-xs">
                ⚡
              </span>
              <span>QuickReply</span>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.feature}
                className="flex h-16 items-center gap-3 border-t border-black/[0.08] px-8 text-xs font-medium text-[#161615]"
              >
                <span className="font-extrabold text-emerald-600 shrink-0 text-sm">✓</span>
                <span className="leading-snug">{row.ours}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Pill Button with Circular Icon Badge */}
        <div className="mt-14 sm:mt-16 flex justify-center">
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-3 rounded-full bg-[#F7F4EF] p-1.5 pr-6 text-xs font-bold text-[#161615] transition-transform hover:scale-[1.03] shadow-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161615] text-white transition-transform group-hover:translate-x-0.5">
              →
            </span>
            <span>See all comparisons &amp; plans</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export const MySamparkComparison = DarkComparisonSection;
export default MySamparkComparison;
