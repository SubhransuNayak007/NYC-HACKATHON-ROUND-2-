"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "How does QuickReply connect to WhatsApp without ban risk?",
    a: "QuickReply supports dual connectivity: you can pair your existing phone number via a standard Baileys Web session (1-scan QR code) with built-in human rate limits, or connect via the official Meta WhatsApp Cloud API. Both methods operate with zero simulated mock data and strict compliance guardrails.",
  },
  {
    q: "How do you guarantee the AI will not hallucinate or quote wrong prices?",
    a: "Our Neural RAG engine uses deterministic fact grounding. Before any response is generated, the AI queries your indexed catalog and order database for exact prices, variant stock, and shipping terms. If a fact is unverified or confidence falls below threshold, the Action Firewall gates the reply.",
  },
  {
    q: "Does QuickReply support Indian languages like Hindi and Hinglish?",
    a: "Yes. QuickReply automatically detects incoming customer language and responds naturally in English, Hindi (Devanagari), or Hinglish (Latin-script conversational Hindi), adapting its tone according to your brand voice configuration.",
  },
  {
    q: "What is the Zero-Dashboard 2-Way WhatsApp Approval system?",
    a: "For high-risk actions like approving a customer refund or modifying delivery addresses, the Action Firewall intercepts the request and sends an alert directly to the business owner's personal WhatsApp. The owner simply replies 'APPROVE [token]' to execute without ever needing to open the web dashboard.",
  },
  {
    q: "Can human agents take over a live conversation at any time?",
    a: "Yes. When a human agent types a message in the unified inbox or replies from their paired physical phone, QuickReply immediately pauses autonomous AI replies for that conversation and marks it as handled by human.",
  },
  {
    q: "How long does onboarding and training take?",
    a: "You can be fully live in under 5 minutes. Connect your channels, upload your store catalog CSV or PDF policy docs, and turn on the autonomous engine.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#FAF8F5] dark:bg-[#050810] border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block font-mono">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white">
            Everything you need to know.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            Clear answers about connectivity, AI accuracy, security, and onboarding.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] overflow-hidden transition-colors shadow-2xs"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-[#111827] dark:text-slate-100">
                    {faq.q}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#F4F2EE] dark:bg-zinc-800 border border-black/[0.06] dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
