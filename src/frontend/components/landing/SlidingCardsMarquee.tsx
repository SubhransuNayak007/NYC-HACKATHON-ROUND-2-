"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Instagram,
  Youtube,
  Send,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Layers,
} from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

interface SlidingCard {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  badge: string;
  metrics: string;
  platform: "whatsapp" | "instagram" | "youtube" | "system";
  snippet: {
    inbound: string;
    aiReply: string;
    latency: string;
  };
}

const TOP_ROW_CARDS: SlidingCard[] = [
  {
    id: "sc-1",
    tag: "WHATSAPP COMMERCE",
    tagColor: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300",
    title: "Instant Catalog & Order Booking",
    subtitle: "Qualifies buyers and quotes exact stock within 2 seconds.",
    badge: "Baileys Web & Cloud API",
    metrics: "Conversion +42%",
    platform: "whatsapp",
    snippet: {
      inbound: "Do you have the Black Velvet Dress in size M in stock?",
      aiReply: "Yes! 4 units left in size M at ₹2,899. Would you like free express delivery?",
      latency: "1.4s",
    },
  },
  {
    id: "sc-2",
    tag: "INSTAGRAM AUTO-DM",
    tagColor: "text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300",
    title: "Reel Comment to Direct Sale",
    subtitle: "Detects 'price please' comments and sends link in DM instantly.",
    badge: "Graph API v21",
    metrics: "98% DM Delivery",
    platform: "instagram",
    snippet: {
      inbound: "Comment on Reel: 'Where can I get this exact look?'",
      aiReply: "Sent VIP checkout link + 15% festival code to @maya_fashion's DM.",
      latency: "1.8s",
    },
  },
  {
    id: "sc-3",
    tag: "NEURAL RAG BRAIN",
    tagColor: "text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300",
    title: "Zero-Hallucination Knowledge",
    subtitle: "Answers from your verified catalog, PDF policies, and inventory.",
    badge: "Deterministic AI",
    metrics: "100% Accuracy",
    platform: "system",
    snippet: {
      inbound: "What is your replacement warranty on water damage?",
      aiReply: "Our 2-year warranty covers all manufacturing defects. Accidental water damage has 50% repair subsidy.",
      latency: "1.1s",
    },
  },
  {
    id: "sc-4",
    tag: "YOUTUBE MONITOR",
    tagColor: "text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300",
    title: "24/7 Creator Video Replies",
    subtitle: "Monitors 50+ video comment sections in authentic creator voice.",
    badge: "Data API v3",
    metrics: "3,200 Replies/day",
    platform: "youtube",
    snippet: {
      inbound: "Which microphone did you use at 04:15?",
      aiReply: "That's the Shure SM7B into a Scarlett 2i2 interface! Full gear link in description.",
      latency: "2.1s",
    },
  },
  {
    id: "sc-5",
    tag: "ACTION FIREWALL",
    tagColor: "text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300",
    title: "Safe Autonomous Operations",
    subtitle: "High-risk refunds and discounts require human one-click authorization.",
    badge: "Deterministic Sandbox",
    metrics: "Zero Leakage",
    platform: "system",
    snippet: {
      inbound: "Customer requests 50% refund on unboxed item.",
      aiReply: "Flagged as HIGH-RISK. Approval request dispatched to manager dashboard.",
      latency: "0.8s",
    },
  },
];

const BOTTOM_ROW_CARDS: SlidingCard[] = [
  {
    id: "sc-6",
    tag: "OMNICHANNEL INBOX",
    tagColor: "text-purple-700 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300",
    title: "Single Screen Multi-Channel Queue",
    subtitle: "All conversations from 6 platforms in one unified stream.",
    badge: "Realtime WebSockets",
    metrics: "0 Missed DMs",
    platform: "system",
    snippet: {
      inbound: "Inbound message from WhatsApp (+91 98450...) and Telegram (@tech_buyer)",
      aiReply: "Unified in single chronological queue with AI Copilot pre-drafted replies.",
      latency: "1.2s",
    },
  },
  {
    id: "sc-7",
    tag: "AUTO-SCHEDULING",
    tagColor: "text-cyan-700 bg-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300",
    title: "Algorithmic Optimal Timing",
    subtitle: "Dispatches posts across Meta, LinkedIn & X at audience peak engagement.",
    badge: "Native REST APIs",
    metrics: "+38% Organic Reach",
    platform: "system",
    snippet: {
      inbound: "Queued Campaign: 'Summer Linen Festive Collection'",
      aiReply: "Optimal dispatch scheduled for 18:45 IST based on past 90-day follower metrics.",
      latency: "Instant",
    },
  },
  {
    id: "sc-8",
    tag: "LIVE WEB WIDGET",
    tagColor: "text-indigo-700 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300",
    title: "1-Line Embed Storefront Concierge",
    subtitle: "Answers sizing and stock queries directly on your checkout pages.",
    badge: "Lightweight Script",
    metrics: "28% Cart Saves",
    platform: "system",
    snippet: {
      inbound: "User hesitating at checkout: 'Does this run small?'",
      aiReply: "True to size! We recommend M for a relaxed fit with our 7-day exchange guarantee.",
      latency: "0.9s",
    },
  },
  {
    id: "sc-9",
    tag: "AFFILIATE ENGINE",
    tagColor: "text-pink-700 bg-pink-100 dark:bg-pink-950/60 dark:text-pink-300",
    title: "Turn Customers Into Sales Partners",
    subtitle: "Automated commission tracking, payouts, and custom link generation.",
    badge: "Partner Portal",
    metrics: "3.4x Partner Sales",
    platform: "system",
    snippet: {
      inbound: "Creator joins brand affiliate program via WhatsApp link.",
      aiReply: "Unique coupon code 'SARAH10' generated. 10% commission tracking active.",
      latency: "1.3s",
    },
  },
];

export function SlidingCardsMarquee() {
  const renderCard = (card: SlidingCard) => {
    return (
      <motion.div
        key={card.id}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        transition={appleSpring}
        className="w-[340px] sm:w-[380px] shrink-0 rounded-[28px] bg-white border border-black/8 p-5 shadow-sm text-left flex flex-col justify-between select-none cursor-pointer transition-shadow hover:shadow-lg"
      >
        <div>
          {/* Top Pill & Platform Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${card.tagColor}`}
            >
              {card.tag}
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full">
              {card.metrics}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#161616] tracking-tight leading-snug">
            {card.title}
          </h3>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
            {card.subtitle}
          </p>
        </div>

        {/* Live Conversation Simulation snippet */}
        <div className="mt-4 pt-3 border-t border-black/5 space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-black/5 text-[#161616] font-medium leading-tight">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Customer
            </span>
            {card.snippet.inbound}
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-black/5 text-[#161616] font-medium leading-tight flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#EE7D60] block mb-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> QuickReply AI
              </span>
              {card.snippet.aiReply}
            </div>
            <span className="text-[9px] font-mono text-emerald-600 font-bold shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {card.snippet.latency}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <section className="py-24 overflow-hidden bg-[#F5F6F0] border-t border-black/5 relative">
      {/* Editorial Header */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/5 text-xs font-semibold text-[#161616] shadow-2xs mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#EE7D60] fill-current" />
          <span>AUTONOMOUS WORKFLOW SUITE</span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#161616] uppercase leading-none">
          Everything your commerce business needs. <br className="hidden sm:inline" />
          Running 24/7 on autopilot.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
          Explore real-time workflows powered by QuickReply&apos;s Neural Knowledge Base &amp; Autonomous Multi-Channel Engine.
        </p>
      </div>

      {/* Sliding Marquee Styles */}
      <style>{`
        @keyframes marquee-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes marquee-right {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-marquee-left {
          display: flex;
          width: max-content;
          animation: marquee-left 40s linear infinite;
          will-change: transform;
        }
        .animate-marquee-right {
          display: flex;
          width: max-content;
          animation: marquee-right 40s linear infinite;
          will-change: transform;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Top Flowing Marquee Track (Left) */}
      <div className="relative w-full mb-6">
        <div className="animate-marquee-left gap-6 px-3">
          {TOP_ROW_CARDS.map(renderCard)}
          {TOP_ROW_CARDS.map((c) => renderCard({ ...c, id: `${c.id}-dup` }))}
        </div>
      </div>

      {/* Bottom Flowing Marquee Track (Right) */}
      <div className="relative w-full">
        <div className="animate-marquee-right gap-6 px-3">
          {BOTTOM_ROW_CARDS.map(renderCard)}
          {BOTTOM_ROW_CARDS.map((c) => renderCard({ ...c, id: `${c.id}-dup` }))}
        </div>
      </div>

      {/* Left and Right Fade Gradients */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-44 bg-gradient-to-r from-[#F5F6F0] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-44 bg-gradient-to-l from-[#F5F6F0] to-transparent z-10" />
    </section>
  );
}
