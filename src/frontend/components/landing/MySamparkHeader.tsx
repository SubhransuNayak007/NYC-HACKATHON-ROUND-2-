"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MySamparkLogo } from "./MySamparkLogo";
import { appleSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

type MenuView = "main" | "features" | "integrations";

export interface SubmenuFeatureItem {
  id: string;
  label: string;
  thumb: string;
  href: string;
}

export const SUBMENU_FEATURES: SubmenuFeatureItem[] = [
  {
    id: "ai-automation",
    label: "AI AUTOMATION",
    thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&q=80",
    href: "/features/automation",
  },
  {
    id: "campaigns",
    label: "CAMPAIGNS",
    thumb: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=160&q=80",
    href: "/features/campaigns",
  },
  {
    id: "instagram-auto-dm",
    label: "INSTAGRAM AUTO DM",
    thumb: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=160&q=80",
    href: "/features/auto-dm",
  },
  {
    id: "facebook-auto-dm",
    label: "FACEBOOK AUTO DM",
    thumb: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=160&q=80",
    href: "/features/auto-dm",
  },
  {
    id: "knowledge-base",
    label: "KNOWLEDGE BASE",
    thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=160&q=80",
    href: "/features/knowledge-base",
  },
  {
    id: "unified-inbox",
    label: "UNIFIED INBOX",
    thumb: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=160&q=80",
    href: "/features/unified-inbox",
  },
  {
    id: "analytics",
    label: "ANALYTICS",
    thumb: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=160&q=80",
    href: "/features/analytics",
  },
  {
    id: "partner-marketing",
    label: "PARTNER MARKETING",
    thumb: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=160&q=80",
    href: "/features/partner-marketing",
  },
  {
    id: "chat-widget",
    label: "CHAT WIDGET",
    thumb: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=160&q=80",
    href: "/features/chat-widget",
  },
];

export const SUBMENU_INTEGRATIONS: SubmenuFeatureItem[] = [
  {
    id: "instagram",
    label: "INSTAGRAM",
    thumb: "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=160&q=80",
    href: "/integrations",
  },
  {
    id: "whatsapp",
    label: "WHATSAPP",
    thumb: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=160&q=80",
    href: "/integrations",
  },
  {
    id: "facebook",
    label: "FACEBOOK",
    thumb: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=160&q=80",
    href: "/integrations",
  },
  {
    id: "telegram",
    label: "TELEGRAM",
    thumb: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=160&q=80",
    href: "/integrations",
  },
  {
    id: "linkedin",
    label: "LINKEDIN",
    thumb: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=160&q=80",
    href: "/integrations",
  },
  {
    id: "x",
    label: "X (TWITTER)",
    thumb: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&q=80",
    href: "/integrations",
  },
];

/**
 * Submenu Row: transforms into white pill with horizontal scrolling preview thumbnails on hover
 */
export function ImageMarqueeSubmenuRow({
  item,
  onClick,
}: {
  item: SubmenuFeatureItem;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-11 w-full block cursor-pointer overflow-hidden rounded-xl transition-colors duration-200"
      style={{ backgroundColor: hovered ? "#FAF8F5" : "transparent" }}
    >
      {!hovered ? (
        <div className="flex h-full items-center justify-between px-3">
          <span className="font-anton text-xl sm:text-2xl tracking-tight text-white uppercase">
            {item.label}
          </span>
          <span className="text-sm font-bold text-white/50">→</span>
        </div>
      ) : (
        <motion.div
          initial={{ x: "0%" }}
          animate={{ x: "-50%" }}
          transition={{ repeat: Infinity, ease: "linear", duration: 5 }}
          className="flex h-full w-max items-center gap-4 px-3 text-[#161615]"
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0">
              <span className="font-anton text-xl sm:text-2xl tracking-tight uppercase">
                {item.label}
              </span>
              <img
                src={item.thumb}
                alt={item.label}
                className="h-7 w-11 rounded-md object-cover shadow-xs"
              />
            </div>
          ))}
        </motion.div>
      )}
    </Link>
  );
}

/**
 * Dynamic Island Menu with Anton condensed typography and zero blur glitches
 */
export function DynamicIslandMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");

  // Lock background scroll and pause Lenis while menu is open to prevent glitches
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined" && window.__lenis) {
        window.__lenis.stop();
      }
    } else {
      document.body.style.overflow = "";
      if (typeof window !== "undefined" && window.__lenis) {
        window.__lenis.start();
      }
    }
    return () => {
      document.body.style.overflow = "";
      if (typeof window !== "undefined" && window.__lenis) {
        window.__lenis.start();
      }
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((prev) => {
      if (prev) {
        setTimeout(() => setView("main"), 220);
      }
      return !prev;
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
    setTimeout(() => setView("main"), 220);
  };

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const slideTransition = { duration: 0.18, ease: [0.25, 1, 0.5, 1] as const };

  const menuNavItems = [
    { label: "AI AUTOMATION", href: "/features/automation", highlight: true },
    { label: "HOME", href: "/", active: true },
    { label: "FEATURES", sub: "features" as const },
    { label: "INTEGRATIONS", sub: "integrations" as const },
    { label: "PRICING", href: "/pricing" },
    { label: "ABOUT", href: "/about" },
    { label: "BLOG", href: "/blog" },
    { label: "FAQS", href: "#faq" },
    { label: "CONTACT", href: "/contact" },
  ];

  return (
    <>
      {/* High-Contrast Backdrop Overlay without redundant blur to eliminate GPU compositing bugs */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMenu}
            style={{ zIndex: 9990 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Center Trigger Pill Container */}
      <div className="relative flex flex-col items-center" style={{ zIndex: 9995 }}>
        {/* Trigger Pill with Inverted SVG Corner Wings */}
        <motion.button
          onClick={toggleMenu}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="group relative flex h-10 sm:h-11 min-w-[105px] sm:min-w-[115px] items-center justify-center gap-2 rounded-b-2xl sm:rounded-b-[1.2rem] bg-[#161615] px-5 sm:px-7 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EE7D60] cursor-pointer border-b border-x border-white/10"
        >
          {/* Left Inverted Corner SVG Wing */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 25 25"
            fill="currentColor"
            aria-hidden="true"
            className="pointer-events-none absolute translate-x-px top-0 -left-[21px] text-[#161615]"
          >
            <path d="M0 0H25V25C25 11.1929 13.8071 0 0 0Z" />
          </svg>

          {isOpen ? (
            <>
              <span className="text-white text-xs font-bold leading-none">✕</span>
              <span className="font-medium text-xs sm:text-sm">Close</span>
            </>
          ) : (
            <>
              <span className="grid grid-cols-2 gap-1 shrink-0">
                {[...Array(4)].map((_, i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-white" />
                ))}
              </span>
              <span className="font-medium text-xs sm:text-sm">Menu</span>
            </>
          )}

          {/* Right Inverted Corner SVG Wing */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 25 25"
            fill="currentColor"
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-px top-0 -right-[21px] text-[#161615] hidden md:block"
          >
            <path d="M25 0H0V25C0 11.1929 11.1929 0 25 0Z" />
          </svg>
        </motion.button>

        {/* Expandable Dark Modal Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              style={{ zIndex: 10000 }}
              className="fixed top-12 sm:top-13 left-1/2 -translate-x-1/2 w-[330px] sm:w-[350px] max-w-[calc(100vw-24px)] max-h-[85vh] overflow-y-auto no-scrollbar rounded-[28px] bg-[#161615] p-5 sm:p-6 text-white shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/10 pointer-events-auto"
            >
              <AnimatePresence mode="wait" initial={false}>
                {view === "main" && (
                  <motion.div
                    key="main"
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -16, opacity: 0 }}
                    transition={slideTransition}
                    className="flex flex-col items-center space-y-1 py-1 w-full"
                  >
                    {menuNavItems.map((item) => {
                      if (item.sub) {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setView(item.sub)}
                            className="font-anton flex items-center gap-1.5 text-[30px] sm:text-[34px] leading-[1.1] tracking-tight text-[#8E8D88] hover:text-white transition-colors cursor-pointer group"
                          >
                            <span>{item.label}</span>
                            <span className="text-base font-normal opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                              ›
                            </span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href || "/"}
                          onClick={closeMenu}
                          className={`font-anton text-[30px] sm:text-[34px] leading-[1.1] tracking-tight transition-colors cursor-pointer flex items-center gap-2 ${
                            item.highlight
                              ? "text-amber-400 hover:text-amber-300"
                              : item.active
                              ? "text-[#F05A28]"
                              : "text-[#8E8D88] hover:text-white"
                          }`}
                        >
                          {item.highlight && <Sparkles className="w-6 h-6 text-amber-400 shrink-0 inline-block" />}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}

                {(view === "features" || view === "integrations") && (
                  <motion.div
                    key={view}
                    initial={{ x: 16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 16, opacity: 0 }}
                    transition={slideTransition}
                    className="w-full"
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                      <button
                        type="button"
                        onClick={() => setView("main")}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        ‹ Back
                      </button>
                      <span className="font-anton text-sm tracking-wider text-[#F05A28] uppercase">
                        {view}
                      </span>
                    </div>

                    <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1 no-scrollbar">
                      {(view === "features" ? SUBMENU_FEATURES : SUBMENU_INTEGRATIONS).map(
                        (item) => (
                          <ImageMarqueeSubmenuRow
                            key={item.id}
                            item={item}
                            onClick={closeMenu}
                          />
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Drawer CTA Footer (visible < md) */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2.5 md:hidden w-full">
                <Link href="/features/automation" onClick={closeMenu} className="w-full">
                  <button
                    type="button"
                    className="w-full h-11 rounded-full text-sm font-bold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI Automation Feature</span>
                  </button>
                </Link>
                <Link href="/register" onClick={closeMenu} className="w-full">
                  <button
                    type="button"
                    className="w-full h-11 rounded-full text-sm font-bold text-white bg-[#EE7D60] hover:bg-[#E56A4C] shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Start free</span>
                    <span>→</span>
                  </button>
                </Link>
                <Link href="/login" onClick={closeMenu} className="w-full">
                  <button
                    type="button"
                    className="w-full h-10 rounded-full text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    Sign In
                  </button>
                </Link>
              </div>

              {/* Persistent Social & Attribution Footer matching mysampark.com frame_008 */}
              <div className="mt-5 border-t border-white/10 pt-4 text-center w-full">
                <p className="text-[10px] font-bold tracking-[0.16em] text-white/50 uppercase">
                  Follow us on:
                </p>
                <div className="mt-2.5 flex justify-center gap-2.5">
                  {[
                    { label: "IG", href: "https://instagram.com" },
                    { label: "FB", href: "https://facebook.com" },
                    { label: "in", href: "https://linkedin.com" },
                    { label: "𝕏", href: "https://x.com" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-black transition-transform hover:scale-110 shadow-xs cursor-pointer"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-white/50">
                  A product by <strong className="text-white/80">Subhransu Nayak</strong>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/**
 * Top App Header integrating brand logo, Dynamic Island menu, and CTA buttons
 * Optimized for mobile, desktop, and tablet orientations
 */
export function MySamparkHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <header
        className={`fixed inset-x-0 top-0 pointer-events-none transition-all duration-300 ${
          scrolled
            ? "bg-[#F5F6F0]/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs pb-2.5"
            : "bg-transparent pb-1"
        }`}
        style={{ zIndex: 9980 }}
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-2 pt-2 sm:pt-2.5">
            {/* Left: QuickReply Brand Logo */}
            <div className="pointer-events-auto flex items-center justify-start">
              <MySamparkLogo size="sm" />
            </div>

            {/* Center: Dynamic Island Menu Trigger & Drawer */}
            <div className="pointer-events-auto flex justify-end md:justify-center mr-2 md:mr-0">
              <DynamicIslandMenu />
            </div>

            {/* Right: Quick Action Buttons matching mysampark.com */}
            <div className="pointer-events-auto hidden md:flex items-center justify-end gap-2 sm:gap-3">
              <Link href="/features/automation" className="inline-flex">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={tactileButtonTap}
                  transition={appleSpring}
                  type="button"
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-violet-400/30"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>AI Studio</span>
                </motion.button>
              </Link>

              <Link href="/login" className="hidden md:inline-block">
                <button
                  type="button"
                  className="h-9 px-4 rounded-full text-xs font-bold text-[#161615] hover:text-[#EE7D60] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </Link>

              <Link href="/register" className="hidden md:inline-flex">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={tactileButtonTap}
                  transition={appleSpring}
                  type="button"
                  className="h-9 sm:h-10 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#EE7D60] hover:bg-[#E56A4C] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Start free</span>
                  <span className="text-xs">→</span>
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default MySamparkHeader;
