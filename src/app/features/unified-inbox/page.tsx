"use client";

import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Zap,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Send,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Users,
  Filter,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { UnifiedInboxMockup } from "@/frontend/components/landing/graphics/UnifiedInboxMockup";

export default function UnifiedInboxFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Omnichannel Conversation OS
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              UNIFIED MULTI-CHANNEL <br />
              <span className="text-emerald-600">INBOX</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Stop switching between 5 different apps. Bring WhatsApp Business, Instagram DMs, Telegram, LinkedIn, and X messages into one calm, AI-assisted command dashboard.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#D6EFE5] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Live Inbox Stream
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Real-Time Omnichannel Triage
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-emerald-700 rounded-full border border-black/5">
                ⚡ 450ms Average Latency
              </span>
            </div>

            <UnifiedInboxMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              One Command Center. Zero Missed Leads.
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Every message is parsed for purchase intent, tagged by sentiment, and routed for instant response.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                AI Sentiment &amp; VIP Routing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                High-ticket wholesale inquiries and VIP repeat customers are automatically tagged and prioritized at the top of your inbox.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Intent score 0-100%
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated tagging
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Generative AI Suggested Replies
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Our RAG copilot pre-drafts contextual responses grounded in your store catalog. Approve in 1-click or let AI run fully autonomous.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1-Click Approve Mode
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Full Autonomous Autopilot
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Seamless Human Handoff
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                When a complex negotiation or custom order arises, the AI flags the chat and seamlessly transfers control to human team members with full transcript history.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Agent Notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Agent Assignment
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Unify Your Channels Today
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Start free. Connect WhatsApp, Instagram, and Telegram in under 2 minutes.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg"
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
