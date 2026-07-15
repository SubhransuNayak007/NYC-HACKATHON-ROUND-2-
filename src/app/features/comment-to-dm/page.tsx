"use client";

import React from "react";
import Link from "next/link";
import {
  MessageCircle,
  Zap,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  Instagram,
  Facebook,
  ShoppingBag,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { CommentToDMMockup } from "@/frontend/components/landing/graphics/CommentToDMMockup";

export default function CommentToDMFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#EE7D60] animate-pulse" />
              Meta Official Partner Integration
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              COMMENT TO DM <br />
              <span className="text-[#EE7D60]">AUTOMATION</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              When high-intent customers comment &quot;price&quot;, &quot;link&quot;, or &quot;size&quot;, QuickReply answers publicly in 1.2s and delivers the exact product card and 1-click checkout directly to their DM inbox.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#FCD5D9] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Interactive Simulation
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Try Comment-to-DM in Real-Time
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-emerald-700 rounded-full border border-black/5">
                ⚡ Zero Latency Webhook Engine
              </span>
            </div>

            <CommentToDMMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Engineered for Conversions
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Built on official Meta Graph APIs with strict compliance, spam prevention, and zero rate-limit bans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Instagram className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Smart Keyword Trigger Engine
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Set unlimited fuzzy match trigger rules (&quot;price&quot;, &quot;cost&quot;, &quot;link&quot;, &quot;how much&quot;) with AI intent recognition that understands typos and slang.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-word regex matching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Negative keyword filters
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Dynamic 1-Click Product Cards
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                DMs automatically populate with high-resolution imagery, real-time inventory count, strikethrough MRP, and localized currency checkout tokens.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pre-applied coupon codes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Direct Shopify &amp; Razorpay links
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Safe Randomization &amp; Jitter
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Public comments use natural phrasing rotation and sub-second random human jitter to ensure strict compliance with Instagram community safety guidelines.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Meta compliant
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero account ban guarantee
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Ready to automate your social checkout?
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Connect your Instagram or Facebook page in 60 seconds. No credit card required.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#EE7D60] text-white font-bold text-sm hover:bg-[#E06C4F] transition-all shadow-lg"
              >
                <span>Start Free 14-Day Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MySamparkFooter />
    </div>
  );
}
