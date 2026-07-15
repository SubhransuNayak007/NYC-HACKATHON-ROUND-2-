"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ChevronDown } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export default function PricingPage() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const PRICING_TIERS = [
    {
      name: "FREE",
      description: "Explore AI-powered social media automation with free credits. No credit card required.",
      price: currency === "INR" ? "₹0" : "$0",
      credits: "100 total AI reply credits",
      bonus: null,
      popular: false,
      features: [
        "100 total AI reply credits",
        "Auto DM for Instagram & Facebook",
        "AI Product Knowledge Base",
        "Manual replies stay 100% free",
        "No hidden fees or seat limits",
      ],
      btnText: "Get started",
      btnClass: "bg-[#161616] text-white hover:bg-black",
      cardClass: "bg-white border border-black/10",
    },
    {
      name: "STARTER",
      description: "Perfect for creators and small businesses. Schedule posts, automate DMs, and grow faster with AI.",
      price: currency === "INR" ? "₹399" : "$5",
      credits: "1,000 total AI reply credits",
      bonus: "+ 100 bonus credits included",
      popular: true,
      popularText: "MOST POPULAR",
      features: [
        "1,000 total AI reply credits",
        "Auto DM for Instagram & Facebook",
        "AI Product Knowledge Base",
        "Manual replies stay 100% free",
        "No hidden fees or seat limits",
      ],
      btnText: "Get growth plan",
      btnClass: "bg-[#2563EB] text-white hover:bg-blue-700",
      cardClass: "bg-[#2563EB] text-white",
    },
    {
      name: "GROWTH",
      description: "Built for growing brands. AI content, comment automation, analytics, and campaign management.",
      price: currency === "INR" ? "₹799" : "$10",
      credits: "4,000 total AI reply credits",
      bonus: "+ 500 bonus credits included",
      popular: false,
      features: [
        "4,000 total AI reply credits",
        "Auto DM for Instagram & Facebook",
        "AI Product Knowledge Base",
        "Manual replies stay 100% free",
        "No hidden fees or seat limits",
      ],
      btnText: "Unlock full service",
      btnClass: "bg-[#161616] text-white hover:bg-black",
      cardClass: "bg-white border border-black/10",
    },
    {
      name: "PROFESSIONAL",
      description: "Complete AI automation for teams with smart replies, unified inbox, analytics, and campaigns.",
      price: currency === "INR" ? "₹1,599" : "$20",
      credits: "9,500 total AI reply credits",
      bonus: "+ 1,500 bonus credits included",
      popular: true,
      popularText: "MOST POPULAR",
      features: [
        "9,500 total AI reply credits",
        "Auto DM for Instagram & Facebook",
        "AI Product Knowledge Base",
        "Manual replies stay 100% free",
        "No hidden fees or seat limits",
      ],
      btnText: "Get growth plan",
      btnClass: "bg-[#2563EB] text-white hover:bg-blue-700",
      cardClass: "bg-[#2563EB] text-white",
    },
    {
      name: "BUSINESS",
      description: "Enterprise-ready AI automation with partner marketing, priority workflows, and high-volume campaigns.",
      price: currency === "INR" ? "₹3,199" : "$40",
      credits: "18,000 total AI reply credits",
      bonus: "+ 3,000 bonus credits included",
      popular: false,
      features: [
        "18,000 total AI reply credits",
        "Auto DM for Instagram & Facebook",
        "AI Product Knowledge Base",
        "Manual replies stay 100% free",
        "No hidden fees or seat limits",
      ],
      btnText: "Unlock full service",
      btnClass: "bg-white text-[#161616] hover:bg-slate-100",
      cardClass: "bg-[#161616] text-white",
    },
  ];

  const PRICING_FAQS = [
    {
      q: "How does credit-based pricing work?",
      a: "Pricing is simple: 1 credit = 1 AI reply. Credits are only spent when AI replies for you. Choose your plan, get a pool of credits, and spend them as you grow — and if you ever reply manually yourself, that costs 0 credits.",
    },
    {
      q: "What counts as one credit?",
      a: "Credits are only used for AI replies. Each automated message QuickReply sends for you — a comment-to-DM reply, a public comment reply, or an AI Product Reply answer — uses one credit. Replying manually yourself is always free.",
    },
    {
      q: "Is it really pay as you go?",
      a: "Yes. There are no seats and no long-term contracts. Start free, and when you need more replies, top up with the plan that fits. You only pay for the credits you use.",
    },
    {
      q: "Do paid plans include bonus credits?",
      a: "Most paid plans add bonus credits on top of your base credits, so you get more AI replies for the same price. The total credits shown on each plan is what you can spend.",
    },
    {
      q: "Which currency will I be charged in?",
      a: "Prices are shown in ₹ (INR) for customers in India and $ (USD) elsewhere, detected automatically from your location.",
    },
    {
      q: "Can I start without paying?",
      a: "Yes. The Free plan gives you starter credits so you can connect an account, switch on Auto DM, and see your first automated reply go out before you upgrade — no credit card required.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16 pt-4">
            <div>
              <div className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600 bg-white border border-black/5 shadow-2xs mb-4">
                Pricing plans
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#161616] uppercase leading-[0.95]">
                PAY FOR REPLIES, <br />
                NOT FOR <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">SEATS.</span>
              </h1>
            </div>

            <div className="max-w-md space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Simple credit-based pricing: 1 credit = 1 AI reply. Pay only for the replies you use — manual replies
                are always 100% free.
              </p>

              {/* Currency Toggle */}
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-black/10 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrency("INR")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currency === "INR" ? "bg-[#161616] text-white" : "text-slate-600 hover:text-black"
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currency === "USD" ? "bg-[#161616] text-white" : "text-slate-600 hover:text-black"
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {PRICING_TIERS.map((tier) => {
              const isBlue = tier.cardClass.includes("bg-[#2563EB]");
              const isBlack = tier.cardClass.includes("bg-[#161616]");

              return (
                <div
                  key={tier.name}
                  className={`rounded-3xl p-7 flex flex-col justify-between shadow-md relative transition-transform hover:-translate-y-1 ${tier.cardClass}`}
                >
                  {tier.popular && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#161616] text-white font-bold text-[10px] tracking-wider uppercase">
                      {tier.popularText}
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">{tier.name}</h3>
                    <p
                      className={`text-xs min-h-[36px] mb-6 leading-relaxed ${
                        isBlue || isBlack ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {tier.description}
                    </p>

                    <div className="mb-4">
                      <span className="text-4xl sm:text-5xl font-black">{tier.price}</span>
                    </div>

                    {tier.bonus && (
                      <div className="inline-block px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold mb-6">
                        {tier.bonus}
                      </div>
                    )}

                    <div className="space-y-3 pt-4 border-t border-current/10 mb-8">
                      {tier.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs font-medium">
                          <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    href="/signup"
                    className={`w-full py-3.5 rounded-2xl text-center text-xs font-bold transition-all shadow-xs block ${tier.btnClass}`}
                  >
                    {tier.btnText}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pricing FAQ Section */}
          <div className="max-w-4xl mx-auto pt-12 border-t border-black/10">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">FAQ</div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#161616] uppercase">
                QUESTIONS ABOUT CREDITS AND <span className="text-[#E8590C]">BILLING.</span>
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600">
                Short answers on how credits, replies, and pay-as-you-go billing work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PRICING_FAQS.map((faq, i) => (
                <div key={i} className="rounded-3xl bg-white border border-black/5 p-6 shadow-xs">
                  <h3 className="font-bold text-sm sm:text-base text-[#161616] mb-2">{faq.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
