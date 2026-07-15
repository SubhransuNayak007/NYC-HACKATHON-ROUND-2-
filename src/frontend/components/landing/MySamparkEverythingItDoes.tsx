"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  CommentToDMMockup,
  CatalogRAGMockup,
  UnifiedInboxMockup,
  SchedulerCalendarMockup,
  AnalyticsROIGraph,
  PartnerLeaderboardMockup,
  StorefrontWidgetMockup,
} from "./graphics";
import {
  heavyCardSpring,
  appleSpring,
  tactileButtonTap,
} from "@/frontend/lib/physicsMotion";
import { FlipButton } from "./FlipButton";

interface FeatureCardData {
  number: string;
  isAccentNumber?: boolean;
  category: string;
  title: string;
  description: string;
  bgColor: string;
  href: string;
  pills: string[];
  ctaText: string;
  mockup: React.ReactNode;
}

const FEATURE_CARDS: FeatureCardData[] = [
  {
    number: "01",
    isAccentNumber: true,
    category: "Instagram & Facebook Automation",
    title: "Comment to DM, automatically",
    description:
      'Someone comments "price" or "link" and QuickReply instantly answers publicly, then sends a private DM with the exact product, real-time inventory, and 1-click checkout.',
    bgColor: "#FFFFFF", // 01/07: Pure White with pink accent
    href: "/features/auto-dm",
    pills: ["Keyword Triggers", "Public Reply + Instant DM", "Live Product Cards", "1.2s Turnaround"],
    ctaText: "Explore Comment to DM",
    mockup: <CommentToDMMockup />,
  },
  {
    number: "02",
    category: "AI Product Knowledge Base",
    title: "Answers that come from your catalog",
    description:
      "Connect your Shopify store or upload your catalog CSV once. Price, size, stock, return policies, and shipping timelines get answered with 100% verified facts instead of AI hallucinations.",
    bgColor: "#7FE8E3", // 02/07: Authentic Turquoise
    href: "/features/knowledge-base",
    pills: ["Real Stock & Sizing", "Zero AI Hallucinations", "Multi-Currency Ready", "Shopify & CSV Sync"],
    ctaText: "Explore Catalog AI",
    mockup: <CatalogRAGMockup />,
  },
  {
    number: "03",
    category: "Automated Outreach & Campaigns",
    title: "Campaigns that turn followers into buyers",
    description:
      "Re-engage high-intent commenters, send WhatsApp flash-sale drops, and turn casual profile visitors into paying repeat customers with targeted interactive message sequences.",
    bgColor: "#52DAC6", // 03/07: Authentic Mint
    href: "/features/campaigns",
    pills: ["Targeted Broadcasts", "Abandoned DM Recovery", "WhatsApp Flow Funnels", "Flash Drop Triggers"],
    ctaText: "Explore Campaigns",
    mockup: <AnalyticsROIGraph />,
  },
  {
    number: "04",
    category: "Multi-Channel Scheduler & AI Publisher",
    title: "Write once, post everywhere",
    description:
      "Compose once with tailored copy adaptation for Instagram, Facebook, LinkedIn, Telegram, and X. Set publishing dates and let our background worker post automatically.",
    bgColor: "#FBF380", // 04/07: Authentic Pastel Yellow
    href: "/features/campaigns",
    pills: ["Cross-Platform Queue", "AI Caption Adaptation", "Optimal Timing Engine", "Visual Asset Preview"],
    ctaText: "Explore Scheduler",
    mockup: <SchedulerCalendarMockup />,
  },
  {
    number: "05",
    category: "Unified Omnichannel Inbox",
    title: "One inbox for every conversation",
    description:
      "Instagram DMs, WhatsApp Business, Telegram Bot messages, LinkedIn discussions, and Facebook inquiries all stream into one clean command center.",
    bgColor: "#D6F379", // 05/07: Authentic Lime Green
    href: "/features/unified-inbox",
    pills: ["Omnichannel Sync", "VIP Lead Routing", "1-Click Human Handoff", "Team Collaboration"],
    ctaText: "Explore Unified Inbox",
    mockup: <UnifiedInboxMockup />,
  },
  {
    number: "06",
    category: "Autonomous Web Chat Widget",
    title: "Answer visitors on your website too",
    description:
      "Embed a single line of script to add an intelligent shopping assistant to your website. Answers sizing, verifies stock in real-time, and transfers seamlessly to WhatsApp.",
    bgColor: "#F6C15C", // 06/07: Authentic Golden Amber
    href: "/features/chat-widget",
    pills: ["1-Line Embed Script", "Live Cart Sync", "WhatsApp Instant Transfer", "Zero Latency Answers"],
    ctaText: "Explore Web Chat",
    mockup: <StorefrontWidgetMockup />,
  },
  {
    number: "07",
    category: "Partner Marketing & Affiliate Engine",
    title: "One campaign, every partner",
    description:
      "Generate custom referral links and coupon codes in seconds. Let influencers and loyal customers earn commission while driving recurring sales to your store.",
    bgColor: "#E0D8FD", // 07/07: Authentic Lavender
    href: "/features/partner-marketing",
    pills: ["Instant Referral Codes", "Automated Payouts", "Creator Leaderboard", "Attributed Revenue"],
    ctaText: "Explore Partner Hub",
    mockup: <PartnerLeaderboardMockup />,
  },
];

interface StackingCardProps {
  card: FeatureCardData;
  index: number;
  totalCards: number;
}

function StackingCardItem({ card, index, totalCards }: StackingCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const isLast = index === totalCards - 1;

  // Smooth physical depth scale: stacks smoothly from 1.0 down to 0.96
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, isLast ? 1 : 0.96]
  );

  // Subtle physical shadow overlay for stacked cards below
  const depthOverlayOpacity = useTransform(
    scrollYProgress,
    [0, 1],
    [0, isLast ? 0 : 0.07]
  );

  // Sticky top offset to preserve visible header layer
  const topOffset = `calc(4.25rem + ${index * 12}px)`;

  return (
    <div
      ref={containerRef}
      className="min-h-[75vh] sm:min-h-[85vh] lg:min-h-[92vh] flex items-start justify-center relative pb-8 sm:pb-16"
    >
      <motion.div
        style={{
          backgroundColor: card.bgColor,
          scale,
          top: topOffset,
          zIndex: index + 1,
          transformOrigin: "top center",
          willChange: "transform",
        }}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={heavyCardSpring}
        className="w-full sticky rounded-[28px] sm:rounded-[44px] p-5 sm:p-9 lg:p-12 shadow-2xl border border-black/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center relative"
      >
        {/* Physical depth overlay for stacked cards */}
        <motion.div
          className="absolute inset-0 bg-black pointer-events-none rounded-[32px] sm:rounded-[44px]"
          style={{ opacity: depthOverlayOpacity }}
        />

        {/* Left Column: Headline, Description, Pills & Pill CTA */}
        <div className="lg:col-span-5 space-y-6 relative z-10">
          
          {/* Card Number & Category Tag */}
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#161616] tracking-tight">
              <span>{card.number}</span>
              <span className={card.isAccentNumber ? "text-[#EE7D60] font-bold text-xl sm:text-2xl" : "text-[#161616]/40 font-bold text-xl sm:text-2xl"}>
                /07
              </span>
            </div>
            <span className="h-4 w-px bg-black/15" />
            <span className="text-xs font-mono font-bold tracking-wider text-[#161616]/75 uppercase">
              {card.category}
            </span>
          </div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.05 }}
            className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#161616] leading-[1.15] tracking-tight"
          >
            {card.title}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.1 }}
            className="text-sm sm:text-base text-[#161616]/85 leading-relaxed font-medium"
          >
            {card.description}
          </motion.p>

          {/* Feature Checkmark Pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.15 }}
            className="flex flex-wrap gap-2 pt-1"
          >
            {card.pills.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xs text-xs font-bold text-[#161616] shadow-2xs border border-black/8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{pill}</span>
              </span>
            ))}
          </motion.div>

          {/* Pill CTA Button with Rolling Flip Animation */}
          <div className="pt-2">
            <FlipButton
              href={card.href}
              text={card.ctaText}
              variant="white-pill"
              icon={true}
            />
          </div>
        </div>

        {/* Right Column: Interactive Mockup Graphics */}
        <div className="lg:col-span-7 relative z-10 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.1 }}
            className="w-full flex justify-center"
          >
            {card.mockup}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export function MySamparkEverythingItDoes() {
  return (
    <section className="py-24 sm:py-32 bg-[#F5F6F0] relative overflow-hidden" id="features">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16 sm:mb-24 max-w-4xl mx-auto">
          
          {/* Top Pill Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={appleSpring}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/10 text-xs font-bold text-[#161616] shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
            <span>THE COMPLETE OMNICHANNEL SUITE</span>
          </motion.div>

          {/* Headline: EVERYTHING IT [DOES.] with DOES. in amber pill #FDD871 */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight uppercase leading-tight"
          >
            EVERYTHING IT{" "}
            <span className="inline-flex items-center px-4 sm:px-6 py-0.5 sm:py-1 rounded-full bg-[#FDD871] text-[#161616] align-baseline">
              DOES.
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.1 }}
            className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Seven pieces of one system — from the first comment to the post that brings in the next one.
          </motion.p>
        </div>

        {/* 7 Stacking Cards Stream */}
        <div className="space-y-6">
          {FEATURE_CARDS.map((card, index) => (
            <StackingCardItem
              key={card.number}
              card={card}
              index={index}
              totalCards={FEATURE_CARDS.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
