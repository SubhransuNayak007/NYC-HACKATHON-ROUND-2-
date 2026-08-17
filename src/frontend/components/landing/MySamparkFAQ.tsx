"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Sparkles, HelpCircle } from "lucide-react";
import { appleFluid, appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

const FAQ_ITEMS = [
  {
    q: "Why do businesses worldwide trust QuickReply over other auto-reply platforms?",
    a: "From solo creators to multi-million dollar global brands, merchants choose QuickReply because it couples genuine AI intelligence — trained directly on your live product catalog, pricing tiers, and shipping FAQs — with fair, transparent usage-based pricing that scales with your growth.",
  },
  {
    q: "What is QuickReply and how does it work?",
    a: "QuickReply is an autonomous AI sales assistant that answers your Instagram, WhatsApp, Facebook, LinkedIn, X, and YouTube comments and DMs in 1.4 seconds. It syncs with your product catalog, provides 1-click checkout links, schedules cross-platform posts, and consolidates all customer conversations into a single unified inbox.",
  },
  {
    q: "Can the AI answer complex questions like 'will this fit me?' or 'which one is better?'",
    a: "Yes, absolutely. Because the AI is grounded in your uploaded size charts, material specifications, and product variants, it answers consultative buying questions just like your best in-store sales associate.",
  },
  {
    q: "Does it use my real prices and stock levels?",
    a: "Yes — QuickReply answers strictly from the live catalog you upload or connect via Shopify/WooCommerce/CSV. It never hallucinates prices or quotes out-of-date stock, ensuring 100% pricing accuracy.",
  },
  {
    q: "What is comment-to-DM automation?",
    a: "When a potential buyer comments a keyword like 'price', 'link', or 'size' on your post, Reel, or ad, QuickReply instantly posts a public reply for social proof and immediately slides into their DM with the exact product details, size guide, and direct checkout link.",
  },
  {
    q: "How do I get started?",
    a: "Setup takes under 15 minutes. Sign up for a free account, connect your social channels with 1-click OAuth, and upload your product catalog or website link. Turn on Auto DM and your first automated replies start converting customers immediately.",
  },
];

export function MySamparkFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-24 bg-[#F5F6F0]" id="faq">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[#EE7D60]" />
            <span>FAQs</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight">
            FREQUENTLY ASKED <br className="hidden sm:inline" />
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              QUESTIONS.
            </span>
          </h2>
          <p className="mt-3 text-sm text-slate-600 font-medium">
            The short answers. Everything you need to know to get started.
          </p>
        </div>

        {/* 2-Column FAQ Grid with Spring Physics Accordion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-[28px] bg-white border transition-all duration-200 p-7 sm:p-8 cursor-pointer select-none ${
                  isOpen
                    ? "border-black/15 shadow-md ring-2 ring-black/5"
                    : "border-black/5 shadow-xs hover:shadow-sm"
                }`}
                onClick={() => toggle(idx)}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-extrabold text-base sm:text-lg text-[#161616] leading-snug">
                    {item.q}
                  </h3>
                  {/* Plus / Minus Animated Roundel */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={appleSpring}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                      isOpen ? "bg-[#EE7D60] text-white" : "bg-zinc-100 text-[#161616] group-hover:bg-zinc-200"
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                  </motion.div>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={appleFluid}
                      className="overflow-hidden"
                    >
                      <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-black/5 pt-4 font-normal">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

