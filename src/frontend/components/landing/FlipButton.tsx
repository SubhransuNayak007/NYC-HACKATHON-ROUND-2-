"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { appleSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

interface FlipButtonProps {
  href: string;
  text: string;
  variant?: "primary-black" | "coral" | "outline-white" | "white-pill";
  icon?: boolean;
  className?: string;
}

/**
 * High-craft vertical rolling flip text.
 * When parent has `.group`, hovering rolls the current text up and brings the twin text in from below.
 */
export function FlipText({
  text,
  className = "",
  hoverClassName = "",
}: {
  text: string;
  className?: string;
  hoverClassName?: string;
}) {
  return (
    <span className="relative inline-flex overflow-hidden h-[1.35em] leading-[1.35em] align-middle">
      <span className={`inline-block transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full will-change-transform ${className}`}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-0 inline-block transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] translate-y-full group-hover:translate-y-0 will-change-transform ${
          hoverClassName || className
        }`}
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Rolling Arrow Icon that slides to right on hover with twin entering from left
 */
export function RollingArrow({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      <ArrowRight className="w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-x-full" />
      <ArrowRight
        aria-hidden="true"
        className="w-full h-full absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] -translate-x-full group-hover:translate-x-0"
      />
    </span>
  );
}

export function FlipButton({
  href,
  text,
  variant = "primary-black",
  icon = true,
  className = "",
}: FlipButtonProps) {
  if (variant === "primary-black") {
    return (
      <Link href={href} className={`group inline-flex items-center select-none ${className}`}>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={tactileButtonTap}
          transition={appleSpring}
          className="relative inline-flex items-center gap-3.5 rounded-full bg-[#161616] p-1.5 pr-7 sm:pr-8 text-white shadow-lg hover:bg-black transition-colors"
        >
          {/* Circular White Icon Container with Rolling Arrow */}
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black shadow-sm overflow-hidden relative">
            <RollingArrow className="w-4 h-4 sm:w-5 sm:h-5 text-[#161616]" />
          </div>

          <span className="text-sm sm:text-base font-bold tracking-tight">
            <FlipText text={text} />
          </span>
        </motion.div>
      </Link>
    );
  }

  if (variant === "coral") {
    return (
      <Link href={href} className={`group inline-flex items-center select-none ${className}`}>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={tactileButtonTap}
          transition={appleSpring}
          className="h-10 px-5 sm:px-6 rounded-full bg-[#EE7D60] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#e06c4e] transition-all inline-flex items-center gap-2"
        >
          <FlipText text={text} />
          {icon && <RollingArrow className="w-3.5 h-3.5" />}
        </motion.div>
      </Link>
    );
  }

  if (variant === "outline-white") {
    return (
      <Link href={href} className={`group inline-flex items-center select-none ${className}`}>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={tactileButtonTap}
          transition={appleSpring}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold border border-black/10 bg-white/90 hover:bg-white text-[#161616] transition-all shadow-2xs"
        >
          {icon && <RollingArrow className="w-4 h-4 text-[#161616]" />}
          <FlipText text={text} />
        </motion.div>
      </Link>
    );
  }

  // white-pill / default
  return (
    <Link href={href} className={`group inline-flex items-center select-none ${className}`}>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={tactileButtonTap}
        transition={appleSpring}
        className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full bg-[#161616] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-black transition-colors"
      >
        <FlipText text={text} />
        {icon && <RollingArrow className="w-4 h-4" />}
      </motion.div>
    </Link>
  );
}
