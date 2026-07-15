"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Clock,
  Zap,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  DollarSign,
  PieChart,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { AnalyticsROIGraph } from "@/frontend/components/landing/graphics/AnalyticsROIGraph";

export default function AnalyticsFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Direct Revenue Attribution Engine
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              REAL ANALYTICS, <br />
              <span className="text-[#EE7D60]">MEASURABLE ROI</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Track exactly how much revenue QuickReply generated, see response latency drop from 4.2 hours to 1.4 seconds, and watch comment-to-checkout conversion rates surge by +42.8%.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#F7E7BA] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Live ROI Performance Dashboard
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Interactive Revenue &amp; Latency Analytics
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-amber-800 rounded-full border border-black/5">
                ⚡ +68.4% Monthly Growth Attributed
              </span>
            </div>

            <AnalyticsROIGraph />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Data You Can Take To The Bank
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Every DM sent and link clicked is tracked end-to-end with UTM tagging and store webhook reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Direct Attributed GMV
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Unique checkout session IDs track every rupee earned from automated replies, giving you 100% indisputable ROI reporting.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Shopify Order Reconciliation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> UTM Parameter Injection
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Response Speed Benchmarking
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Compare your automated 1.4-second response speed against industry human agent averages to see how zero wait time eliminates dropped sales.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sub-2s Turnaround Guarantee
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 0% Lead Decay Rate
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Channel Volume Split
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Identify which social channels generate the highest conversion rates and customer satisfaction scores so you know where to invest ad spend.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instagram vs WhatsApp vs Telegram
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated CSV/PDF Exports
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Unlock Your Growth Metrics
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Start tracking automated revenue today. Zero configuration required.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#EE7D60] text-white font-bold text-sm hover:bg-[#E06C4F] transition-all shadow-lg"
              >
                <span>Get Started Free</span>
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
