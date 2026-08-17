"use client";

import React from "react";
import { motion } from "framer-motion";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

export function MySamparkPainPoints() {
  return (
    <section className="py-24 sm:py-32 bg-[#F5F6F0] text-center font-sans relative overflow-hidden" id="problem">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Tag / Pill Badge: "Sound familiar?" */}
        <div className="inline-block mb-10 sm:mb-12">
          <span className="inline-flex items-center px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-[#161616] bg-white border border-black/10 shadow-sm select-none tracking-tight">
            Sound familiar?
          </span>
        </div>

        {/* Editorial Narrative Statements with Inline Avatars and Colored Highlight Pills */}
        <div className="space-y-8 sm:space-y-10 text-2xl sm:text-3xl md:text-[38px] lg:text-[42px] font-extrabold text-[#161616] leading-[1.4] sm:leading-[1.35] tracking-tight">
          {/* Statement 1: "asleep" */}
          <p className="leading-snug sm:leading-[1.35]">
            Someone asks the price at 11pm and you&apos;re{" "}
            <motion.span
              whileHover={{ scale: 1.06, rotate: -1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#FDD871] text-[#161616] text-lg sm:text-2xl md:text-3xl font-black align-middle shadow-xs cursor-default select-none border border-black/5 my-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80"
                alt="Founder sleeping avatar"
                loading="lazy"
                decoding="async"
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border border-white/80 shrink-0"
              />
              <span>asleep</span>
            </motion.span>
            .
          </p>

          {/* Statement 2: "every single day" */}
          <p className="leading-snug sm:leading-[1.35]">
            You answer &quot;how much?&quot; forty times a day. Same question,{" "}
            <motion.span
              whileHover={{ scale: 1.06, rotate: 1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#FCD5D9] text-[#161616] text-lg sm:text-2xl md:text-3xl font-black align-middle shadow-xs cursor-default select-none border border-black/5 my-1"
            >
              every single day
            </motion.span>
            .
          </p>

          {/* Statement 3: "unanswered" */}
          <p className="leading-snug sm:leading-[1.35]">
            Comments pile up and DMs go{" "}
            <motion.span
              whileHover={{ scale: 1.06, rotate: -1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#E2E8F0] text-[#161616] text-lg sm:text-2xl md:text-3xl font-black align-middle shadow-xs cursor-default select-none border border-black/5 my-1"
            >
              <span className="flex -space-x-2 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Customer avatar 1"
                  loading="lazy"
                  decoding="async"
                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-white"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                  alt="Customer avatar 2"
                  loading="lazy"
                  decoding="async"
                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-white"
                />
              </span>
              <span>unanswered</span>
            </motion.span>
            .
          </p>

          {/* Statement 4: "jumping between platforms" */}
          <p className="leading-snug sm:leading-[1.35]">
            You&apos;re{" "}
            <motion.span
              whileHover={{ scale: 1.06, rotate: 1.2 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#D6F379] text-[#161616] text-lg sm:text-2xl md:text-3xl font-black align-middle shadow-xs cursor-default select-none border border-black/5 my-1"
            >
              <span>jumping between platforms</span>
            </motion.span>{" "}
            trying to keep up.
          </p>

          {/* Statement 5: "they leave" */}
          <p className="leading-snug sm:leading-[1.35]">
            By the time you reply,{" "}
            <motion.span
              whileHover={{ scale: 1.06, rotate: -1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#FED7AA] text-[#161616] text-lg sm:text-2xl md:text-3xl font-black align-middle shadow-xs cursor-default select-none border border-black/5 my-1"
            >
              <span>they leave</span>
            </motion.span>{" "}
            and buy from someone else.
          </p>
        </div>
      </div>
    </section>
  );
}

// Named alias export for backward compatibility
export const MySamparkProblem = MySamparkPainPoints;
