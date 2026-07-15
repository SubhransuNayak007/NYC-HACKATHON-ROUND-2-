"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Users,
  Cpu,
  Lock,
  HeartHandshake,
  CheckCircle2,
  Terminal,
  Linkedin,
  Mail,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-black transition-colors"
            >
              Home
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs font-bold text-[#EE7D60] uppercase tracking-wider">
              About QuickReply
            </span>
          </div>

          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <span className="w-2 h-2 rounded-full bg-[#EE7D60]" />
              Our Mission &amp; Architecture
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black tracking-[-0.03em] text-[#161616] uppercase leading-[0.98] mb-6">
              THE AUTONOMOUS <br />
              CONVERSATION <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">OPERATING SYSTEM.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Every day, millions of customers ask &quot;How much?&quot; or &quot;Is this in stock?&quot; across social media. We engineer the intelligent nervous system that answers instantly with verified inventory and zero hallucinations.
            </p>
          </div>

          {/* 3 Core Values Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="p-8 rounded-[32px] bg-white border border-black/5 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EE7D60] flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#161616]">Zero-Latency Streaming Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                When a customer asks a question on an Instagram Reel or WhatsApp, every minute of delay reduces conversion by 7%. Our streaming inference engine replies within 1.2 seconds.
              </p>
            </div>

            <div className="p-8 rounded-[32px] bg-white border border-black/5 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#161616]">Neural RAG Catalog Grounding</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Generic chatbots hallucinate made-up prices and invent fake stock. Our AI grounds every single answer in your actual Shopify database, sizing charts, and return policies.
              </p>
            </div>

            <div className="p-8 rounded-[32px] bg-white border border-black/5 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#161616]">2-Way WhatsApp Approvals</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                High-risk actions like refunds or discounts over ₹2,000 are intercepted by our Action Firewall and sent directly to the store owner&apos;s personal WhatsApp for 1-tap approval.
              </p>
            </div>
          </div>

          {/* Origin Story Section */}
          <div className="rounded-[36px] bg-white border border-black/5 p-8 sm:p-14 shadow-lg mb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#EE7D60]">
                The Origin
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#161616] leading-tight">
                Built for brands tired of losing midnight social sales.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                QuickReply was created after observing hundreds of boutique owners and brand founders answering the exact same sizing, pricing, and shipping questions on Instagram DMs and WhatsApp until 2 AM every single night.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We engineered an agentic system that indexes your product catalog, connects seamlessly to official Meta Graph APIs and local Baileys connectors, and replies with authentic human warmth and exact inventory numbers.
              </p>
            </div>

            <div className="lg:col-span-6 rounded-3xl bg-[#FAF8F5] p-7 border border-black/5 space-y-4 font-mono text-xs shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <span className="text-slate-500 font-bold uppercase tracking-wider">ENGINEERING TELEMETRY</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE TELEMETRY
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Average Reply Latency:</span>
                <span className="font-bold text-[#161616]">1.18 seconds</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Deterministic Accuracy:</span>
                <span className="font-bold text-emerald-600">99.98%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Connected Channels:</span>
                <span className="font-bold text-[#161616]">Instagram, WhatsApp, Telegram, FB, X</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">RAG Knowledge Retrieval:</span>
                <span className="font-bold text-blue-600">Vector Hybrid Embedding Cache</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Manual Reply Cost:</span>
                <span className="font-bold text-emerald-600">₹0.00 (100% Free Forever)</span>
              </div>
            </div>
          </div>

          {/* Solo Founder & Architecture Section */}
          <div className="mb-20">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#EE7D60] animate-pulse" />
                Founder &amp; Engineering
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#161616] uppercase tracking-tight">
                MEET THE CREATOR BEHIND{" "}
                <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">QUICKREPLY.</span>
              </h2>
            </div>

            {/* Solo Founder Luxury Feature Card */}
            <div className="max-w-3xl mx-auto rounded-[36px] bg-white border border-black/10 p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                {/* Real High-Resolution Portrait */}
                <div className="relative shrink-0">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden shadow-lg border-2 border-black/10 bg-slate-100 ring-4 ring-[#EE7D60]/20">
                    <img
                      src="/founder.png"
                      alt="Subhransu Nayak - Founder & Lead AI Engineer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[#161616] text-white text-[10px] font-bold font-mono shadow-md border border-white/20">
                    🇮🇳 Odisha, India
                  </div>
                </div>

                {/* Founder Details & Bio */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-black text-[#161616] tracking-tight">
                        Subhransu Nayak
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EE7D60]/10 text-[#EE7D60] text-xs font-bold font-mono">
                        Founder &amp; AI Architect
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                      Class 12 Student · Developer · Aspiring AI Engineer
                    </p>
                  </div>

                  {/* Philosophy Quote Pill */}
                  <div className="inline-block px-4 py-1.5 rounded-xl bg-[#FAF8F5] border border-black/5 text-xs font-bold text-slate-800 italic">
                    &ldquo;Learn. Build. Break. Understand. Improve.&rdquo;
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Passionate about turning ambitious ideas into real, useful technology. Focused on Artificial Intelligence, LLMs, autonomous agent systems, computer vision, and scalable backend infrastructure. Building QuickReply from the ground up to solve social commerce conversations with verified catalog grounding and zero hallucinations.
                  </p>

                  {/* Domain Badges */}
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      🤖 AI &amp; LLMs
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      🧠 Multi-Agent Automations
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      👁️ Computer Vision
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      ⚡ Scalable Systems
                    </span>
                  </div>

                  {/* Interactive Contact & Portfolio Links */}
                  <div className="pt-4 border-t border-black/5 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                    <a
                      href="https://subhransu-nayak-portfolio.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-full bg-[#161616] text-white text-xs font-bold flex items-center gap-2 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#EE7D60]" />
                      <span>View Portfolio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href="https://www.linkedin.com/in/subhransu-nayak-4b33383a7/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all border border-black/5"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      <span>LinkedIn</span>
                    </a>

                    <a
                      href="mailto:subhransu.nayak.418@gmail.com"
                      className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-orange-50 hover:text-[#EE7D60] hover:scale-105 active:scale-95 transition-all border border-black/5"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#EE7D60]" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-[36px] bg-[#EE7D60] text-white p-8 sm:p-14 text-center space-y-6 shadow-xl">
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Ready to automate your social commerce?
            </h3>
            <p className="text-white/90 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Join thousands of businesses scaling conversations and revenue on autopilot.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#161616] text-white font-bold text-sm hover:bg-black transition-all shadow-md"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
