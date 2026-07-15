"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Instagram, Facebook, Linkedin, Twitter, Youtube, Globe, ShoppingBag } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

const INTEGRATIONS = [
  {
    name: "Instagram",
    description: "Schedule every format, and answer comments in DMs automatically.",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80",
    icon: <Instagram className="w-5 h-5 text-rose-500" />,
    badge: null,
  },
  {
    name: "Facebook",
    description: "Run every Page from one calendar, and reply through Messenger.",
    img: "https://images.unsplash.com/photo-1557838923-2985c318be48?w=600&auto=format&fit=crop&q=80",
    icon: <Facebook className="w-5 h-5 text-blue-600" />,
    badge: null,
  },
  {
    name: "LinkedIn",
    description: "Publish to your profile and your Page, and follow up on comments.",
    img: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=600&auto=format&fit=crop&q=80",
    icon: <Linkedin className="w-5 h-5 text-sky-600" />,
    badge: null,
  },
  {
    name: "X (Twitter)",
    description: "Schedule text, image, and video posts to keep your profile active.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    icon: <Twitter className="w-5 h-5 text-[#161616]" />,
    badge: null,
  },
  {
    name: "Pinterest",
    description: "Pin products and auto-reply to product questions.",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
    icon: <Globe className="w-5 h-5 text-red-600" />,
    badge: null,
  },
  {
    name: "YouTube",
    description: "Auto-reply to questions under Shorts and videos.",
    img: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&auto=format&fit=crop&q=80",
    icon: <Youtube className="w-5 h-5 text-red-500" />,
    badge: null,
  },
  {
    name: "WordPress",
    description: "Connect your WordPress site to sync pages and WooCommerce products.",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
    icon: <Globe className="w-5 h-5 text-blue-500" />,
    badge: null,
  },
  {
    name: "WhatsApp",
    description: "Connect WhatsApp Business API for 24/7 intelligent catalog lookup and orders.",
    img: "https://images.unsplash.com/photo-1556742049-0a67e5572293?w=600&auto=format&fit=crop&q=80",
    icon: <ShoppingBag className="w-5 h-5 text-emerald-600" />,
    badge: "Native API",
  },
];

const INTEGRATION_FAQS = [
  {
    q: "Which platforms can I connect?",
    a: "Instagram, Facebook, LinkedIn, X (Twitter), Pinterest, YouTube for posting and Auto DM, and WordPress/WhatsApp for instant catalog chat.",
  },
  {
    q: "Is Auto DM available on every platform?",
    a: "Auto DM turns comments into private conversations on Instagram, Facebook and LinkedIn. Every social platform supports scheduling, the unified inbox and analytics.",
  },
  {
    q: "Do I need a separate login for each account?",
    a: "No. Connect each account once through the platform's own authorisation screen and manage them together in one calm workspace.",
  },
  {
    q: "Can I schedule to several accounts at once?",
    a: "Yes. Publish the same post everywhere or tailor each version per platform, then queue it all from one place.",
  },
  {
    q: "How do connections stay secure?",
    a: "Every connection uses official platform APIs with enterprise AES-256 token encryption. We never store your passwords, and you can disconnect anytime.",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#161616] uppercase">
              OUR <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">INTEGRATIONS</span>
            </h1>
            <p className="mt-4 text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Connect the accounts you already post from. Pick one to see what it schedules, what it answers on its own,
              and what it needs before it can run.
            </p>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-24">
            {INTEGRATIONS.map((item) => (
              <div
                key={item.name}
                className="rounded-[28px] bg-white border border-black/5 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row gap-6 items-center justify-between hover:shadow-md transition-all"
              >
                <div className="w-full sm:w-44 h-36 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <h3 className="text-xl font-bold text-[#161616]">{item.name}</h3>
                    </div>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EE7D60]/10 text-[#EE7D60] text-[10px] font-bold uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Integrations FAQ */}
          <div className="max-w-4xl mx-auto pt-12 border-t border-black/10 mb-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-3">
                FAQs
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#161616] uppercase">
                QUESTIONS BEFORE YOU{" "}
                <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
                  CONNECT.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {INTEGRATION_FAQS.map((faq, i) => (
                <div key={i} className="rounded-[28px] bg-white border border-black/5 p-6 shadow-xs">
                  <h3 className="font-bold text-sm sm:text-base text-[#161616] mb-2">{faq.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Researching Floating Bar */}
          <div className="text-center pt-8 border-t border-black/5">
            <p className="text-xs text-slate-500 font-medium mb-3">
              Still researching? Ask AI what QuickReply can do for your business.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Start free</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
