"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

const MERCHANT_BENCHMARKS = [
  {
    category: "Shopify & Instagram Automation",
    badge: "Apparel & DTC Fashion",
    stat: "3.4x",
    statLabel: "DM-to-Checkout Conversion",
    highlight: "Instant size & stock replies from live catalog",
    metrics: [
      "1.2s avg response latency",
      "Zero missed overnight leads",
      "+₹1.8L monthly incremental GMV",
    ],
  },
  {
    category: "WhatsApp & Telegram Engine",
    badge: "Consumer Electronics",
    stat: "99.4%",
    statLabel: "Verified Catalog Accuracy",
    highlight: "Real-time specs, pricing & warranty verification",
    metrics: [
      "24/7 automated FAQ routing",
      "Direct live stock lookup",
      "Zero AI hallucinations",
    ],
  },
  {
    category: "Meta Graph Post Automation",
    badge: "Beauty & Skincare",
    stat: "4.1x",
    statLabel: "Faster Comment Turnaround",
    highlight: "Public comment replies paired with private DM links",
    metrics: [
      "Sub-second webhook trigger",
      "Dynamic promo code attribution",
      "42% checkout click-through",
    ],
  },
  {
    category: "Unified Multi-Channel Inbox",
    badge: "Footwear & Streetwear",
    stat: "₹4.2L",
    statLabel: "Avg Monthly Recovered GMV",
    highlight: "Auto-recovers missed inquiries across 8 channels",
    metrics: [
      "1-Click direct buy links",
      "Real-time size reservation",
      "1 inbox for IG, WA & TG",
    ],
  },
  {
    category: "Autonomous Commerce Ops",
    badge: "Gourmet & Cloud Kitchens",
    stat: "100%",
    statLabel: "Automated Inbound Inquiries",
    highlight: "Instant pincode delivery checks & menu guidance",
    metrics: [
      "Working hours scheduling",
      "Automated order status lookup",
      "Zero manual midnight replies",
    ],
  },
  {
    category: "Enterprise Lead Routing",
    badge: "Wholesale & Distribution",
    stat: "12h/wk",
    statLabel: "Saved Per Store Manager",
    highlight: "Bulk catalog distribution & VIP lead qualification",
    metrics: [
      "Automatic CRM lead scoring",
      "Scheduled follow-up sequences",
      "1-Click human handoff",
    ],
  },
];

export function MySamparkTestimonials() {
  return (
    <section className="py-24 bg-[#F5F6F0] border-t border-black/5" id="reviews">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={appleSpring}
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4 uppercase tracking-wider font-mono"
          >
            Verified Performance Benchmarks
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={heavyCardSpring}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight"
          >
            MEASURED COMMERCE <br />
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              RESULTS.
            </span>
          </motion.h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-600 font-medium max-w-lg mx-auto">
            Real performance benchmarks across active stores automating customer inquiries from verified inventory.
          </p>
        </div>

        {/* 2x3 Grid with Spring Ingress */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MERCHANT_BENCHMARKS.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...heavyCardSpring, delay: (idx % 3) * 0.1 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-7 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between cursor-pointer select-none transition-all hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-wider truncate">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    {item.badge}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-4xl sm:text-5xl font-black text-[#161616] font-mono tracking-tight flex items-baseline gap-2">
                    {item.stat}
                    <ArrowUpRight className="w-5 h-5 text-[#EE7D60] shrink-0" />
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    {item.statLabel}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#161616] font-bold leading-snug mb-5">
                  &ldquo;{item.highlight}&rdquo;
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-black/5">
                {item.metrics.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{metric}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
