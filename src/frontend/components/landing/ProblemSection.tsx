"use client";

import React from "react";
import { XCircle, CheckCircle2, Clock, AlertCircle, TrendingDown, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProblemSection() {
  return (
    <section className="py-24 bg-[#FAF8F5] dark:bg-[#050810]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2.5 block font-mono">
            THE CONVERSATIONAL BOTTLENECK
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white leading-tight mb-4">
            Sound familiar? <br />
            Customers text 24/7. Your team can&apos;t.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Every minute an inquiry sits unanswered, buyer intent drops by 80%. When your team finally logs in next morning,
            your customer has already purchased from a faster competitor.
          </p>
        </div>

        {/* Contrast Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Left: The Old Fragmented Way */}
          <div className="p-8 rounded-3xl border border-rose-200/90 dark:border-rose-950/80 bg-rose-50/40 dark:bg-rose-950/10 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 mb-6">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>The Manual Chaos</span>
              </div>
              <h3 className="text-xl font-bold text-[#111827] dark:text-slate-100 mb-4">
                Tired teams juggling 10 tabs with 8-hour delays
              </h3>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Midnight leads go cold:</strong>
                    High-intent buyers who message after 8 PM wait until next morning and bounce.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Repeated manual copy-paste:</strong>
                    Staff types the same pricing, return policy, and catalog answers 400 times a day.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Human errors &amp; missed DMs:</strong>
                    Viral video comments and Instagram story mentions get lost in crowded inboxes.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">High support headcount costs:</strong>
                    Hiring more agents to answer basic status requests drains operating margins.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-rose-200/60 dark:border-rose-900/40 text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>Avg Response Time: 4.5 Hours</span>
              <span>Conversion Rate: 2.1%</span>
            </div>
          </div>

          {/* Right: The QuickReply Autonomous Way */}
          <div className="p-8 rounded-3xl border border-emerald-200/90 dark:border-emerald-900/80 bg-emerald-50/40 dark:bg-emerald-950/10 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 mb-6">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>The QuickReply Way</span>
              </div>
              <h3 className="text-xl font-bold text-[#111827] dark:text-slate-100 mb-4">
                Instant &lt; 3-second replies trained on your exact business
              </h3>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Instant 24/7 lead conversion:</strong>
                    Answers within 2.5 seconds on WhatsApp &amp; Instagram, qualifying buyers while intent is peak.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Neural RAG precision:</strong>
                    Trained directly on your real catalog, live stock, and return rules. Never hallucinates.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Zero-dashboard autonomy:</strong>
                    The system operates in the background and sends 2-way approval alerts to the owner on WhatsApp.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#111827] dark:text-slate-100 block">Scales infinitely at ₹0 added headcount:</strong>
                    Handle 50,000 customer inquiries effortlessly during sales drops and product launches.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs font-mono text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Avg Response Time: &lt; 2.5 Seconds</span>
              <span>Conversion Rate: 14.8%</span>
            </div>
          </div>
        </div>

        {/* Section Action */}
        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors group"
          >
            <span>See how QuickReply automates your exact workflow</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
