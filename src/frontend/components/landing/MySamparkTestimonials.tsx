"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, ShieldCheck, Sparkles } from "lucide-react";
import { appleSpring, heavyCardSpring } from "@/frontend/lib/physicsMotion";

const REVIEWS = [
  {
    quote:
      "I used to reply to 'price?' comments till midnight. Now the DM goes out the second someone comments — my evenings are finally my own again.",
    name: "Emma Bennett",
    title: "Founder, Velvet & Thread",
    category: "Fashion boutique · London",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "+42% DM Conversions",
  },
  {
    quote:
      "We were losing leads because we couldn't reply fast enough on Instagram. First week in, we closed 20+ orders straight from the comments.",
    name: "Chloe Adams",
    title: "Co-Founder, Botanica Glow",
    category: "Skincare label · Los Angeles",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "20+ New Orders/Wk",
  },
  {
    quote:
      "The replies actually sound like us, not a robot. A couple of regular customers didn't even realise it was automated until I told them.",
    name: "Mia Chen",
    title: "Head Baker, Honey & Whisk",
    category: "Home bakery · Melbourne",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "100% Response Rate",
  },
  {
    quote:
      "Took me about 15 minutes to set up. What sold me is that it answers from my actual product catalog, so customers never get quoted the wrong price.",
    name: "Jake Morrison",
    title: "Owner, KicksDistrict",
    category: "Sneakers store · Sydney",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "Zero Pricing Errors",
  },
  {
    quote:
      "Having Facebook, WhatsApp, and Instagram in one unified inbox is the real win for me. I used to miss messages on FB for days.",
    name: "Daniel Reed",
    title: "Managing Director, ApexTech",
    category: "Electronics reseller · Manchester",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "3x Faster Resolution",
  },
  {
    quote:
      "Sending the new seasonal catalogue to all my retail partners used to eat up a whole day. Now it's a couple of taps and done automatically.",
    name: "Liam Walsh",
    title: "Operations, Éire Supply Co.",
    category: "Distributor · Dublin",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    revenueGrowth: "8hrs Saved / Week",
  },
];

export function MySamparkTestimonials() {
  return (
    <section className="py-24 bg-[#F5F6F0]" id="reviews">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={appleSpring}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
            <span>Reviews</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight"
          >
            WHAT BUSINESSES <br />
            ACTUALLY{" "}
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              SAY.
            </span>
          </motion.h2>
          <p className="mt-3 text-sm text-slate-600 font-medium max-w-md mx-auto">
            Real feedback from verified DTC founders, independent brands, and multi-channel retailers.
          </p>
        </div>

        {/* 2x3 Grid with Spring Ingress */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((r, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...heavyCardSpring, delay: (idx % 3) * 0.08 }}
              whileHover={{ y: -5, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="p-8 rounded-[28px] bg-white border border-black/5 shadow-xs flex flex-col justify-between cursor-pointer select-none transition-all hover:shadow-md relative overflow-hidden group"
            >
              <div>
                {/* Rating & Metric Pill */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                    {r.revenueGrowth}
                  </span>
                </div>

                {/* Review Body */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic mb-6 font-normal">
                  &ldquo;{r.quote}&rdquo;
                </p>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.avatar}
                  alt={r.name}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 rounded-full object-cover shadow-xs border border-black/5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-[#161616] truncate">{r.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 truncate">{r.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{r.category}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

