"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { appleSpring, heavyCardSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

interface CatalogItem {
  id: string;
  name: string;
  price: string;
  image: string;
  selected: boolean;
}

export function MySamparkFourSteps() {
  // Step 1 interactive state: catalog items
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([
    {
      id: "1",
      name: "Vintage Biker Jacket",
      price: "₹3,499",
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&auto=format&fit=crop&q=80",
      selected: true,
    },
    {
      id: "2",
      name: "Oversized Heavy Tee",
      price: "₹1,199",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80",
      selected: true,
    },
    {
      id: "3",
      name: "Linen Relaxed Shirt",
      price: "₹1,699",
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&auto=format&fit=crop&q=80",
      selected: false,
    },
    {
      id: "4",
      name: "Street Retro Sneaker",
      price: "₹4,299",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80",
      selected: true,
    },
  ]);

  // Step 2 interactive state: keyword triggers
  const [triggers, setTriggers] = useState([
    { name: "price", active: true },
    { name: "link", active: true },
    { name: "size", active: true },
    { name: "buy", active: true },
    { name: "coupon", active: false },
    { name: "cod", active: false },
  ]);

  // Step 3 interactive state: public reply toggle
  const [publicReplyActive, setPublicReplyActive] = useState(true);
  const [instantDmActive, setInstantDmActive] = useState(true);

  // Step 4 interactive state: order state
  const [orderConfirmed, setOrderConfirmed] = useState(true);

  const toggleCatalogItem = (id: string) => {
    setCatalogItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleTrigger = (index: number) => {
    setTriggers((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, active: !t.active } : t))
    );
  };

  return (
    <section className="py-24 sm:py-32 bg-[#F5F6F0] relative overflow-hidden" id="how-it-works">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={appleSpring}
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-white border border-black/10 shadow-2xs mb-4"
          >
            HOW IT WORKS
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-[#161616] tracking-tight uppercase leading-tight"
          >
            FOUR STEPS FROM <br className="hidden sm:inline" />
            COMMENT TO{" "}
            <span className="inline-flex items-center px-4 sm:px-6 py-0.5 sm:py-1 rounded-full bg-[#FDD871] text-[#161616] align-baseline">
              CUSTOMER.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.1 }}
            className="mt-4 text-base sm:text-lg text-slate-600 font-medium"
          >
            About five minutes to set up. No calls, no onboarding fees.
          </motion.p>
        </div>

        {/* 4 Asymmetrical Folder Tab Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 items-stretch">
          
          {/* FOLDER TAB 1: S/1 (Pick a post) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0 }}
            className="flex flex-col group cursor-pointer"
          >
            {/* Asymmetrical Top Tab */}
            <div className="flex items-end">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-t-2xl bg-[#FBF380] border-t border-x border-black/10 font-mono font-black text-xs text-[#161616] -mb-[1px] z-10 shadow-2xs">
                <span>S/1</span>
                <span className="text-[10px] font-bold text-black/60 uppercase">Pick Post</span>
              </div>
            </div>

            {/* Folder Body with Asymmetrical Shape */}
            <div className="flex-1 rounded-b-[28px] rounded-tr-[28px] bg-white border border-black/10 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                {/* Interactive Catalog Checkmark Grid */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/5 mb-5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2.5">
                    <span>Active Post Catalog</span>
                    <span className="text-emerald-700 font-mono">
                      {catalogItems.filter((i) => i.selected).length}/4 Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {catalogItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCatalogItem(item.id);
                        }}
                        className={`relative p-2 rounded-xl border text-left transition-all flex flex-col justify-between h-24 overflow-hidden ${
                          item.selected
                            ? "bg-white border-black/20 shadow-2xs ring-1 ring-emerald-500/30"
                            : "bg-slate-100/70 border-black/5 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* Background Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                        />
                        <div className="flex items-start justify-between relative z-10">
                          <span className="text-[10px] font-bold text-[#161616] line-clamp-1">
                            {item.name}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                              item.selected
                                ? "bg-emerald-500 text-white"
                                : "border border-black/20 bg-white"
                            }`}
                          >
                            {item.selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="relative z-10 text-[10px] font-black text-slate-800 font-mono">
                          {item.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#161616] mb-2 tracking-tight">
                  Pick a post
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Choose the Instagram Reel, carousel, or Facebook post you want to turn on automated sales for.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>Direct Meta Sync</span>
                <span className="text-emerald-600 font-mono">Ready 🟢</span>
              </div>
            </div>
          </motion.div>

          {/* FOLDER TAB 2: S/2 (Set your triggers) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.1 }}
            className="flex flex-col group cursor-pointer"
          >
            {/* Asymmetrical Top Tab */}
            <div className="flex items-end">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-t-2xl bg-[#7FE8E3] border-t border-x border-black/10 font-mono font-black text-xs text-[#161616] -mb-[1px] z-10 shadow-2xs">
                <span>S/2</span>
                <span className="text-[10px] font-bold text-black/60 uppercase">Set Triggers</span>
              </div>
            </div>

            {/* Folder Body with Asymmetrical Shape */}
            <div className="flex-1 rounded-b-[28px] rounded-tr-[28px] bg-white border border-black/10 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                {/* Interactive Keyword Grid */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/5 mb-5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Keyword Triggers</span>
                    <span className="text-blue-700 font-mono">Fuzzy AI Active</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {triggers.map((t, idx) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrigger(idx);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                          t.active
                            ? "bg-[#161616] text-white shadow-2xs"
                            : "bg-white border border-black/10 text-slate-600 hover:border-black/30"
                        }`}
                      >
                        <span>{t.name}</span>
                        {t.active ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-400">+</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-black/5 flex items-center gap-2 text-[11px] text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-[#EE7D60] shrink-0" />
                    <span className="font-medium truncate">&quot;What is the price of this?&quot;</span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#161616] mb-2 tracking-tight">
                  Set your keywords
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Add words like &quot;price&quot; or let our AI detect purchase intent automatically across languages.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>Intent AI Parser</span>
                <span className="text-blue-600 font-mono">40+ Languages</span>
              </div>
            </div>
          </motion.div>

          {/* FOLDER TAB 3: S/3 (Reply, then DM) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.2 }}
            className="flex flex-col group cursor-pointer"
          >
            {/* Asymmetrical Top Tab */}
            <div className="flex items-end">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-t-2xl bg-[#52DAC6] border-t border-x border-black/10 font-mono font-black text-xs text-[#161616] -mb-[1px] z-10 shadow-2xs">
                <span>S/3</span>
                <span className="text-[10px] font-bold text-black/60 uppercase">Auto DM</span>
              </div>
            </div>

            {/* Folder Body with Asymmetrical Shape */}
            <div className="flex-1 rounded-b-[28px] rounded-tr-[28px] bg-white border border-black/10 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                {/* Interactive Reply + DM Preview */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/5 mb-5 shadow-2xs space-y-2">
                  {/* Public Reply Pill */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setPublicReplyActive(!publicReplyActive);
                    }}
                    className={`p-2 rounded-xl border text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      publicReplyActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-white border-black/5 text-slate-400 line-through"
                    }`}
                  >
                    <span className="font-semibold truncate">💬 Public: &quot;Sent you a DM!&quot;</span>
                    <span className="font-mono text-[9px] font-bold shrink-0">1.2s</span>
                  </div>

                  {/* Private DM Pill */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstantDmActive(!instantDmActive);
                    }}
                    className={`p-2 rounded-xl border text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      instantDmActive
                        ? "bg-white border-black/10 text-[#161616] shadow-2xs"
                        : "bg-slate-50 border-black/5 text-slate-400 line-through"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ShoppingBag className="w-3 h-3 text-[#EE7D60] shrink-0" />
                      <span className="font-bold truncate">DM: Leather Jacket ₹3,499</span>
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold shrink-0">Live Cart</span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#161616] mb-2 tracking-tight">
                  Reply, then DM
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  A public comment reply to boost algorithm reach, then an instant DM with verified catalog price and link.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>Avg Delivery Speed</span>
                <span className="text-emerald-600 font-mono">⚡ 1.2 sec</span>
              </div>
            </div>
          </motion.div>

          {/* FOLDER TAB 4: S/4 (Customer checks out) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.3 }}
            className="flex flex-col group cursor-pointer"
          >
            {/* Asymmetrical Top Tab */}
            <div className="flex items-end">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-t-2xl bg-[#E0D8FD] border-t border-x border-black/10 font-mono font-black text-xs text-[#161616] -mb-[1px] z-10 shadow-2xs">
                <span>S/4</span>
                <span className="text-[10px] font-bold text-black/60 uppercase">Checkout</span>
              </div>
            </div>

            {/* Folder Body with Asymmetrical Shape */}
            <div className="flex-1 rounded-b-[28px] rounded-tr-[28px] bg-white border border-black/10 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                {/* Interactive Receipt Confirmation */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrderConfirmed(!orderConfirmed);
                  }}
                  className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/5 mb-5 shadow-2xs space-y-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono">Order #QR-9402</span>
                    <span
                      className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        orderConfirmed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {orderConfirmed ? "Paid Instantly" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-600 font-medium">Biker Jacket (M)</span>
                    <span className="font-mono font-black text-base text-[#161616]">
                      ₹3,499.00
                    </span>
                  </div>

                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-bold flex items-center justify-between">
                    <span>Attributed by QuickReply</span>
                    <span>+1 Sale</span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#161616] mb-2 tracking-tight">
                  Customer checks out
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  They open the link, pick their size, and complete checkout while they&apos;re still warm.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>Checkout Conversion</span>
                <span className="text-purple-700 font-mono">3.8x Lift 🚀</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
