"use client";

import React from "react";
import Link from "next/link";
import {
  Bot,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Code,
  Zap,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { StorefrontWidgetMockup } from "@/frontend/components/landing/graphics/StorefrontWidgetMockup";

export default function StorefrontWidgetFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Autonomous Web Storefront Concierge
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              LIVE AI SALES AGENT <br />
              <span className="text-teal-600">ON YOUR WEBSITE</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Embed a single line of script to add an intelligent shopping assistant to your store. It answers sizing queries, checks warehouse stock in real-time, and transfers seamlessly to WhatsApp in 1 click.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#E0EEDC] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Interactive Storefront Demo
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Try Product Search &amp; 1-Click WhatsApp Handoff
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-teal-800 rounded-full border border-black/5">
                ⚡ 1.1s Response Time
              </span>
            </div>

            <StorefrontWidgetMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Convert Window Shoppers Into Buyers
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Over 70% of store visitors abandon because they couldn&apos;t find sizing or shipping info fast enough.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <Code className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                1-Line Universal Embed
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Copy and paste one async script tag into your Shopify theme, Webflow header, or Next.js layout. Weighs under 12kb with zero performance impact on Google Lighthouse.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100/100 Core Web Vitals
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fully custom theme styling
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                1-Click WhatsApp Transfer
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                When visitors want to continue chatting on mobile, 1 click transfers the entire conversation, selected product SKU, and cart link straight into their personal WhatsApp.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Full context preservation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Direct phone lead capture
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Live In-Chat Cart Additions
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Shoppers can add recommended products to their website shopping cart directly from inside the chat widget without ever leaving the page.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Shopify Storefront API Ready
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Coupon Validation
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Add An AI Assistant To Your Store
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Takes 60 seconds to install. Boost your website conversion rates immediately.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all shadow-lg"
              >
                <span>Get Embed Code Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MySamparkFooter />
    </div>
  );
}
