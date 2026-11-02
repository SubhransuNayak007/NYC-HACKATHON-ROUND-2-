"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export interface PricingPlan {
  name: string;
  popular: boolean;
  theme: "white" | "blue";
  inr: string;
  usd: string;
  bonus: string | null;
  desc: string;
  cta: string;
  href: string;
  features: string[];
}

export const PLANS: PricingPlan[] = [
  {
    name: "FREE",
    popular: false,
    theme: "white",
    inr: "₹0",
    usd: "$0",
    bonus: null,
    desc: "Explore AI-powered social media automation with free credits. No credit card required.",
    cta: "Get started free",
    href: "/register",
    features: [
      "100 total AI reply credits",
      "Auto DM for Instagram & Facebook",
      "AI Product Knowledge Base",
      "Manual replies stay 100% free",
      "No hidden fees or seat limits",
    ],
  },
  {
    name: "STARTER",
    popular: true,
    theme: "blue",
    inr: "₹798",
    usd: "$9.98",
    bonus: "+ 100 bonus credits included",
    desc: "Perfect for creators and small businesses. Schedule posts, automate DMs, and grow faster with AI.",
    cta: "Get growth plan",
    href: "/register?plan=starter",
    features: [
      "1,100 total AI reply credits",
      "Auto DM for Instagram & Facebook",
      "AI Product Knowledge Base",
      "Manual replies stay 100% free",
      "No hidden fees or seat limits",
    ],
  },
  {
    name: "GROWTH",
    popular: false,
    theme: "white",
    inr: "₹1,598",
    usd: "$19.98",
    bonus: "+ 300 bonus credits included",
    desc: "Built for growing brands. AI content, comment automation, analytics, and campaign management.",
    cta: "Unlock full service",
    href: "/register?plan=growth",
    features: [
      "2,800 total AI reply credits",
      "Auto DM for Instagram & Facebook",
      "AI Product Knowledge Base",
      "Manual replies stay 100% free",
      "No hidden fees or seat limits",
    ],
  },
];

/**
 * Folder Pricing Section with protruding folder-tabs & currency switcher (00:39–00:45)
 */
export function FolderPricingSection() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  return (
    <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-32 pb-24">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="inline-block rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs mb-4">
            Transparent Pricing
          </span>
          <h1 className="font-anton text-5xl sm:text-6xl md:text-7xl text-[#161615] leading-[0.98]">
            PAY FOR REPLIES, NOT <br />
            FOR{" "}
            <span className="inline-block -rotate-2 rounded-2xl bg-[#F05A28] px-5 py-0.5 text-white shadow-md">
              SEATS.
            </span>
          </h1>
        </div>

        {/* ₹ INR / $ USD Pill Switcher (00:41 - 00:43) */}
        <div className="flex flex-col md:items-end gap-4">
          <p className="max-w-sm text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
            Simple credit-based pricing: 1 credit = 1 AI reply. Pay only for the
            replies you use — manual replies are always 100% free.
          </p>
          <div className="inline-flex rounded-full border border-black/10 bg-[#EFECE6] p-1 shadow-inner self-start md:self-auto">
            {(["INR", "USD"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className="relative rounded-full px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                {currency === curr && (
                  <motion.span
                    layoutId="currency-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-white shadow-xs"
                  />
                )}
                <span className={`relative z-10 ${currency === curr ? "text-[#161615]" : "text-neutral-500 hover:text-neutral-900"}`}>
                  {curr === "INR" ? "₹ INR" : "$ USD"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Folder-Tab Pricing Cards */}
      <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 items-stretch">
        {PLANS.map((plan) => {
          const isBlue = plan.theme === "blue";
          const bgHex = isBlue ? "#3478F6" : "#FFFFFF";

          return (
            <div key={plan.name} className="flex flex-col">
              {/* Top Folder Tab Row + Optional MOST POPULAR Pill in the Right Notch */}
              <div className="flex items-end justify-between">
                <div className="flex items-end">
                  <div
                    style={{ backgroundColor: bgHex }}
                    className={`flex h-12 px-7 items-center justify-center rounded-t-[20px] font-anton text-2xl shadow-xs select-none ${
                      isBlue ? "text-white" : "text-[#161615]"
                    }`}
                  >
                    {plan.name}
                  </div>
                  {/* Concave Inverted Fillet SVG */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="-ml-[1px]" aria-hidden="true">
                    <path d="M 0 0 Q 0 20 20 20 L 0 20 Z" fill={bgHex} />
                  </svg>
                </div>

                {plan.popular && (
                  <span className="mb-2 rounded-full border border-black/10 bg-white px-3.5 py-1 text-[10px] font-black tracking-wider uppercase text-[#161615] shadow-xs">
                    MOST POPULAR
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div
                style={{ backgroundColor: bgHex }}
                className={`flex flex-1 flex-col justify-between rounded-b-[28px] rounded-tr-[28px] p-8 shadow-sm ${
                  isBlue ? "text-white" : "text-[#161615]"
                }`}
              >
                <div>
                  <p className={`text-xs leading-relaxed font-medium ${isBlue ? "text-white/85" : "text-neutral-500"}`}>
                    {plan.desc}
                  </p>

                  {/* Price Box */}
                  <div
                    className={`mt-6 rounded-2xl p-4 transition-all ${
                      isBlue ? "bg-white text-[#161615] shadow-xs" : "bg-neutral-50 border border-neutral-100 px-4"
                    }`}
                  >
                    <div className="font-anton text-5xl tracking-tight">
                      {currency === "INR" ? plan.inr : plan.usd}
                    </div>
                    {plan.bonus && (
                      <span className="mt-2 inline-block rounded-md bg-[#F05A28] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                        {plan.bonus}
                      </span>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3 border-t border-current/10 pt-6 text-xs font-medium">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5">
                        <span className={`font-bold ${isBlue ? "text-white" : "text-emerald-600"}`}>
                          ✓
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={plan.href} className="mt-8 block">
                  <button
                    type="button"
                    className={`w-full rounded-full py-3.5 text-xs font-bold transition-transform hover:scale-[1.02] cursor-pointer shadow-xs ${
                      isBlue
                        ? "bg-white text-[#161615] hover:bg-neutral-100"
                        : "bg-[#161615] text-white hover:bg-black"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#161616] font-sans selection:bg-[#EE7D60]/20">
      <MySamparkHeader />
      <main className="flex-1">
        <FolderPricingSection />
      </main>
      <MySamparkFooter />
    </div>
  );
}
