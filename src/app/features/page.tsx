"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Zap,
  MessageCircle,
  Database,
  Calendar,
  TrendingUp,
  Award,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Layers,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import {
  CommentToDMMockup,
  CatalogRAGMockup,
  UnifiedInboxMockup,
  SchedulerCalendarMockup,
  AnalyticsROIGraph,
  PartnerLeaderboardMockup,
  StorefrontWidgetMockup,
} from "@/frontend/components/landing/graphics";

const FEATURES_LIST = [
  {
    id: "comment-to-dm",
    title: "Comment to DM Automation",
    badge: "01 / INSTANT SALES",
    desc: "Convert high-intent social comments into immediate private DM checkout links with real-time stock verification.",
    component: <CommentToDMMockup />,
    href: "/features/comment-to-dm",
    color: "#FCD5D9",
  },
  {
    id: "catalog-rag",
    title: "AI Product Knowledge Base",
    badge: "02 / ZERO HALLUCINATION",
    desc: "Live vector semantic retrieval grounded in your Shopify or CSV catalog. Exact stock, sizes, and pricing verified in 18ms.",
    component: <CatalogRAGMockup />,
    href: "/features/catalog-rag",
    color: "#D4EAF7",
  },
  {
    id: "unified-inbox",
    title: "Unified Multi-Channel Inbox",
    badge: "03 / ALL CHANNELS",
    desc: "Streamline WhatsApp, Instagram, Telegram, LinkedIn, and X conversations into a single AI-assisted dashboard.",
    component: <UnifiedInboxMockup />,
    href: "/features/unified-inbox",
    color: "#D6EFE5",
  },
  {
    id: "scheduler",
    title: "Multi-Channel Scheduler",
    badge: "04 / SOCIAL PIPELINE",
    desc: "Compose once and let AI tailor copy, format, and hashtags across all networks with peak engagement timing.",
    component: <SchedulerCalendarMockup />,
    href: "/features/scheduler",
    color: "#E1D7FA",
  },
  {
    id: "analytics",
    title: "Conversion & Revenue ROI",
    badge: "05 / PERFORMANCE",
    desc: "Real-time revenue attribution, response latency benchmarks (1.4s vs 4.2h), and channel volume breakdown.",
    component: <AnalyticsROIGraph />,
    href: "/features/analytics",
    color: "#F7E7BA",
  },
  {
    id: "partner-marketing",
    title: "Partner & Affiliate Engine",
    badge: "06 / CREATOR REVENUE",
    desc: "Generate branded referral codes, track affiliate GMV, and automate creator payouts with zero manual calculation.",
    component: <PartnerLeaderboardMockup />,
    href: "/features/partner-marketing",
    color: "#FFE4D6",
  },
  {
    id: "storefront-widget",
    title: "Storefront AI Sales Agent",
    badge: "07 / WEB CONCIERGE",
    desc: "Embed an intelligent 24/7 shopping assistant on your website with live recommendations and 1-click WhatsApp transfer.",
    component: <StorefrontWidgetMockup />,
    href: "/features/storefront-widget",
    color: "#E0EEDC",
  },
];

export default function FeaturesOverviewPage() {
  const [activeTab, setActiveTab] = useState<string>("comment-to-dm");

  const currentFeature =
    FEATURES_LIST.find((f) => f.id === activeTab) || FEATURES_LIST[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        {/* Top Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
            <span className="w-2 h-2 rounded-full bg-[#EE7D60] animate-pulse" />
            Complete Feature Capabilities
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
            BUILT FOR SPEED. <br />
            <span className="text-[#EE7D60]">DESIGNED FOR SALES.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            Explore the 7 interactive modules that turn organic social attention into revenue on autopilot.
          </p>

          {/* Feature Navigation Pill Carousel */}
          <div className="flex items-center justify-center gap-2 mt-8 overflow-x-auto no-scrollbar py-2">
            {FEATURES_LIST.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveTab(f.id)}
                className={`px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                  activeTab === f.id
                    ? "bg-[#161616] text-white shadow-md scale-105"
                    : "bg-white text-slate-700 border border-black/5 hover:bg-slate-100"
                }`}
              >
                {f.title}
              </button>
            ))}
          </div>
        </section>

        {/* Active Featured Graphic Component Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            key={currentFeature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-[36px] p-6 sm:p-10 lg:p-14 shadow-2xl border border-black/8"
            style={{ backgroundColor: currentFeature.color }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <span className="px-3 py-1 rounded-full bg-white/90 text-[11px] font-mono font-black text-[#161616] shadow-2xs">
                  {currentFeature.badge}
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#161616] leading-tight">
                  {currentFeature.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                  {currentFeature.desc}
                </p>

                <div className="pt-2">
                  <Link
                    href={currentFeature.href}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-white bg-[#161616] px-5 py-2.5 rounded-full shadow-md hover:bg-black transition-all group"
                  >
                    <span>Read Deep Dive Documentation</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#EE7D60]" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                {currentFeature.component}
              </div>
            </div>
          </motion.div>
        </section>

        {/* 7 Interactive Feature Cards Grid */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#161616]">
              All 7 Engine Modules At A Glance
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Every card is interactive. Click to test workflows, vector queries, calendar scheduling, and SVG graphs.
            </p>
          </div>

          <div className="space-y-12">
            {FEATURES_LIST.map((feat) => (
              <div
                key={feat.id}
                id={feat.id}
                className="rounded-[32px] p-6 sm:p-10 border border-black/8 shadow-xl space-y-6"
                style={{ backgroundColor: feat.color }}
              >
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-black/5">
                  <div>
                    <span className="text-xs font-mono font-black text-[#EE7D60] uppercase">
                      {feat.badge}
                    </span>
                    <h4 className="text-2xl sm:text-3xl font-black text-[#161616]">
                      {feat.title}
                    </h4>
                  </div>
                  <Link
                    href={feat.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-xs font-bold text-[#161616] shadow-2xs hover:bg-[#161616] hover:text-white transition-all group"
                  >
                    <span>Dedicated Guide &rarr;</span>
                  </Link>
                </div>

                <div>{feat.component}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MySamparkFooter />
    </div>
  );
}
