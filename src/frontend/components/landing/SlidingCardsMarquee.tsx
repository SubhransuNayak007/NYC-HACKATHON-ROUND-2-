"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Zap } from "lucide-react";

export interface SlidingCardItem {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  metrics: string;
  inbound: string;
  aiReply: string;
  latency: string;
}

export const TOP_ROW_WORKFLOWS: SlidingCardItem[] = [
  {
    id: "wf-1",
    tag: "INSTAGRAM AUTO-DM",
    tagColor: "text-rose-700 bg-rose-100",
    title: "Reel Comment to Direct Sale",
    subtitle: "Detects 'price please' comments and sends link in DM instantly.",
    metrics: "98% DM Delivery",
    inbound: "Comment on Reel: 'Where can I get this exact look?'",
    aiReply: "Sent VIP checkout link + 15% festival code to @maya_fashion's DM.",
    latency: "1.8s",
  },
  {
    id: "wf-2",
    tag: "NEURAL RAG BRAIN",
    tagColor: "text-amber-700 bg-amber-100",
    title: "Zero-Hallucination Knowledge",
    subtitle: "Answers from your verified catalog, PDF policies, and inventory.",
    metrics: "100% Accuracy",
    inbound: "What is your replacement warranty on water damage?",
    aiReply: "Our 2-year warranty covers manufacturing defects. Accidental water damage has 50% repair subsidy.",
    latency: "1.1s",
  },
  {
    id: "wf-3",
    tag: "YOUTUBE MONITOR",
    tagColor: "text-red-700 bg-red-100",
    title: "24/7 Creator Video Replies",
    subtitle: "Monitors 50+ video comment sections in authentic creator voice.",
    metrics: "3,200 Replies/day",
    inbound: "Which microphone did you use at 04:15?",
    aiReply: "That's the Shure SM7B into a Scarlett 2i2 interface! Full gear link in description.",
    latency: "2.1s",
  },
  {
    id: "wf-4",
    tag: "WHATSAPP COMMERCE",
    tagColor: "text-emerald-700 bg-emerald-100",
    title: "Instant Catalog & Order Booking",
    subtitle: "Qualifies buyers and quotes exact stock within 2 seconds.",
    metrics: "Conversion +42%",
    inbound: "Do you have the Black Velvet Dress in size M in stock?",
    aiReply: "Yes! 4 units left in size M at ₹2,899. Would you like free express delivery?",
    latency: "1.4s",
  },
  {
    id: "wf-5",
    tag: "ACTION FIREWALL",
    tagColor: "text-blue-700 bg-blue-100",
    title: "Safe Autonomous Operations",
    subtitle: "High-risk refunds and discounts require human one-click authorization.",
    metrics: "Zero Leakage",
    inbound: "Customer requests 50% refund on unboxed item.",
    aiReply: "Flagged as HIGH-RISK. Approval request dispatched to manager dashboard.",
    latency: "0.8s",
  },
];

export const BOTTOM_ROW_WORKFLOWS: SlidingCardItem[] = [
  {
    id: "wf-6",
    tag: "AFFILIATE ENGINE",
    tagColor: "text-pink-700 bg-pink-100",
    title: "Turn Customers Into Sales Partners",
    subtitle: "Automated commission tracking, payouts, and custom link generation.",
    metrics: "3.4x Partner Sales",
    inbound: "Creator joins brand affiliate program via WhatsApp link.",
    aiReply: "Unique coupon code 'SARAH10' generated. 10% commission tracking active.",
    latency: "1.3s",
  },
  {
    id: "wf-7",
    tag: "OMNICHANNEL INBOX",
    tagColor: "text-purple-700 bg-purple-100",
    title: "Single Screen Multi-Channel Queue",
    subtitle: "All conversations from 5 platforms in one unified stream.",
    metrics: "0 Missed DMs",
    inbound: "Inbound message from WhatsApp (+91 98450...) and Telegram (@tech_buyer)",
    aiReply: "Unified in single chronological queue with AI Copilot pre-drafted replies.",
    latency: "1.2s",
  },
  {
    id: "wf-8",
    tag: "AUTO-SCHEDULING",
    tagColor: "text-cyan-700 bg-cyan-100",
    title: "Algorithmic Optimal Timing",
    subtitle: "Dispatches posts across Meta, LinkedIn & X at audience peak engagement.",
    metrics: "+38% Organic Reach",
    inbound: "Queued Campaign: 'Summer Linen Festive Collection'",
    aiReply: "Optimal dispatch scheduled for 18:45 IST based on past 90-day follower metrics.",
    latency: "Instant",
  },
  {
    id: "wf-9",
    tag: "LIVE WEB WIDGET",
    tagColor: "text-indigo-700 bg-indigo-100",
    title: "1-Line Embed Storefront Concierge",
    subtitle: "Answers sizing and stock queries directly on your checkout pages.",
    metrics: "28% Cart Saves",
    inbound: "User hesitating at checkout: 'Does this run small?'",
    aiReply: "True to size! We recommend M for a relaxed fit with our 7-day exchange guarantee.",
    latency: "0.9s",
  },
];

function WorkflowCardContent({ item }: { item: SlidingCardItem }) {
  return (
    <div className="flex flex-col justify-between h-full select-none text-left">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${item.tagColor}`}
          >
            {item.tag}
          </span>
          <span className="text-[11px] font-mono text-slate-600 font-bold bg-black/[0.04] px-2.5 py-0.5 rounded-full">
            {item.metrics}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-black text-[#18181B] tracking-tight leading-snug">
          {item.title}
        </h3>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
          {item.subtitle}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-black/5 space-y-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-black/5 text-[#18181B] font-medium leading-tight">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            Customer
          </span>
          {item.inbound}
        </div>

        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-black/5 text-[#18181B] font-medium leading-tight flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#EE7D60] block mb-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" /> QuickReply AI
            </span>
            {item.aiReply}
          </div>
          <span className="text-[9px] font-mono text-emerald-600 font-bold shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            {item.latency}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dual-Row Left-to-Right Scroll Track (00:14–00:15 — AUTONOMOUS WORKFLOW SUITE)
 * Glides Row 1 Left-to-Right and Row 2 Right-to-Left as user scrolls
 */
export function BidirectionalWorkflowTrack({
  topRowCards,
  bottomRowCards,
}: {
  topRowCards: React.ReactNode[];
  bottomRowCards: React.ReactNode[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.4,
  });

  // Top Row: Symmetrical bounded parallax glide (centered at 0% scroll midpoint)
  const xLeftToRight = useTransform(smoothScroll, [0, 1], ["2%", "-2%"], { clamp: true });
  // Bottom Row: Symmetric counter-parallax bounded drift
  const xRightToLeft = useTransform(smoothScroll, [0, 1], ["-2%", "2%"], { clamp: true });

  return (
    <section ref={sectionRef} className="overflow-hidden bg-[#FAF8F5] py-28 relative">
      <div className="mx-auto mb-16 max-w-4xl text-center px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1 text-[11px] font-bold tracking-[0.14em] uppercase">
          ⚡ AUTONOMOUS WORKFLOW SUITE
        </span>
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-[54px] font-black tracking-tight text-[#18181B] uppercase md:leading-[1.08]">
          EVERYTHING YOUR COMMERCE BUSINESS NEEDS. RUNNING 24/7 ON AUTOPILOT.
        </h2>
        <p className="mt-4 text-base text-black/60 max-w-2xl mx-auto font-medium">
          Explore real-time workflows powered by QuickReply&apos;s Neural Knowledge Base &amp; Autonomous Multi-Channel Engine.
        </p>
      </div>

      {/* Mobile View: Clean Vertical Stack (< md) with zero horizontal transforms */}
      <div className="flex flex-col gap-4 px-4 md:hidden">
        {[...topRowCards, ...bottomRowCards].map((card, i) => (
          <div
            key={i}
            className="w-full rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm"
          >
            {card}
          </div>
        ))}
      </div>

      {/* Desktop View: Dual-Row Bounded Parallax (>= md) */}
      <div className="hidden md:block">
        {/* Row 1: Left-to-Right Scroll Glide */}
        <motion.div
          style={{ x: xLeftToRight }}
          className="mb-7 flex gap-6 px-8 md:pl-20 md:pr-12 will-change-transform"
        >
          {topRowCards.map((card, i) => (
            <div
              key={i}
              className="w-[380px] sm:w-[410px] shrink-0 rounded-[26px] border border-black/[0.07] bg-white p-7 shadow-[0_12px_36px_rgba(0,0,0,0.03)] transition-transform duration-300 hover:-translate-y-1.5"
            >
              {card}
            </div>
          ))}
        </motion.div>

        {/* Row 2: Counter-Direction Glide */}
        <motion.div
          style={{ x: xRightToLeft }}
          className="flex gap-6 px-8 md:pl-20 md:pr-12 will-change-transform"
        >
          {bottomRowCards.map((card, i) => (
            <div
              key={i}
              className="w-[380px] sm:w-[410px] shrink-0 rounded-[26px] border border-black/[0.07] bg-white p-7 shadow-[0_12px_36px_rgba(0,0,0,0.03)] transition-transform duration-300 hover:-translate-y-1.5"
            >
              {card}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Left and Right Fade Gradients: subtle width on desktop only, completely hidden on mobile */}
      <div className="hidden md:block pointer-events-none absolute inset-y-0 left-0 w-12 lg:w-20 bg-gradient-to-r from-[#FAF8F5] to-transparent z-10" />
      <div className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-12 lg:w-20 bg-gradient-to-l from-[#FAF8F5] to-transparent z-10" />
    </section>
  );
}

export function SlidingCardsMarquee() {
  const topCards = TOP_ROW_WORKFLOWS.map((item) => (
    <WorkflowCardContent key={item.id} item={item} />
  ));
  const bottomCards = BOTTOM_ROW_WORKFLOWS.map((item) => (
    <WorkflowCardContent key={item.id} item={item} />
  ));

  return (
    <BidirectionalWorkflowTrack
      topRowCards={topCards}
      bottomRowCards={bottomCards}
    />
  );
}

export default SlidingCardsMarquee;
