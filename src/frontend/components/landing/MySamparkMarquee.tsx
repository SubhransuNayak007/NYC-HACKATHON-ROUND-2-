"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  MessageSquare,
  Globe,
  ShoppingBag,
  Send,
} from "lucide-react";
import { appleSpring } from "@/frontend/lib/physicsMotion";

const PLATFORMS = [
  { name: "WhatsApp", icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
  { name: "Instagram", icon: <Instagram className="w-4 h-4 text-rose-500" /> },
  { name: "Telegram", icon: <Send className="w-4 h-4 text-sky-500" /> },
  { name: "Facebook", icon: <Facebook className="w-4 h-4 text-blue-600" /> },
  { name: "LinkedIn", icon: <Linkedin className="w-4 h-4 text-sky-600" /> },
  { name: "X (Twitter)", icon: <Twitter className="w-4 h-4 text-[#161616]" /> },
  { name: "YouTube", icon: <Youtube className="w-4 h-4 text-red-500" /> },
  { name: "Pinterest", icon: <Globe className="w-4 h-4 text-red-600" /> },
  { name: "WordPress", icon: <Globe className="w-4 h-4 text-blue-500" /> },
  { name: "Shopify", icon: <ShoppingBag className="w-4 h-4 text-emerald-600" /> },
];

export function MySamparkMarquee() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const [isInView, setIsInView] = React.useState(true);

  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-12 bg-[#F5F6F0] border-t border-b border-black/5 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 text-center mb-6">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-500">
          Your customers are everywhere. So is QuickReply.
        </p>
      </div>

      <style>{`
        .animate-marquee-left-track {
          animation: marquee-left 35s linear infinite;
          animation-play-state: ${isInView ? "running" : "paused"};
          will-change: transform;
        }
        .animate-marquee-left-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-left-track {
            animation: none !important;
          }
        }
      `}</style>

      {/* Infinite Flowing Marquee */}
      <div className="relative w-full overflow-hidden">
        <div className="flex gap-6 sm:gap-10 animate-marquee-left-track whitespace-nowrap px-4 items-center">
          <div className="flex gap-6 sm:gap-10 items-center shrink-0">
            {PLATFORMS.map((p, idx) => (
              <motion.div
                key={`p-${idx}`}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={appleSpring}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full liquid-glass-control text-xs sm:text-sm font-bold text-[#161616] shrink-0 cursor-pointer select-none"
              >
                {p.icon}
                <span>{p.name}</span>
              </motion.div>
            ))}
          </div>
          <div aria-hidden="true" inert={true} className="flex gap-6 sm:gap-10 items-center shrink-0">
            {PLATFORMS.map((p, idx) => (
              <motion.div
                key={`p-dup-${idx}`}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={appleSpring}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full liquid-glass-control text-xs sm:text-sm font-bold text-[#161616] shrink-0 cursor-pointer select-none"
              >
                {p.icon}
                <span>{p.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Edge Fade Gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#F5F6F0] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#F5F6F0] to-transparent z-10" />
      </div>
    </section>
  );
}
