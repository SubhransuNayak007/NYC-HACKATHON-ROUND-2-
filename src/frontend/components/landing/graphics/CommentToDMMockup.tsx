"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Sparkles,
  ShoppingBag,
  Send,
  Heart,
  MessageCircle,
  Check,
} from "lucide-react";

interface CommentToDMMockupProps {
  className?: string;
  theme?: "light" | "dark" | "card";
}

const SAMPLE_TRIGGERS = [
  { text: "What is the price of this jacket?", keyword: "price" },
  { text: "Send link for size M please! 😍", keyword: "link" },
  { text: "Any coupon code for new buyer?", keyword: "coupon" },
  { text: "Is COD available for Delhi?", keyword: "cod" },
];

export function CommentToDMMockup({ className = "" }: CommentToDMMockupProps) {
  const [platform, setPlatform] = useState<"instagram" | "facebook">("instagram");
  const [selectedTrigger, setSelectedTrigger] = useState(0);
  const [customComment, setCustomComment] = useState("");
  const [, setIsTyping] = useState(false);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "success">("idle");

  const currentTrigger = customComment || SAMPLE_TRIGGERS[selectedTrigger].text;

  const handleTriggerClick = (index: number) => {
    setSelectedTrigger(index);
    setCustomComment("");
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 400);
  };

  const handleCheckout = () => {
    setCheckoutState("loading");
    setTimeout(() => {
      setCheckoutState("success");
      setTimeout(() => setCheckoutState("idle"), 3500);
    }, 900);
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Bar: Channel Toggle & Live Status */}
      <div className="flex items-center justify-between pb-4 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPlatform("instagram")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                platform === "instagram"
                  ? "bg-gradient-to-r from-[#E1306C] to-[#F77737] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#161616]"
              }`}
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram Post</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform("facebook")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                platform === "facebook"
                  ? "bg-[#1877F2] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#161616]"
              }`}
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>FB Page</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Meta Graph API v20.0
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            ⚡ 1.2s avg turnaround
          </span>
        </div>
      </div>

      {/* Suggested Trigger Chips */}
      <div className="pt-3 pb-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#EE7D60]" />
          <span>Simulate customer comment trigger:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_TRIGGERS.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleTriggerClick(idx)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left font-medium ${
                selectedTrigger === idx && !customComment
                  ? "bg-[#161616] text-white border-[#161616] shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              &quot;{t.text}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Flow Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column (6 cols): Public Post Comment & Auto-Reply */}
        <div className="lg:col-span-6 space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-black/5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-black/5">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-[#EE7D60]" />
              Public Comment Thread
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Post #8921</span>
          </div>

          {/* Customer Comment Bubble */}
          <motion.div
            key={currentTrigger}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-white p-3 rounded-xl border border-black/5 shadow-2xs"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Customer Neha"
              loading="lazy"
              decoding="async"
              className="w-9 h-9 rounded-full object-cover border border-black/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#161616] flex items-center gap-1">
                  nehavarma_style
                  <span className="text-[10px] text-slate-400 font-normal">· 2m</span>
                </div>
                <Heart className="w-3 h-3 text-slate-300 hover:text-rose-500 cursor-pointer" />
              </div>
              <p className="text-xs text-slate-800 mt-1 font-medium leading-snug">
                {currentTrigger}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium">Reply</span>
                <span className="text-[10px] text-[#EE7D60] font-bold bg-[#EE7D60]/10 px-2 py-0.5 rounded-full">
                  Trigger Detected: &quot;{SAMPLE_TRIGGERS[selectedTrigger]?.keyword || "intent"}&quot;
                </span>
              </div>
            </div>
          </motion.div>

          {/* Instant Public AI Reply */}
          <div className="pl-4 sm:pl-6 border-l-2 border-[#EE7D60]/40 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#161616] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                ⚡
              </div>
              <span className="text-xs font-bold text-[#161616]">YourBrand · Auto-Reply</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-100 font-bold px-1.5 py-0.5 rounded-md font-mono">
                1.2s reply
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-black/5 text-xs text-slate-700 font-medium shadow-2xs">
              {selectedTrigger === 0 && (
                <p>&quot;Hey @nehavarma_style! 🌟 Dropped the full product breakdown, sizing chart &amp; instant 20% OFF checkout link right into your DM! Check your inbox 💌&quot;</p>
              )}
              {selectedTrigger === 1 && (
                <p>&quot;Hey @nehavarma_style! Size M is available with fast dispatch. We just slid the direct 1-click cart link into your DM! 🛍️✨&quot;</p>
              )}
              {selectedTrigger === 2 && (
                <p>&quot;Hey @nehavarma_style! Secret code <strong>SAVE20</strong> has been applied &amp; sent to your direct messages 🎁&quot;</p>
              )}
              {selectedTrigger === 3 && (
                <p>&quot;Hey @nehavarma_style! Yes, Cash on Delivery is active for Delhi pincodes (2-day express). Check your DM for details 🚚📦&quot;</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Direct Message Pop-Out Product Card */}
        <div className="lg:col-span-6 space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-black/5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-black/5">
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" />
              Instant Direct Message (DM)
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              Automated Delivery
            </span>
          </div>

          {/* DM Message Bubble with Rich Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#161616] text-white flex items-center justify-center font-black text-[9px]">
                QR
              </div>
              <span className="font-bold text-[#161616]">Your Official Brand Store</span>
              <span className="text-[10px] text-slate-400 font-mono">9:41 AM</span>
            </div>

            {/* Interactive Product Card */}
            <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-md transition-all hover:border-black/20">
              <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80"
                  alt="Classic Vintage Biker Jacket"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#161616]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5 text-[#EE7D60]" />
                  <span>30% OFF APPLIED</span>
                </div>
                <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  🟢 4 Units in Stock
                </div>
              </div>

              <div className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-[#161616] leading-tight">
                      Classic Vintage Biker Jacket
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      SKU: QR-JKT-9902 · Genuine Napa Leather
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-black text-emerald-600 font-mono">
                      ₹3,499
                    </div>
                    <div className="text-[10px] text-slate-400 line-through">
                      ₹4,999
                    </div>
                  </div>
                </div>

                {/* Sizing & Spec Badges */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-700 rounded-md">
                    Size: M, L, XL
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-700 rounded-md">
                    Color: Midnight Black
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md">
                    Free 48h Delivery
                  </span>
                </div>

                {/* 1-Click Buy / Checkout Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutState !== "idle"}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    checkoutState === "success"
                      ? "bg-emerald-600 text-white"
                      : checkoutState === "loading"
                      ? "bg-slate-800 text-white cursor-wait"
                      : "bg-[#161616] text-white hover:bg-black"
                  }`}
                >
                  {checkoutState === "idle" && (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5 text-[#EE7D60]" />
                      <span>1-Click Instant Checkout &rarr;</span>
                    </>
                  )}
                  {checkoutState === "loading" && (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Order Session...</span>
                    </>
                  )}
                  {checkoutState === "success" && (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Order #QR-8492 Initiated! (Redirecting)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Performance Metrics Strip */}
      <div className="mt-4 pt-3 border-t border-black/5 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="p-2 rounded-xl bg-slate-50">
          <span className="text-slate-500 block font-medium">DM Delivery</span>
          <span className="font-bold text-[#161616] font-mono">99.8% Success</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50">
          <span className="text-slate-500 block font-medium">Conversion Lift</span>
          <span className="font-bold text-emerald-600 font-mono">+3.8x vs Bio Link</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50">
          <span className="text-slate-500 block font-medium">Human Hours Saved</span>
          <span className="font-bold text-[#2563EB] font-mono">18 hrs/week</span>
        </div>
      </div>
    </div>
  );
}
