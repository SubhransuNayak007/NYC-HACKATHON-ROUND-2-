"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { appleSpring } from "@/frontend/lib/physicsMotion";

interface Segment {
  text?: string;
  pill?: string;
  bg?: string;
  color?: string;
  break?: boolean;
}

const MANIFESTO_SEGMENTS: Segment[] = [
  { text: "Comments pile up and DMs go" },
  { pill: "💬 unread", bg: "#E0F2FE", color: "#0369A1" },
  { text: ". By the time you reply, they've already bought somewhere else." },
  { break: true },
  { text: "Or you tried a bot and it quoted a" },
  { pill: "✕ wrong price", bg: "#FEE2E2", color: "#B91C1C" },
  { text: "— because it never knew your catalog." },
];

function ScrubWord({
  progress,
  range,
  word,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  word: string;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const isPunctuationOnly = /^[.,;:!?—]+$/.test(word);

  return (
    <motion.span
      style={{ opacity }}
      className={`inline-block font-serif ${isPunctuationOnly ? "mx-0" : "mx-[0.14em]"}`}
    >
      {word}
    </motion.span>
  );
}

function ScrubPill({
  progress,
  range,
  label,
  bg,
  color,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  label: string;
  bg: string;
  color: string;
}) {
  const scale = useTransform(progress, range, [0.82, 1]);
  const opacity = useTransform(progress, range, [0.25, 1]);
  return (
    <motion.span
      style={{ scale, opacity, backgroundColor: bg, color }}
      className="mx-2 inline-flex items-center rounded-full px-4 py-1 font-sans text-base sm:text-lg md:text-2xl font-bold align-middle shadow-xs select-none"
    >
      {label}
    </motion.span>
  );
}

/**
 * Scroll-Scrubbed Editorial Problem Statement (00:16)
 * Scrubs word opacity from 0.18 to 1.0 and springs inline pills into place
 */
export function ScrollScrubManifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 35%"],
  });

  // Calculate total words and assign each word a normalized progress slice
  let totalWords = 0;
  MANIFESTO_SEGMENTS.forEach((seg) => {
    if (seg.pill) totalWords += 1;
    if (seg.text) totalWords += seg.text.trim().split(/\s+/).filter(Boolean).length;
  });

  let wordCounter = 0;

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-6 py-28 sm:py-36 text-center bg-[#F5F6F0]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={appleSpring}
        className="mb-8"
      >
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] liquid-glass-control select-none uppercase tracking-wider font-mono">
          Sound familiar?
        </span>
      </motion.div>

      <p className="font-serif text-3xl leading-[1.35] text-[#18181B] tracking-tight md:text-[46px]">
        {MANIFESTO_SEGMENTS.map((seg, i) => {
          if (seg.break) return <br key={i} className="my-4 block" />;
          if (seg.pill) {
            const start = wordCounter / Math.max(1, totalWords);
            const end = Math.min(1, start + 0.08);
            wordCounter += 1;
            return (
              <ScrubPill
                key={i}
                progress={scrollYProgress}
                range={[start, end]}
                label={seg.pill}
                bg={seg.bg!}
                color={seg.color!}
              />
            );
          }
          return seg.text!.trim().split(/\s+/).filter(Boolean).map((word, wIdx) => {
            const start = wordCounter / Math.max(1, totalWords);
            const end = Math.min(1, start + 0.06);
            wordCounter += 1;
            return (
              <ScrubWord
                key={`${i}-${wIdx}`}
                progress={scrollYProgress}
                range={[start, end]}
                word={word}
              />
            );
          });
        })}
      </p>
    </section>
  );
}

export function MySamparkProblem() {
  return <ScrollScrubManifesto />;
}

export default MySamparkProblem;
