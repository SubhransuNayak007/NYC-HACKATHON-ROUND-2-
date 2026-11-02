"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

const ALL_FAQS = [
  {
    q: "Why do businesses choose QuickReply over other social automation platforms?",
    a: "QuickReply combines deterministic catalog grounding — ensuring the AI only quotes verified inventory and pricing from your store — with usage-based credit pricing. You only consume credits for AI-generated replies, while manual replies in your unified multi-channel inbox are 100% free and unlimited forever.",
  },
  {
    q: "How does QuickReply's credit pricing model work?",
    a: "QuickReply operates on transparent credit usage: 1 credit = 1 automated AI reply. Manual responses typed by human agents inside the unified inbox are completely free. Every account starts with free welcome credits, and unused monthly subscription credits roll over according to plan terms.",
  },
  {
    q: "What is QuickReply?",
    a: "QuickReply is an autonomous conversation operating system for social commerce. It answers comments and DMs across Instagram, WhatsApp, Facebook, YouTube, LinkedIn, and Telegram using verified data from your own product catalog, while scheduling content and consolidating messages into one inbox.",
  },
  {
    q: "Does QuickReply answer from my actual product stock and sizing charts?",
    a: "Yes. QuickReply indexes your uploaded catalog CSV or e-commerce store. Questions regarding sizes, available units, delivery timelines, and return policies are answered with deterministic facts rather than generic LLM hallucinations.",
  },
  {
    q: "How does comment-to-DM automation work?",
    a: "When a customer comments with trigger keywords like 'price', 'link', or 'buy' on your Instagram Reel or feed post, QuickReply immediately posts a public comment response and automatically sends a private direct message containing live product cards and direct checkout links.",
  },
  {
    q: "What happens if an automated AI reply cannot find verified catalog data?",
    a: "If a customer asks a question outside your verified catalog or policies, QuickReply's confidence gate intercepts the query. Instead of guessing, it provides a safe fallback or routes the conversation to your Human Review queue for manual staff follow-up.",
  },
  {
    q: "Can I connect multiple platforms to the same QuickReply workspace?",
    a: "Yes. You can connect WhatsApp Business Cloud API, Instagram Professional accounts, Facebook Pages, YouTube channels, LinkedIn company pages, and Telegram bots into a single unified workspace.",
  },
  {
    q: "Do manual replies by my human team cost any credits?",
    a: "No. Manual replies sent by you or your support staff inside the QuickReply unified inbox are 100% free and unlimited on all plans.",
  },
  {
    q: "What happens if I run out of credits?",
    a: "Automated replies pause gracefully until your next monthly renewal or until you top up credits. Your accounts remain connected, and your team can continue sending manual replies without interruption.",
  },
  {
    q: "Can I send private DMs to people who comment on Instagram Reels?",
    a: "Yes, QuickReply fully supports comment-to-DM conversion across Instagram Reels, feed posts, Stories, and Carousels via official Meta Graph APIs.",
  },
  {
    q: "How does QuickReply handle sensitive actions like refunds or discounts?",
    a: "QuickReply incorporates an Action Firewall. High-risk actions (such as issuing custom discounts or processing refund authorizations) cannot be executed autonomously without human staff confirmation.",
  },
  {
    q: "How fast does QuickReply respond to customer questions?",
    a: "QuickReply processes incoming webhooks and delivers responses typically within 1.2 to 2.5 seconds, significantly boosting impulse-purchase conversion compared to delayed manual replies.",
  },
];

export default function FAQPage() {
  const [filter, setFilter] = useState("");

  const filteredFaqs = filter.trim()
    ? ALL_FAQS.filter(
        (f) =>
          f.q.toLowerCase().includes(filter.toLowerCase()) ||
          f.a.toLowerCase().includes(filter.toLowerCase())
      )
    : ALL_FAQS;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Headline */}
          <div className="text-center max-w-4xl mx-auto mb-16 pt-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <HelpCircle className="w-4 h-4 text-[#EE7D60]" />
              <span>Knowledge Base &amp; Answers</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black tracking-[-0.03em] text-[#161616] uppercase leading-[0.98] mb-6">
              FREQUENTLY ASKED <br />
              QUESTIONS
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Everything you need to know about QuickReply auto-replies, catalog grounding, and multi-channel scheduling.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-xl mx-auto mb-14">
            <input
              type="text"
              placeholder="Search frequently asked questions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-12 px-5 rounded-2xl bg-white border border-black/10 text-sm text-[#161616] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40 shadow-xs"
            />
          </div>

          {/* 2-Column FAQ Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {filteredFaqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-[28px] bg-white border border-black/5 p-7 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-start"
              >
                <h3 className="font-extrabold text-base sm:text-lg text-[#161616] mb-3 leading-snug">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Callout */}
          <div className="text-center pt-8 border-t border-black/10">
            <p className="text-xs text-slate-500 font-medium mb-3">
              Ready to automate your social conversations with verified catalog grounding?
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Start Free Trial</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
