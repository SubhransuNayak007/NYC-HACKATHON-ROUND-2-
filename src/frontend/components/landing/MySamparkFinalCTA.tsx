"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export const FLOATING_PHOTOS = [
  { rotate: -14, src: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400&q=80" },
  { rotate: 9, src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80" },
  { rotate: -7, src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80" },
  { rotate: 13, src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" },
];

/**
 * Pre-Footer Floating Squircle Photos with Parallax Drift (00:16–00:21)
 */
export function PreFooterFloatingCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yFloat = useTransform(scrollYProgress, [0, 1], [35, -35]);

  return (
    <section ref={ref} className="mx-auto max-w-[1360px] px-4 py-12">
      <div className="overflow-hidden rounded-[36px] bg-[#EFECE6] px-6 py-20 text-center shadow-lg">
        {/* 4 Tilted Squircle Photos (00:16 - 00:21) */}
        <motion.div
          style={{ y: yFloat }}
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 sm:gap-8 md:justify-between"
        >
          {FLOATING_PHOTOS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ rotate: p.rotate }}
              whileHover={{ rotate: 0, scale: 1.06 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="h-36 w-36 sm:h-40 sm:w-40 md:h-48 md:w-48 overflow-hidden rounded-[28px] bg-white p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] cursor-pointer"
            >
              <img
                src={p.src}
                alt="QuickReply in action preview"
                className="h-full w-full rounded-[22px] object-cover pointer-events-none select-none"
              />
            </motion.div>
          ))}
        </motion.div>

        <span className="mt-14 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs">
          Ready?
        </span>

        <h2 className="font-anton mx-auto mt-5 max-w-2xl text-4xl sm:text-5xl md:text-6xl text-[#161615] leading-[0.98]">
          SOMEONE IS ON YOUR SITE RIGHT NOW.
        </h2>

        <p className="mx-auto mt-4 max-w-md text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
          Start free. Add your products, paste one snippet, and watch the first
          chat get answered. No card needed.
        </p>

        {/* Dual Pill Buttons with Circular Icon Badges (00:18) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 rounded-full bg-[#161615] p-1.5 pr-6 text-xs font-bold text-white transition-transform hover:scale-105 shadow-md cursor-pointer"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#161615] transition-transform group-hover:translate-x-0.5 font-bold">
              →
            </span>
            <span>Start free</span>
          </Link>

          <a
            href="#demo"
            className="group inline-flex items-center gap-3 rounded-full bg-white p-1.5 pl-6 text-xs font-bold text-[#161615] shadow-sm transition-transform hover:scale-105 cursor-pointer"
          >
            <span>See a demo first</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161615] text-white transition-transform group-hover:translate-x-0.5 font-bold">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

// Export both names for backwards compatibility
export const MySamparkFinalCTA = PreFooterFloatingCTA;
export default MySamparkFinalCTA;
