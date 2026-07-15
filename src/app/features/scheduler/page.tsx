"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Instagram,
  Linkedin,
  Twitter,
  Send,
  Facebook,
  Layers,
  Zap,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { SchedulerCalendarMockup } from "@/frontend/components/landing/graphics/SchedulerCalendarMockup";

export default function SchedulerFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Multi-Network Social Scheduler
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              PLAN &amp; SCHEDULE <br />
              <span className="text-purple-600">EVERYWHERE</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Compose once. Our AI automatically adapts your caption, formatting, and hashtag strategy for Instagram, LinkedIn, X, Telegram, and Facebook — publishing at your audience&apos;s peak activity hours.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#E1D7FA] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Interactive 7-Day Social Calendar
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Click Any Day to Preview AI Copy Adaptation
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-purple-800 rounded-full border border-black/5">
                ⚡ Background Queue Worker Active
              </span>
            </div>

            <SchedulerCalendarMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Publish Smarter, Not Harder
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Eliminate manual copy-pasting across social apps with our specialized LLM fine-tuning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                AI Tone Adaptation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Transforms one creative concept into an emoji-rich Instagram caption, a thought-leadership LinkedIn post, and a viral X thread hook in milliseconds.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 5 Network Persona Modes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Optimal Hashtag Generation
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Peak Timing Prediction
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Our algorithm analyzes your audience engagement history and automatically recommends the highest converting publishing windows.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Timezone Smart Scheduling
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated Slot Queuing
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Instant Trigger Link Integration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Every scheduled post automatically configures the matching Comment-to-DM keyword trigger so you capture sales the moment it goes live.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automatic Trigger Sync
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Video &amp; Carousel Support
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Start Scheduling In Seconds
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Queue your first month of content with AI copy support. No credit card required.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-all shadow-lg"
              >
                <span>Try Social Scheduler Free</span>
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
