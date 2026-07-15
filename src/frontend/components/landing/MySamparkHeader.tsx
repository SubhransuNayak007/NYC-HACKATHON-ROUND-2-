"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  ChevronLeft,
} from "lucide-react";
import { MySamparkLogo } from "./MySamparkLogo";
import { FlipButton, FlipText, RollingArrow } from "./FlipButton";
import { appleSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

interface MenuItemData {
  name: string;
  href: string;
  img: string;
}

const FEATURE_ITEMS: MenuItemData[] = [
  {
    name: "CAMPAIGNS",
    href: "/features/campaigns",
    img: "https://images.unsplash.com/photo-1557838923-2985c318be48?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "AUTO DM",
    href: "/features/auto-dm",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "KNOWLEDGE BASE",
    href: "/features/knowledge-base",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "UNIFIED INBOX",
    href: "/features/unified-inbox",
    img: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "ANALYTICS",
    href: "/features/analytics",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "PARTNER MARKETING",
    href: "/features/partner-marketing",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "CHAT WIDGET",
    href: "/features/chat-widget",
    img: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=200&auto=format&fit=crop&q=80",
  },
];

const INTEGRATION_ITEMS: MenuItemData[] = [
  {
    name: "INSTAGRAM",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "FACEBOOK",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1557838923-2985c318be48?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "LINKEDIN",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "X (TWITTER)",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "PINTEREST",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1556742049-0a67e5572293?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "YOUTUBE",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "WORDPRESS",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "SHOPIFY",
    href: "/integrations",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&auto=format&fit=crop&q=80",
  },
];

/**
 * Menu Marquee Item Component
 * Displays clean uppercase text by default, transforms into a running ticker banner when hovered
 */
function MenuMarqueeItem({
  item,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  item: MenuItemData;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative block w-full my-0.5 select-none"
    >
      {isHovered ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="w-full h-11 sm:h-12 rounded-full bg-white text-black overflow-hidden flex items-center shadow-lg px-2"
        >
          <div className="animate-flowing-marquee flex items-center whitespace-nowrap">
            {/* Track 1 */}
            <div className="flex items-center shrink-0">
              {[...Array(6)].map((_, i) => (
                <div key={`a-${i}`} className="flex items-center gap-2 shrink-0 mx-2.5">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-black uppercase">
                    {item.name}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-8 sm:w-9 h-5 sm:h-6 rounded-md object-cover border border-black/10 shadow-2xs shrink-0"
                  />
                </div>
              ))}
            </div>
            {/* Track 2 */}
            <div className="flex items-center shrink-0">
              {[...Array(6)].map((_, i) => (
                <div key={`b-${i}`} className="flex items-center gap-2 shrink-0 mx-2.5">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-black uppercase">
                    {item.name}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-8 sm:w-9 h-5 sm:h-6 rounded-md object-cover border border-black/10 shadow-2xs shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5 sm:py-2 text-white hover:text-[#EE7D60] transition-colors group">
          <span className="text-sm sm:text-base md:text-lg font-black tracking-tight uppercase">
            {item.name}
          </span>
          <span className="text-slate-500 group-hover:text-white transition-colors text-xs sm:text-sm font-mono">
            &rarr;
          </span>
        </div>
      )}
    </Link>
  );
}

/**
 * Menu Footer Component
 * Follow us on + 4 circular social media buttons + Saurabh Infosys attribution
 */
function MenuFooter({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnSize = size === "sm" ? "w-8 h-8 sm:w-9 sm:h-9" : "w-9 h-9 sm:w-10 sm:h-10";

  return (
    <div className="pt-2.5 sm:pt-3 border-t border-white/10 text-center w-full">
      <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wider uppercase mb-1.5 sm:mb-2">
        Follow us on:
      </div>
      <div className="flex items-center justify-center gap-2.5 sm:gap-3">
        {[
          { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
          { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
          { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
          { icon: Twitter, href: "https://x.com", label: "X" },
        ].map((social, i) => (
          <motion.a
            key={i}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={tactileButtonTap}
            transition={appleSpring}
            className={`${btnSize} rounded-full bg-white text-black flex items-center justify-center shadow-md transition-transform`}
          >
            <social.icon className={iconSize} />
          </motion.a>
        ))}
      </div>
      <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium pt-2">
        A product by <span className="text-slate-200 font-bold">Saurabh Infosys</span>
      </div>
    </div>
  );
}

/**
 * Animated 4-dots icon that morphs smoothly between a 2x2 grid (Menu) and an X / diagonal cross (Close)
 */
function AnimatedMenuDots({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
      {/* Dot 1: Top-Left */}
      <motion.span
        animate={
          isOpen
            ? { x: 0, y: 0, scale: 0.85, rotate: 45 }
            : { x: -3.5, y: -3.5, scale: 1, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        className="absolute w-1.5 h-1.5 rounded-[2px] bg-white will-change-transform"
      />
      {/* Dot 2: Top-Right */}
      <motion.span
        animate={
          isOpen
            ? { x: 0, y: 0, scale: 0.85, rotate: -45 }
            : { x: 3.5, y: -3.5, scale: 1, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        className="absolute w-1.5 h-1.5 rounded-[2px] bg-white will-change-transform"
      />
      {/* Dot 3: Bottom-Left */}
      <motion.span
        animate={
          isOpen
            ? { x: 0, y: 0, scale: 0.85, rotate: -45 }
            : { x: -3.5, y: 3.5, scale: 1, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        className="absolute w-1.5 h-1.5 rounded-[2px] bg-white will-change-transform"
      />
      {/* Dot 4: Bottom-Right */}
      <motion.span
        animate={
          isOpen
            ? { x: 0, y: 0, scale: 0.85, rotate: 45 }
            : { x: 3.5, y: 3.5, scale: 1, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        className="absolute w-1.5 h-1.5 rounded-[2px] bg-white will-change-transform"
      />
    </div>
  );
}

export function MySamparkHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [pane, setPane] = useState<"main" | "features" | "integrations">("main");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
    setPane("main");
    setHoveredItem(null);
  };

  return (
    <>
      {/* Running Marquee Ticker CSS Keyframes (22s linear infinite) */}
      <style>{`
        @keyframes flowing-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-flowing-marquee {
          display: flex;
          width: max-content;
          animation: flowing-marquee 22s linear infinite;
          will-change: transform;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Background Dim Overlay with Deep Apple Blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9990] pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-[9999]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          
          {/* Desktop & Tablet Layout (>= md) */}
          <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            {/* Left: QuickReply Brand Logo */}
            <div className="pointer-events-auto pt-4 sm:pt-6">
              <MySamparkLogo />
            </div>

            {/* Center: Attached Top Tab Menu Button with Inverted Wings */}
            <div className="pointer-events-auto relative flex flex-col items-center">
              <motion.button
                type="button"
                whileTap={tactileButtonTap}
                onClick={handleToggleMenu}
                className="group relative flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-b-[1.25rem] bg-[#161616] px-7 sm:px-10 text-white shadow-xl hover:bg-black transition-colors focus:outline-none cursor-pointer select-none border-b border-x border-white/5"
              >
                {/* Left Inverted Corner SVG Wing */}
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute translate-x-px top-0 -left-[24px] text-[#161616]"
                >
                  <path d="M0 0H25V25C25 11.1929 13.8071 0 0 0Z" />
                </svg>

                {/* Tab Icon and Label */}
                <div className="flex items-center gap-2.5">
                  <AnimatedMenuDots isOpen={isOpen} />
                  <span className="text-sm sm:text-base font-medium tracking-wide">
                    <FlipText text={isOpen ? "Close" : "Menu"} />
                  </span>
                </div>

                {/* Right Inverted Corner SVG Wing */}
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute -translate-x-px top-0 -right-[24px] text-[#161616]"
                >
                  <path d="M25 0H0V25C0 11.1929 11.1929 0 25 0Z" />
                </svg>
              </motion.button>

              {/* FLOATING DARK MENU DRAWER PANEL (DESKTOP) WITH LIQUID ELASTIC SPRING */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.35, scaleX: 0.92, y: -24 }}
                    animate={{ opacity: 1, scaleY: 1, scaleX: 1, y: 0 }}
                    exit={{ opacity: 0, scaleY: 0.35, scaleX: 0.92, y: -24 }}
                    transition={{
                      type: "spring",
                      mass: 0.65,
                      stiffness: 380,
                      damping: 24,
                    }}
                    style={{ transformOrigin: "top center", originY: 0 }}
                    className="absolute top-14 sm:top-15 left-1/2 -translate-x-1/2 w-[25rem] overflow-hidden rounded-[32px] bg-[#161616] text-white shadow-2xl p-6 border border-white/10 z-50 select-none will-change-transform"
                  >
                    <AnimatePresence mode="wait">
                      {/* PANE 1: MAIN NAVIGATION */}
                      {pane === "main" && (
                        <motion.div
                          key="main"
                          initial={{ opacity: 0, x: -14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 14 }}
                          transition={appleSpring}
                          className="flex flex-col items-center text-center space-y-3"
                        >
                          <div className="flex flex-col items-center space-y-2 font-black text-2xl sm:text-[26px] uppercase tracking-tight w-full">
                            <Link
                              href="/"
                              onClick={() => setIsOpen(false)}
                              className="block text-[#EE7D60] hover:opacity-90 transition-opacity py-0.5"
                            >
                              HOME
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setPane("features");
                                setHoveredItem(null);
                              }}
                              className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer py-0.5 group w-full"
                            >
                              <span>FEATURES</span>
                              <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform text-lg font-mono">
                                &rsaquo;
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPane("integrations");
                                setHoveredItem(null);
                              }}
                              className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer py-0.5 group w-full"
                            >
                              <span>INTEGRATIONS</span>
                              <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform text-lg font-mono">
                                &rsaquo;
                              </span>
                            </button>

                            <Link
                              href="/pricing"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 hover:text-white transition-colors py-0.5"
                            >
                              PRICING
                            </Link>

                            <Link
                              href="/about"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 hover:text-white transition-colors py-0.5"
                            >
                              ABOUT
                            </Link>

                            <Link
                              href="/blog"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 hover:text-white transition-colors py-0.5"
                            >
                              BLOG
                            </Link>

                            <Link
                              href="/faq"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 hover:text-white transition-colors py-0.5"
                            >
                              FAQS
                            </Link>

                            <Link
                              href="/contact"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 hover:text-white transition-colors py-0.5"
                            >
                              CONTACT
                            </Link>
                          </div>

                          <MenuFooter size="md" />
                        </motion.div>
                      )}

                      {/* PANE 2: FEATURES SUB-MENU */}
                      {pane === "features" && (
                        <motion.div
                          key="features"
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={appleSpring}
                          className="space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setPane("main");
                                setHoveredItem(null);
                              }}
                              className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                              <span>Back</span>
                            </button>
                            <span className="text-[11px] font-mono font-bold tracking-widest text-[#EE7D60] uppercase">
                              FEATURES
                            </span>
                          </div>

                          <div className="space-y-0.5 max-h-[380px] overflow-y-auto no-scrollbar pr-0.5">
                            {FEATURE_ITEMS.map((item) => (
                              <MenuMarqueeItem
                                key={item.name}
                                item={item}
                                isHovered={hoveredItem === item.name}
                                onMouseEnter={() => setHoveredItem(item.name)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => setIsOpen(false)}
                              />
                            ))}
                          </div>

                          <MenuFooter size="sm" />
                        </motion.div>
                      )}

                      {/* PANE 3: INTEGRATIONS SUB-MENU */}
                      {pane === "integrations" && (
                        <motion.div
                          key="integrations"
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={appleSpring}
                          className="space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setPane("main");
                                setHoveredItem(null);
                              }}
                              className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                              <span>Back</span>
                            </button>
                            <span className="text-[11px] font-mono font-bold tracking-widest text-[#EE7D60] uppercase">
                              INTEGRATIONS
                            </span>
                          </div>

                          <div className="space-y-0.5 max-h-[380px] overflow-y-auto no-scrollbar pr-0.5">
                            {INTEGRATION_ITEMS.map((item) => (
                              <MenuMarqueeItem
                                key={item.name}
                                item={item}
                                isHovered={hoveredItem === item.name}
                                onMouseEnter={() => setHoveredItem(item.name)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => setIsOpen(false)}
                              />
                            ))}
                          </div>

                          <MenuFooter size="sm" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Quick Action Buttons (Sign In + Start free Pill) */}
            <div className="pointer-events-auto flex items-center justify-end gap-3 pt-4 sm:pt-6">
              <Link href="/login" className="group">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={tactileButtonTap}
                  transition={appleSpring}
                  type="button"
                  className="h-10 px-5 rounded-full text-xs font-bold text-[#161616] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <FlipText text="Sign In" />
                </motion.button>
              </Link>
              <FlipButton
                href="/register"
                text="Start free"
                variant="coral"
                icon={true}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MOBILE NAVBAR (< md) — EXACT MATCH TO mysampark.com DEVTOOLS
              Left: Logo, Right: Attached Menu Tab with Inverted Wing
              ═══════════════════════════════════════════════════════════════ */}
          <div className="flex md:hidden items-start justify-between">
            {/* Left: Mobile Brand Logo */}
            <div className="pointer-events-auto pt-3.5 pl-1">
              <MySamparkLogo />
            </div>

            {/* Right: Mobile Attached Top Tab Menu Button */}
            <div className="pointer-events-auto relative">
              <motion.button
                type="button"
                whileTap={tactileButtonTap}
                onClick={handleToggleMenu}
                className="group relative flex h-11 items-center justify-center gap-2 rounded-b-2xl bg-[#161616] px-5 text-white shadow-xl hover:bg-black transition-colors focus:outline-none cursor-pointer select-none border-b border-x border-white/5"
              >
                {/* Left Inverted Corner SVG Wing */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 25 25"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute translate-x-px top-0 -left-[19px] text-[#161616]"
                >
                  <path d="M0 0H25V25C25 11.1929 13.8071 0 0 0Z" />
                </svg>

                <div className="flex items-center gap-2">
                  <AnimatedMenuDots isOpen={isOpen} />
                  <span className="text-xs font-bold tracking-wide">
                    <FlipText text={isOpen ? "Close" : "Menu"} />
                  </span>
                </div>
              </motion.button>

              {/* MOBILE FLOATING MENU DRAWER PANEL WITH LIQUID ELASTIC SPRING */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.35, scaleX: 0.92, y: -20 }}
                    animate={{ opacity: 1, scaleY: 1, scaleX: 1, y: 0 }}
                    exit={{ opacity: 0, scaleY: 0.35, scaleX: 0.92, y: -20 }}
                    transition={{
                      type: "spring",
                      mass: 0.65,
                      stiffness: 380,
                      damping: 24,
                    }}
                    style={{ transformOrigin: "top right", originY: 0 }}
                    className="fixed top-14 left-4 right-4 max-h-[82vh] overflow-y-auto no-scrollbar rounded-[28px] bg-[#161616] text-white shadow-2xl p-5 border border-white/10 z-50 select-none will-change-transform"
                  >
                    <AnimatePresence mode="wait">
                      {/* PANE 1: MAIN NAVIGATION (MOBILE) */}
                      {pane === "main" && (
                        <motion.div
                          key="main-mobile"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={appleSpring}
                          className="flex flex-col items-center text-center space-y-2.5"
                        >
                          <div className="flex flex-col items-center space-y-1.5 font-black text-xl uppercase tracking-tight w-full">
                            <Link
                              href="/"
                              onClick={() => setIsOpen(false)}
                              className="block text-[#EE7D60] py-0.5"
                            >
                              HOME
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setPane("features");
                                setHoveredItem(null);
                              }}
                              className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer py-0.5 w-full"
                            >
                              <span>FEATURES</span>
                              <span className="text-slate-500 text-base font-mono">&rsaquo;</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPane("integrations");
                                setHoveredItem(null);
                              }}
                              className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer py-0.5 w-full"
                            >
                              <span>INTEGRATIONS</span>
                              <span className="text-slate-500 text-base font-mono">&rsaquo;</span>
                            </button>

                            <Link
                              href="/pricing"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 py-0.5"
                            >
                              PRICING
                            </Link>

                            <Link
                              href="/about"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 py-0.5"
                            >
                              ABOUT
                            </Link>

                            <Link
                              href="/blog"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 py-0.5"
                            >
                              BLOG
                            </Link>

                            <Link
                              href="/faq"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 py-0.5"
                            >
                              FAQS
                            </Link>

                            <Link
                              href="/contact"
                              onClick={() => setIsOpen(false)}
                              className="block text-slate-300 py-0.5"
                            >
                              CONTACT
                            </Link>
                          </div>

                          <MenuFooter size="sm" />
                        </motion.div>
                      )}

                      {/* PANE 2: FEATURES SUB-MENU (MOBILE) */}
                      {pane === "features" && (
                        <motion.div
                          key="features-mobile"
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={appleSpring}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setPane("main");
                                setHoveredItem(null);
                              }}
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-slate-300"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Back</span>
                            </button>
                            <span className="text-[10px] font-mono font-bold tracking-widest text-[#EE7D60] uppercase">
                              FEATURES
                            </span>
                          </div>

                          <div className="space-y-0.5 max-h-[320px] overflow-y-auto no-scrollbar">
                            {FEATURE_ITEMS.map((item) => (
                              <MenuMarqueeItem
                                key={item.name}
                                item={item}
                                isHovered={hoveredItem === item.name}
                                onMouseEnter={() => setHoveredItem(item.name)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => setIsOpen(false)}
                              />
                            ))}
                          </div>

                          <MenuFooter size="sm" />
                        </motion.div>
                      )}

                      {/* PANE 3: INTEGRATIONS SUB-MENU (MOBILE) */}
                      {pane === "integrations" && (
                        <motion.div
                          key="integrations-mobile"
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={appleSpring}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setPane("main");
                                setHoveredItem(null);
                              }}
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-slate-300"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Back</span>
                            </button>
                            <span className="text-[10px] font-mono font-bold tracking-widest text-[#EE7D60] uppercase">
                              INTEGRATIONS
                            </span>
                          </div>

                          <div className="space-y-0.5 max-h-[320px] overflow-y-auto no-scrollbar">
                            {INTEGRATION_ITEMS.map((item) => (
                              <MenuMarqueeItem
                                key={item.name}
                                item={item}
                                isHovered={hoveredItem === item.name}
                                onMouseEnter={() => setHoveredItem(item.name)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => setIsOpen(false)}
                              />
                            ))}
                          </div>

                          <MenuFooter size="sm" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
