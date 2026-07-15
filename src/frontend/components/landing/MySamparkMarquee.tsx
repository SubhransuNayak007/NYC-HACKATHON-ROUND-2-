"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  MessageSquare,
} from "lucide-react";
import { appleSpring } from "@/frontend/lib/physicsMotion";

// Custom SVG Icons for authentic brand representation
function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PinterestIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

const PLATFORMS = [
  {
    name: "Instagram",
    icon: <Instagram className="w-4 h-4 text-[#E1306C]" />,
    tag: "Comments & DMs",
  },
  {
    name: "Facebook",
    icon: <Facebook className="w-4 h-4 text-[#1877F2]" />,
    tag: "Pages & Messenger",
  },
  {
    name: "X",
    icon: <XIcon className="w-4 h-4 text-[#0F1419]" />,
    tag: "Replies & DMs",
  },
  {
    name: "LinkedIn",
    icon: <Linkedin className="w-4 h-4 text-[#0A66C2]" />,
    tag: "Company Pages",
  },
  {
    name: "Pinterest",
    icon: <PinterestIcon className="w-4 h-4 text-[#BD081C]" />,
    tag: "Product Pins",
  },
  {
    name: "YouTube",
    icon: <Youtube className="w-4 h-4 text-[#FF0000]" />,
    tag: "Video Comments",
  },
  {
    name: "WhatsApp",
    icon: <MessageSquare className="w-4 h-4 text-[#25D366]" />,
    tag: "Direct Support",
  },
];

export function MySamparkMarquee() {
  return (
    <section className="py-12 bg-[#F5F6F0] border-t border-b border-black/5 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 text-center mb-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={appleSpring}
          className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-600"
        >
          Your customers are everywhere. So are we.
        </motion.p>
      </div>

      {/* Continuous Horizontal Ticker */}
      <div className="relative w-full overflow-hidden">
        <div className="flex gap-4 sm:gap-6 animate-marquee-left whitespace-nowrap px-4 items-center">
          {PLATFORMS.map((p, idx) => (
            <motion.div
              key={`p1-${idx}`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-black/5 shadow-xs text-xs sm:text-sm font-bold text-[#161616] shrink-0 cursor-pointer select-none transition-shadow hover:shadow-md"
            >
              <div className="shrink-0 flex items-center justify-center">
                {p.icon}
              </div>
              <span className="font-extrabold">{p.name}</span>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                {p.tag}
              </span>
            </motion.div>
          ))}
          {/* Duplicate set for infinite seamless loop */}
          {PLATFORMS.map((p, idx) => (
            <motion.div
              key={`p2-${idx}`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={appleSpring}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-black/5 shadow-xs text-xs sm:text-sm font-bold text-[#161616] shrink-0 cursor-pointer select-none transition-shadow hover:shadow-md"
            >
              <div className="shrink-0 flex items-center justify-center">
                {p.icon}
              </div>
              <span className="font-extrabold">{p.name}</span>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                {p.tag}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Edge Fade Gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F5F6F0] via-[#F5F6F0]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#F5F6F0] via-[#F5F6F0]/80 to-transparent" />
      </div>
    </section>
  );
}

