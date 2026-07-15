"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Search,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Zap,
  CreditCard,
  Layers,
  Database,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

type FAQCategory = "all" | "setup" | "rag" | "pricing" | "channels" | "security";

interface FAQItem {
  q: string;
  a: string;
  category: "setup" | "rag" | "pricing" | "channels" | "security";
}

const FAQ_DATA: FAQItem[] = [
  // Setup & Onboarding
  {
    q: "How do I get started with QuickReply?",
    a: "Getting started takes less than 2 minutes. Sign up for a free account, connect your social profiles (Instagram, Facebook, WhatsApp, LinkedIn, or Telegram) using official OAuth, and upload your product catalog CSV or Shopify store URL. Switch on Auto DM and your first automated reply goes live immediately.",
    category: "setup",
  },
  {
    q: "Do I need coding knowledge or technical developers to install?",
    a: "No coding is required. Our point-and-click dashboard allows you to configure trigger keywords, upload product catalogs, and review automated conversation telemetry with zero engineering overhead.",
    category: "setup",
  },
  {
    q: "Can I test responses before turning them on for live customers?",
    a: "Yes! Every account includes an Interactive Simulator sandbox where you can type test comments and DMs to verify how the AI retrieves pricing, recommends sizes, and applies discounts before going live.",
    category: "setup",
  },

  // AI Catalog RAG
  {
    q: "How does the AI Product Knowledge Base avoid hallucinations?",
    a: "Unlike generic chatbots that make up facts, QuickReply uses Neural RAG (Retrieval-Augmented Generation). Every customer question is converted into a vector embedding and matched against your exact uploaded catalog, real-time Shopify inventory, and return policy docs. If an item or price is not in your catalog, the AI gracefully escalates to a human agent.",
    category: "rag",
  },
  {
    q: "Can the AI handle complex sizing advice like 'Does this run small?'",
    a: "Yes. When you upload size charts and fit model notes, the vector engine semantic index matches customer measurements (e.g. 'I am 5\\'8\" and weigh 68kg') to your recommended size based on deterministic brand data.",
    category: "rag",
  },
  {
    q: "What happens if a product goes out of stock in Shopify?",
    a: "Our real-time webhook connector immediately updates the AI knowledge base in under 2 seconds. The AI will inform the customer that the SKU is temporarily sold out and intelligently recommend similar in-stock catalog items.",
    category: "rag",
  },

  // Credits & Pricing
  {
    q: "How does the credit-based pricing model work?",
    a: "Pricing is 100% fair and transparent: 1 credit = 1 automated AI reply. You only spend credits when our AI actively answers a customer comment or private DM for you. We never charge for user seats, and human replies inside the unified inbox are 100% free forever.",
    category: "pricing",
  },
  {
    q: "Do manual replies by human agents cost any credits?",
    a: "No. Manual replies sent by you or your team members inside the QuickReply Unified Inbox cost zero credits and are completely unlimited on all plans.",
    category: "pricing",
  },
  {
    q: "What happens if my account runs out of credits?",
    a: "Your automated AI replies pause gracefully and conversations queue in your Unified Inbox so you can reply manually for free. Your social connections never disconnect, and you can top up credits with 1 click.",
    category: "pricing",
  },
  {
    q: "Are there any contracts, hidden fees, or cancellation penalties?",
    a: "None. All plans are pay-as-you-go with month-to-month flexibility. You can cancel, upgrade, or downgrade anytime directly from your billing settings.",
    category: "pricing",
  },

  // Multi-Channel Channels
  {
    q: "Which social media platforms and channels are supported?",
    a: "QuickReply natively supports Instagram (Reels, Posts, Stories, DMs), WhatsApp Business (Cloud API & Local Baileys connector), Telegram Bot API, LinkedIn (Personal & Company Pages), Facebook Pages & Messenger, X (Twitter API v2), and YouTube (Shorts & Videos).",
    category: "channels",
  },
  {
    q: "Can I connect multiple Instagram or WhatsApp accounts to one dashboard?",
    a: "Yes! Our Growth and Professional tiers allow you to connect multiple brand profiles, phone numbers, and storefronts into one unified team workspace.",
    category: "channels",
  },
  {
    q: "How does Comment-to-DM automation work on Instagram Reels?",
    a: "When a user comments a trigger keyword (such as 'price', 'link', 'size', or 'info') under your Reel, QuickReply posts a randomized public comment reply within 1.2s to boost algorithm reach, and sends a private DM with the exact product card and 1-click checkout link.",
    category: "channels",
  },

  // Security & Compliance
  {
    q: "Will my Instagram or WhatsApp account get banned or flagged as spam?",
    a: "No. QuickReply uses official Meta Graph API webhooks and WhatsApp Cloud APIs. We implement humanized jitter delays (1.2s to 4.5s), dynamic randomized reply variations, and strict rate-limiting to ensure 100% account safety and TOS compliance.",
    category: "security",
  },
  {
    q: "How is my customer data and payment information protected?",
    a: "We implement enterprise AES-256-GCM encryption at rest and TLS 1.3 in transit. We never store customer passwords or raw credit card data, and our infrastructure is fully SOC-2 Type II ready and GDPR compliant.",
    category: "security",
  },
  {
    q: "What is the 2-Way WhatsApp Action Firewall?",
    a: "For high-risk operations (such as approving custom discounts above 20% or processing refunds over ₹2,000), our Action Firewall intercepts the request and pings the store owner's personal WhatsApp for 1-tap authorization before execution.",
    category: "security",
  },
];

export default function FAQPage() {
  const [selectedCat, setSelectedCat] = useState<FAQCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const categories = [
    { id: "all", label: "All Questions" },
    { id: "setup", label: "Setup & Onboarding" },
    { id: "rag", label: "AI Catalog RAG" },
    { id: "pricing", label: "Credits & Pricing" },
    { id: "channels", label: "Multi-Channel Channels" },
    { id: "security", label: "Security & Compliance" },
  ];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCat = selectedCat === "all" || item.category === selectedCat;
    const matchesSearch =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Headline */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <span className="w-2 h-2 rounded-full bg-[#EE7D60]" />
              Knowledge Center
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black tracking-[-0.03em] text-[#161616] uppercase leading-[0.98] mb-6">
              FREQUENTLY ASKED <br />
              <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
                QUESTIONS.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Everything you need to know about setting up, AI catalog grounding, credit pricing, multi-channel connections, and enterprise security.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-10">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search across questions, topics, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-13 pl-12 pr-5 rounded-2xl bg-white border border-black/10 text-sm text-[#161616] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40 shadow-sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-14">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCat(cat.id as FAQCategory);
                  setOpenIdx(null);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCat === cat.id
                    ? "bg-[#161616] text-white shadow-md"
                    : "bg-white text-slate-600 border border-black/5 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion / Cards List */}
          <div className="space-y-4 max-w-4xl mx-auto mb-20">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-black/5">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#161616]">No matching questions found</h3>
                <p className="text-xs text-slate-500 mt-1">Try searching for &quot;pricing&quot;, &quot;catalog&quot;, or &quot;Instagram&quot;</p>
              </div>
            ) : (
              filteredFaqs.map((faq, i) => {
                const isOpen = openIdx === i;
                return (
                  <div
                    key={i}
                    className="rounded-[24px] bg-white border border-black/5 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : i)}
                      className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#EE7D60] shrink-0" />
                        <h3 className="font-extrabold text-base sm:text-lg text-[#161616] leading-snug">
                          {faq.q}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? "rotate-180 text-[#EE7D60]" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-black/5 pl-11">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Support Banner */}
          <div className="rounded-[32px] bg-white border border-black/5 p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-sm space-y-4">
            <h3 className="text-2xl font-black text-[#161616]">
              Still have a specific question about your store?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Our automation engineers can review your product catalog and test sample responses for you.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors shadow-xs"
              >
                <span>Contact Engineering Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#EE7D60] text-white text-xs font-bold hover:bg-[#E06C4F] transition-colors shadow-xs"
              >
                <span>Start Free (100 Credits)</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
