"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Users,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Share2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { PartnerLeaderboardMockup } from "@/frontend/components/landing/graphics/PartnerLeaderboardMockup";

export default function PartnerMarketingFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Creator Affiliate &amp; Referral OS
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              TURN CUSTOMERS INTO <br />
              <span className="text-[#EE7D60]">BRAND PARTNERS</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Generate custom coupon codes and trackable links for influencers and VIP customers in 5 seconds. Let creator networks drive recurring sales with automatic commission payouts.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#FFE4D6] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Creator Leaderboard &amp; Link Engine
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Live Commission Payout Tracker
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-orange-800 rounded-full border border-black/5">
                ⚡ 8.4x Average Creator ROI
              </span>
            </div>

            <PartnerLeaderboardMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Scalable Word-of-Mouth Engine
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Everything you need to run high-performing affiliate programs without clunky third-party software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#EE7D60] flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Instant Branded Coupon Codes
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Create unique, personalized creator discount codes (e.g. RIYA15, AMAN10) that automatically sync across Shopify, WooCommerce, and payment gateways.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-tier commission rules
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Expiration dates &amp; minimum spend
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Transparent Creator Portals
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Give your creators a clean, branded portal to track their sales count, conversion metrics, pending balances, and historical payout records in real time.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time order tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero manual spreadsheets
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Automated Bank Payouts
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Distribute monthly commission payments directly to creator bank accounts via automated UPI, RazorpayX, or Stripe Connected Accounts.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> TDS / Tax Compliance
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1-Click Batch Disbursals
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Launch Your Creator Program
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Start onboarding your first 10 creator partners in under 5 minutes.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#EE7D60] text-white font-bold text-sm hover:bg-[#E06C4F] transition-all shadow-lg"
              >
                <span>Create Partner Program Free</span>
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
