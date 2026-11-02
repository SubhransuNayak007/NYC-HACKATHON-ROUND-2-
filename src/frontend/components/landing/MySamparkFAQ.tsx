"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  q: string;
  a: string;
  category: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    category: "Product & Trust",
    q: "Why do businesses worldwide trust QuickReply over other auto-reply platforms?",
    a: "From solo boutique owners to scaling e-commerce brands, businesses choose QuickReply because it combines deterministic catalog grounding — ensuring your AI answers strictly from your verified pricing, sizing, and stock — with fair, usage-based credit pricing where manual human replies are 100% free forever.",
  },
  {
    category: "Capabilities",
    q: "What is QuickReply?",
    a: "QuickReply answers your Instagram, WhatsApp, and Facebook comments and DMs automatically using your verified product catalog. It also handles multi-platform scheduling, a unified inbox, and custom web chat in one place.",
  },
  {
    category: "Accuracy",
    q: "Can the AI answer questions like 'will this fit me?' or 'which size is in stock?'",
    a: "Yes. QuickReply indexes your verified products, dimensions, and sizing charts, so it accurately answers buying questions the way an experienced salesperson who knows the stock would, with zero fabricated prices.",
  },
  {
    category: "Integrations",
    q: "Does QuickReply quote my real prices and stock levels?",
    a: "Yes — it answers strictly from the catalog you upload or connect, not from guesses. If an inquiry cannot be matched with 100% certainty, the system abstains or routes to your human inbox rather than inventing details.",
  },
  {
    category: "Automation",
    q: "What is comment-to-DM automation?",
    a: "When someone comments a trigger keyword like 'price' or 'link' on your Instagram post or Reel, QuickReply posts a public comment reply and opens a private DM with exact product cards and direct checkout links automatically.",
  },
  {
    category: "Onboarding",
    q: "How do I get started?",
    a: "Sign up, connect your social accounts via official OAuth APIs, and upload your product catalog or website URL. Switch on Auto DM and your first automated reply goes live the same day.",
  },
];

export function MySamparkFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <section className="py-16 sm:py-24 bg-[#FAF8F5] border-t border-black/5" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-700 bg-white border border-black/10 shadow-xs mb-4">
            FAQs
          </span>
          <h2 className="font-anton text-4xl sm:text-5xl md:text-6xl text-[#161615] leading-[0.96]">
            FREQUENTLY ASKED <br />
            <span className="inline-block -rotate-2 rounded-[20px] bg-[#EE7D60] px-5 py-0.5 text-white shadow-xs mt-2">
              QUESTIONS.
            </span>
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-neutral-600 font-medium max-w-md mx-auto leading-relaxed">
            Clear answers on catalog grounding, official social APIs, and credit pricing.
          </p>
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 cols on tablet/desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            const contentId = `faq-answer-${idx}`;

            return (
              <div
                key={idx}
                className="rounded-[24px] sm:rounded-[28px] bg-white border border-black/10 p-5 sm:p-7 shadow-xs cursor-pointer select-none transition-all hover:shadow-md"
                onClick={() => toggle(idx)}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(idx);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#EE7D60] font-mono block">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-[#161615] leading-snug">
                      {item.q}
                    </h3>
                  </div>

                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 mt-1 ${
                      isOpen
                        ? "bg-[#EE7D60] text-white rotate-180 shadow-xs"
                        : "bg-neutral-100 text-neutral-600 rotate-0"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={contentId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-3 border-t border-black/5 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                        {item.a}
                      </div>
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

export default MySamparkFAQ;
