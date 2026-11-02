"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";

export interface StepCardData {
  step: string;
  color: string;
  textColor: string;
  title: string;
  subtitle: string;
  mockup: React.ReactNode;
}

export const STEPS_DATA: StepCardData[] = [
  {
    step: "1",
    color: "#F5BE41", // Warm Yellow (00:06)
    textColor: "#161615",
    title: "Make it yours",
    subtitle: "Set your colours, your logo and your welcome message.",
    mockup: (
      <div className="rounded-2xl bg-white p-4 text-left shadow-xs">
        <p className="text-[11px] font-medium text-neutral-400">Widget style</p>
        <div className="mt-2.5 flex gap-2">
          {["#F05A28", "#2EB67D", "#3B82F6", "#8B5CF6", "#161615"].map((c, i) => (
            <span
              key={c}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${i === 0 ? "ring-2 ring-offset-2 ring-[#F05A28]" : ""}`}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2.5 border-t border-neutral-100 pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F05A28] text-xs font-bold text-white shadow-xs">
            Q
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">QuickReply Store</p>
            <p className="text-[10px] text-emerald-600 font-semibold">● Online now</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
          Hi! How can I help you today?
        </div>
      </div>
    ),
  },
  {
    step: "2",
    color: "#5596F6", // Cornflower Blue (00:07)
    textColor: "#161615",
    title: "Add your knowledge",
    subtitle: "Your products, your pages and your own answers.",
    mockup: (
      <div className="space-y-2.5 text-left">
        <div className="rounded-2xl bg-white p-4 shadow-xs">
          <p className="text-[11px] font-medium text-neutral-400">Knowledge</p>
          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-medium text-neutral-800">✓ Products</span>
              <span className="text-neutral-400 font-mono">48 items</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-neutral-800">✓ Your pages</span>
              <span className="text-neutral-400 font-mono">12 synced</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-neutral-800">✓ Your Q&A</span>
              <span className="text-neutral-400 font-mono">19 entries</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xs">
          <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <div className="text-xs">
            <p className="text-[10px] text-neutral-400">Priya · 2m</p>
            <p className="font-bold text-neutral-900">Got this in size M ?</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: "3",
    color: "#2EB67D", // Emerald Green (00:07)
    textColor: "#FFFFFF",
    title: "Paste one snippet",
    subtitle: "One line on your site. Install detection confirms it.",
    mockup: (
      <div className="space-y-2.5 text-left text-neutral-900">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-neutral-800">quickreply.ai/shop</span>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-xs">
          <p className="text-[10px] text-neutral-400">Paste before &lt;/body&gt;</p>
          <code className="mt-1.5 block rounded-lg bg-neutral-100 p-2 text-[10px] font-mono text-emerald-700 select-all">
            &lt;script src=&quot;https://quickreply.ai/w.js&quot; /&gt;
          </code>
          <button
            type="button"
            className="mt-2.5 w-full rounded-lg bg-[#2EB67D] py-1.5 text-center text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
          >
            Copy snippet
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
            ✓
          </span>
          Install detected
        </div>
      </div>
    ),
  },
  {
    step: "4",
    color: "#F05A28", // Signature Orange (00:08)
    textColor: "#161615",
    title: "It answers 24/7",
    subtitle: "Every visitor gets a reply. Take over whenever you want.",
    mockup: (
      <div className="space-y-2 text-left">
        {[
          { sub: "In stock, ₹1,499", time: "now" },
          { sub: "Ships in 24 hrs", time: "2m ago" },
          { sub: "Size guide sent", time: "5m ago" },
        ].map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-700">
                💬
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">Answered {row.time}</p>
                <p className="text-[10px] text-neutral-400">{row.sub}</p>
              </div>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
              ✓
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-xs">
          <span className="text-[11px] text-emerald-600 font-semibold">● AI is replying</span>
          <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
            Take over
          </span>
        </div>
      </div>
    ),
  },
];

function StaircaseFolderCard({
  item,
  index,
  progress,
}: {
  item: StepCardData;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = 0.06 + index * 0.14;
  const end = start + 0.34;

  const y = useTransform(progress, [start, end], ["105vh", "0vh"]);

  return (
    <motion.div style={{ y }} className="will-change-transform">
      {/* Top Folder Tab Row */}
      <div className="relative z-10 flex items-end -mb-[1px]">
        <div
          style={{ backgroundColor: item.color, color: item.textColor }}
          className="flex h-12 w-28 items-center justify-center rounded-t-[20px] font-anton text-xl tracking-wide select-none"
        >
          ⚡/{item.step}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="block shrink-0 -ml-[1px]"
          aria-hidden="true"
        >
          <path d="M 0 0 Q 0 20 20 20 L 0 20 Z" fill={item.color} />
        </svg>
        <span className="sr-only">Step {item.step}</span>
      </div>

      {/* Main Folder Card Body */}
      <div
        style={{ backgroundColor: item.color, color: item.textColor }}
        className="flex h-[430px] flex-col justify-between rounded-b-[28px] rounded-tr-[28px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] select-none"
      >
        <div className="my-auto">{item.mockup}</div>

        <div className="pt-4 text-center">
          <h3 className="text-lg font-black tracking-tight">{item.title}</h3>
          <p className="mt-1 text-xs opacity-85 leading-relaxed">{item.subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Mobile-Optimized Folder Tab Card (for < md viewports)
 */
function MobileFolderCard({ item }: { item: StepCardData }) {
  return (
    <div className="flex flex-col w-full">
      <div className="relative z-10 flex items-end -mb-[1px]">
        <div
          style={{ backgroundColor: item.color, color: item.textColor }}
          className="flex h-11 w-24 items-center justify-center rounded-t-[18px] font-anton text-lg tracking-wide select-none"
        >
          ⚡/{item.step}
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="block shrink-0 -ml-[1px]"
          aria-hidden="true"
        >
          <path d="M 0 0 Q 0 18 18 18 L 0 18 Z" fill={item.color} />
        </svg>
        <span className="sr-only">Step {item.step}</span>
      </div>

      <div
        style={{ backgroundColor: item.color, color: item.textColor }}
        className="flex h-[390px] flex-col justify-between rounded-b-[24px] rounded-tr-[24px] p-4 shadow-md select-none"
      >
        <div className="my-auto">{item.mockup}</div>
        <div className="pt-3 text-center">
          <h3 className="text-base font-black tracking-tight">{item.title}</h3>
          <p className="mt-1 text-xs opacity-85 leading-relaxed">{item.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive 4 Steps Component:
 * - Desktop (>= md): Sticky 320vh Staircase Scroll Cascade with Apple springs
 * - Mobile (< md): Native touch swipe track with snap points & step indicators
 */
export function FourStepsCascadeSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 28,
    mass: 0.35,
  });

  const headerBlur = useTransform(smoothProgress, [0.05, 0.25], ["blur(0px)", "blur(6px)"]);
  const headerOpacity = useTransform(smoothProgress, [0.05, 0.35], [1, 0.22]);
  const headerScale = useTransform(smoothProgress, [0.05, 0.35], [1, 0.94]);

  // Mobile Render
  if (isMobile) {
    return (
      <section className="py-16 bg-[#FAF8F5] overflow-hidden">
        <div className="text-center mb-8 px-4">
          <span className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs">
            How it works
          </span>
          <h2 className="font-anton mt-4 text-4xl tracking-tight text-[#161615] leading-[0.96]">
            FOUR STEPS FROM QUESTION <br />
            <span className="mt-2 inline-flex items-center gap-2">
              TO
              <span className="inline-block -rotate-2 rounded-[18px] bg-[#F05A28] px-4 py-0.5 text-white shadow-xs">
                ANSWER.
              </span>
            </span>
          </h2>
          <p className="mt-3 text-xs text-neutral-500 font-medium">
            About five minutes to set up. No calls, no onboarding fee.
          </p>
        </div>

        {/* Responsive Static Grid on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md sm:max-w-xl mx-auto px-4">
          {STEPS_DATA.map((item) => (
            <MobileFolderCard key={item.step} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // Desktop Render: Sticky 320vh Staircase Cascade
  return (
    <section ref={containerRef} className="relative h-[320vh] bg-[#FAF8F5]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
        {/* Background Pinned Headline */}
        <motion.div
          style={{ filter: headerBlur, opacity: headerOpacity, scale: headerScale }}
          className="pointer-events-none absolute inset-x-0 top-[18vh] sm:top-[22vh] z-0 flex flex-col items-center text-center px-4"
        >
          <span className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs">
            How it works
          </span>
          <h2 className="font-anton mt-5 text-5xl sm:text-6xl md:text-[84px] tracking-tight text-[#161615] leading-[0.96]">
            FOUR STEPS FROM QUESTION <br />
            <span className="mt-2 inline-flex items-center gap-3 sm:gap-4">
              TO
              <span className="inline-block -rotate-2 rounded-[24px] bg-[#F05A28] px-5 sm:px-6 py-1 text-white shadow-md">
                ANSWER.
              </span>
            </span>
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-neutral-500 font-medium">
            About five minutes to set up. No calls, no onboarding fee.
          </p>
        </motion.div>

        {/* 4 Folder-Tab Cards Rising in Staircase Formation */}
        <div className="relative z-10 mx-auto grid w-full max-w-[1240px] grid-cols-4 gap-5 pt-16">
          {STEPS_DATA.map((item, idx) => (
            <StaircaseFolderCard
              key={item.step}
              item={item}
              index={idx}
              progress={smoothProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const MySamparkFourSteps = FourStepsCascadeSection;
export default MySamparkFourSteps;
