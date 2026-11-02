"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
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

export interface OmnichannelCard {
  num: string;
  category: string;
  title: string;
  description: string;
  bullets: string[];
  ctaText: string;
  ctaHref: string;
  bgColor: string;
  rightMockup: React.ReactNode;
}

export const SEVEN_ENGINE_CONFIG: Omit<OmnichannelCard, "rightMockup">[] = [
  {
    num: "01",
    category: "INSTAGRAM & FACEBOOK AUTOMATION",
    title: "Comment to DM, automatically",
    description:
      "Someone comments 'price' or 'link' and QuickReply instantly answers publicly, then sends a private DM with the exact product, real-time inventory, and 1-click checkout.",
    bullets: ["Public + Private Reply", "Real-Time Stock Check", "1-Click Direct Checkout"],
    ctaText: "Learn more about Comment to DM, automatically",
    ctaHref: "/features/comment-to-dm",
    bgColor: "#FDF2F0", // 00:17 Soft Blush
  },
  {
    num: "02",
    category: "AI PRODUCT KNOWLEDGE BASE",
    title: "Answers that come from your catalog",
    description:
      "Connect your Shopify store or upload your catalog CSV once. Price, size, stock, return policies, and shipping timelines get answered with 100% verified facts instead of AI hallucinations.",
    bullets: ["Real Stock & Sizing", "Zero Hallucinations", "Multi-Currency Support"],
    ctaText: "Learn more about Answers that come from your catalog",
    ctaHref: "/features/catalog-rag",
    bgColor: "#F0FAF4", // 00:18 Soft Mint
  },
  {
    num: "03",
    category: "UNIFIED MULTI-CHANNEL INBOX",
    title: "One calm inbox for every channel",
    description:
      "Instagram DMs, WhatsApp Business, Telegram Bot messages, LinkedIn discussions, and Facebook inquiries all stream into one clean command center.",
    bullets: ["Omnichannel Sync", "VIP Lead Routing", "1-Click Human Handoff"],
    ctaText: "Learn more about One calm inbox for every channel",
    ctaHref: "/features/unified-inbox",
    bgColor: "#ECF8F2", // 00:19 Sage Cream
  },
  {
    num: "04",
    category: "MULTI-CHANNEL SCHEDULER",
    title: "Plan and schedule posts everywhere",
    description:
      "Compose once with tailored copy adaptation for Instagram, Facebook, LinkedIn, Telegram, and X. Set publishing dates and let our background worker post automatically.",
    bullets: ["Cross-Platform Queue", "AI Caption Generator", "Optimal Timing Engine"],
    ctaText: "Learn more about Plan and schedule posts everywhere",
    ctaHref: "/features/scheduler",
    bgColor: "#FEF9E6", // 00:20 Buttercream Yellow
  },
  {
    num: "05",
    category: "CONVERSION & REVENUE ANALYTICS",
    title: "Real analytics, real ROI",
    description:
      "Track how many comments turned into DMs, how many DMs clicked checkout, and exact revenue attributed to autonomous replies.",
    bullets: ["99.1% Faster Response", "Funnel Attribution", "Live GMV Ledger"],
    ctaText: "Learn more about Real analytics",
    ctaHref: "/features/analytics",
    bgColor: "#FBF5E6", // 00:21 Warm Sand
  },
  {
    num: "06",
    category: "PARTNER MARKETING & AFFILIATE ENGINE",
    title: "Turn your customers into brand partners",
    description:
      "Automatically issue custom referral links and discount codes inside DMs and track creator-driven sales without manual spreadsheets.",
    bullets: ["Auto-Generated Codes", "Creator ROI Tracking", "Instant Payout Ledger"],
    ctaText: "Learn more about Partner marketing",
    ctaHref: "/features/partner-marketing",
    bgColor: "#F4F1FA", // 00:21 Soft Lavender (Fixes 00:21 opacity bug!)
  },
  {
    num: "07",
    category: "AUTONOMOUS WEB CHAT WIDGET",
    title: "Live AI sales agent on your website",
    description:
      "Embed a single line of script to add an intelligent shopping assistant to your website. Answers sizing, verifies stock in real-time, and transfers seamlessly to WhatsApp.",
    bullets: ["1-Line Embed Script", "Live Cart Sync", "WhatsApp Instant Transfer"],
    ctaText: "Learn more about Live AI sales agent on your website",
    ctaHref: "/features/chat-widget",
    bgColor: "#EEFBF6", // 00:22 Seafoam Mint
  },
];

export const SEVEN_ENGINE_CARDS = SEVEN_ENGINE_CONFIG;

export function OmnichannelCardHolder({ cards }: { cards: OmnichannelCard[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section id="features" className="bg-[#FAF8F5] py-24 relative">
      <div className="mx-auto mb-16 max-w-3xl text-center px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1 text-[11px] font-bold tracking-[0.14em] uppercase">
          ✦ THE COMPLETE OMNICHANNEL SUITE
        </span>
        <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#18181B] uppercase leading-none">
          EVERYTHING IT DOES
        </h2>
        <p className="mt-4 text-base text-black/60 max-w-2xl mx-auto font-medium">
          Seven purpose-built engines working in harmony to capture leads, answer
          questions from verified inventory, and generate sales around the clock.
        </p>
      </div>

      {/* Scroll Runway for the 7-Card Holder */}
      <div
        ref={containerRef}
        className="relative mx-auto max-w-[1240px] px-4 md:px-8 h-auto lg:h-[calc(7*88vh)]"
      >
        {cards.map((card, i) => {
          const targetScale = 1 - (cards.length - 1 - i) * 0.03;
          const startCompression = i / cards.length;

          return (
            <CardHolderSlot
              key={card.num}
              index={i}
              total={cards.length}
              card={card}
              globalProgress={scrollYProgress}
              compressionRange={[startCompression, 1]}
              targetScale={targetScale}
            />
          );
        })}
      </div>
    </section>
  );
}

function CardHolderSlot({
  index,
  total,
  card,
  globalProgress,
  compressionRange,
  targetScale,
}: {
  index: number;
  total: number;
  card: OmnichannelCard;
  globalProgress: MotionValue<number>;
  compressionRange: [number, number];
  targetScale: number;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop sticky offset: 76px base + 34px lip per previous card; on mobile cards stack in natural flow
  const slotTopPx = 76 + index * 34;

  // Scale & brightness compression when newer cards stack on top (desktop only)
  const scale = useTransform(globalProgress, compressionRange, [1, targetScale]);
  const brightness = useTransform(
    globalProgress,
    compressionRange,
    [1, 1 - (total - 1 - index) * 0.035]
  );
  const brightnessFilter = useTransform(brightness, (b) => `brightness(${b})`);

  return (
    <div
      ref={slotRef}
      style={{
        top: isDesktop ? `${slotTopPx}px` : undefined,
        zIndex: index + 10,
      }}
      className="relative lg:sticky flex min-h-[460px] sm:min-h-[520px] lg:h-[82vh] items-start justify-center will-change-transform mb-8 lg:mb-0"
    >
      <motion.div
        style={{
          backgroundColor: card.bgColor,
          scale: isDesktop ? scale : 1,
          x: 0,
          rotateZ: 0,
          filter: isDesktop ? brightnessFilter : undefined,
          transformOrigin: "top center",
        }}
        className="w-full rounded-[28px] sm:rounded-[32px] border border-black/[0.08] p-5 sm:p-8 md:p-11 shadow-[0_-20px_40px_-4px_rgba(0,0,0,0.12),0_25px_60px_-15px_rgba(0,0,0,0.06)] will-change-transform overflow-hidden"
      >
        {/* Exposed Card-Holder Top Lip (Always visible even when stacked) */}
        <div
          onClick={() =>
            slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          className="mb-6 flex cursor-pointer items-center justify-between border-b border-black/[0.06] pb-3 select-none"
        >
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-black/60 uppercase">
            {`${card.num} // ${card.category}`}
          </span>
          <span className="rounded-full bg-black/[0.06] px-3 py-0.5 font-mono text-[11px] font-semibold text-black/70">
            ENGINE {card.num} / 0{total}
          </span>
        </div>

        {/* Two-Column Card Interior (Matches 00:17 - 00:22 layout) */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Column: Copy & Bullets */}
          <div className="lg:col-span-5 text-left">
            <h3 className="font-sans text-3xl font-black tracking-tight text-[#18181B] sm:text-4xl md:text-[42px] uppercase md:leading-[1.08]">
              {card.title}
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-black/65 font-medium">
              {card.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {card.bullets.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#18181B] shadow-2xs"
                >
                  <span className="text-emerald-600 font-bold">✓</span> {b}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <Link href={card.ctaHref || "#"}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-3.5 text-xs font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-md cursor-pointer"
                >
                  <span>{card.ctaText}</span>
                  <span>→</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Right Column: High-Craft Interactive Interior Graphic Mockup */}
          <div className="lg:col-span-7 flex items-center justify-center overflow-hidden">
            <div className="w-full flex justify-center transform scale-95 sm:scale-100 origin-center">
              {card.rightMockup}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function MySamparkEverythingItDoes() {
  const cardsWithMockups: OmnichannelCard[] = [
    {
      ...SEVEN_ENGINE_CONFIG[0],
      rightMockup: <CommentToDMMockup />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[1],
      rightMockup: <CatalogRAGMockup />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[2],
      rightMockup: <UnifiedInboxMockup />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[3],
      rightMockup: <SchedulerCalendarMockup />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[4],
      rightMockup: <AnalyticsROIGraph />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[5],
      rightMockup: <PartnerLeaderboardMockup />,
    },
    {
      ...SEVEN_ENGINE_CONFIG[6],
      rightMockup: <StorefrontWidgetMockup />,
    },
  ];

  return <OmnichannelCardHolder cards={cardsWithMockups} />;
}

export default MySamparkEverythingItDoes;
