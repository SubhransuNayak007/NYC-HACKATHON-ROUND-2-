"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Instagram,
  TrendingUp,
  CheckCircle2,
  Zap,
  Heart,
  MessageCircle,
} from "lucide-react";
import { appleSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";
import { FlipButton } from "./FlipButton";

const ROTATING_WORDS = ["COMMENT", "STORIES", "CHAT", "POST", "DM"];

/**
 * HeroTiltCard with real-time 3D inertial gyro parallax & cursor sheen physics.
 * Default desktop state has subtle rotational offset; hovering smoothly scales to 1.04 and straightens to rotate 0.
 */
function HeroTiltCard({
  children,
  bgColor,
  initialRotate,
  staggerDelay,
  minHeight = "min-h-[440px]",
}: {
  children: React.ReactNode;
  bgColor: string;
  initialRotate: number;
  staggerDelay: number;
  minHeight?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rX = Math.max(-10, Math.min(10, (0.5 - y) * 16));
    const rY = Math.max(-10, Math.min(10, (x - 0.5) * 16));

    setTilt({
      rotateX: rX,
      rotateY: rY,
      glareX: x * 100,
      glareY: y * 100,
    });
  };

  const handlePointerEnter = () => {
    if (!isMobile) setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const effectiveRotate = isMobile || isHovered ? 0 : initialRotate;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 35, rotate: effectiveRotate }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      animate={{
        rotate: effectiveRotate,
        scale: isHovered ? 1.04 : 1,
        rotateX: isHovered ? tilt.rotateX : 0,
        rotateY: isHovered ? tilt.rotateY : 0,
        zIndex: isHovered ? 30 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
        mass: 0.8,
        delay: isHovered ? 0 : staggerDelay,
      }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group relative rounded-[28px] ${bgColor} p-4 sm:p-5 text-left shadow-md border border-black/5 flex flex-col justify-between ${minHeight} cursor-pointer select-none transition-shadow duration-300 hover:shadow-2xl overflow-hidden`}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
    >
      {/* Glare / Sheen Reflection Layer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
        style={{
          background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col justify-between h-full">
        {children}
      </div>
    </motion.div>
  );
}

export function MySamparkHero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-[#F5F6F0]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* 1. Massive Editorial Headline with Rotating Keyword in Coral/Amber Pill */}
        <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-[80px] font-black text-[#161616] tracking-[-0.03em] leading-[1.1] sm:leading-[1.06] max-w-5xl mx-auto mb-6 uppercase select-none">
          INTELLIGENT AUTO-REPLIES <br className="hidden sm:block" />
          FOR EVERY{" "}
          <span className="inline-flex items-center justify-center min-w-[170px] sm:min-w-[260px] lg:min-w-[320px] h-[48px] sm:h-[68px] lg:h-[78px] px-5 sm:px-8 py-1 sm:py-2 rounded-full bg-[#EE7D60] text-white shadow-md align-middle overflow-hidden -rotate-1 hover:rotate-0 transition-transform duration-300">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ y: 32, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -32, opacity: 0, scale: 0.92 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 28,
                }}
                className="inline-block tracking-tight text-white font-black"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        {/* 2. Subtitle with Exact Live Copy */}
        <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
          QuickReply answers every comment and DM with the real price from your own catalog — then schedules your posts
          across every platform and keeps the whole conversation in one inbox.
        </p>

        {/* 3. Dual Pill CTA Buttons with Signature 3D Rolling Flip Animations */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
          <FlipButton
            href="/register"
            text="Start free"
            variant="primary-black"
            className="w-full sm:w-auto justify-center"
          />

          <FlipButton
            href="/demo"
            text="Book a demo"
            variant="outline-white"
            icon={true}
            className="w-full sm:w-auto justify-center"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HERO 4-CARD STAGE WITH 3D INERTIAL TILT PHYSICS
            Responsive: 1 col on mobile, 2 col on tablet, 4 col on desktop
            Desktop: Rotational offsets (-5°, +3°, -4°, +5°) straightening to 0° on hover (scale: 1.04)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 items-end max-w-6xl mx-auto">
          
          {/* ─────────────────────────────────────────────────────────────
              CARD 1 (#fcd98c / yellow pastel): Shopper asking availability with price reply
              ───────────────────────────────────────────────────────────── */}
          <HeroTiltCard bgColor="bg-[#fcd98c]" initialRotate={-5} staggerDelay={0} minHeight="min-h-[440px]">
            <div>
              {/* Shopper Photo */}
              <div className="relative rounded-2xl overflow-hidden mb-3.5 shadow-xs group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
                  alt="Live Shopper"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-44 object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Shopper
                </div>
                <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-xs text-[10px] font-extrabold text-[#161616] shadow-xs">
                  Zara Silk Midi Dress
                </div>
              </div>

              {/* Conversational DM Bubbles */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-white text-[#161616] shadow-xs max-w-[88%] font-medium border border-black/5 leading-snug">
                  Do you have this in size M?
                </div>
                <div className="p-3 rounded-2xl bg-[#161616] text-white shadow-md ml-auto max-w-[92%] font-medium space-y-1">
                  <div className="flex items-center gap-1 text-[#FDD871] text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>QuickReply AI · In Stock</span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-100">
                    Yes — 4 units left in size M at ₹2,499! Free express delivery included 👍
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-medium text-black/70 mt-3">
              <span className="flex items-center gap-1 font-bold text-[#161616]">
                <Zap className="w-3 h-3 text-[#161616] fill-current" /> Instant Catalog Sync
              </span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                1.2s latency
              </span>
            </div>
          </HeroTiltCard>

          {/* ─────────────────────────────────────────────────────────────
              CARD 2 (#feebed / pink pastel): Instagram DM modal (sneaker.store, size & price reply)
              ───────────────────────────────────────────────────────────── */}
          <HeroTiltCard bgColor="bg-[#feebed]" initialRotate={3} staggerDelay={0.1} minHeight="min-h-[440px]">
            <div>
              {/* Instagram DM Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/8 mb-3 bg-white/70 backdrop-blur-xs -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 p-3.5 rounded-t-[26px]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs p-[1.5px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-rose-500">
                      <Instagram className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#161616] flex items-center gap-1">
                      <span>sneaker.store</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active now · 1.4s AI
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full">
                  Direct DM
                </span>
              </div>

              {/* DM Message Thread & Product Embed Card */}
              <div className="space-y-2.5 text-xs py-1">
                <div className="p-2.5 rounded-2xl bg-white text-[#161616] max-w-[90%] font-medium shadow-xs border border-black/5">
                  Hi! Is the Nike Air Max 270 available in size 9?
                </div>

                {/* Product Embed Card in DM */}
                <div className="p-3 rounded-2xl bg-white border border-black/8 shadow-md space-y-2 ml-auto max-w-[96%]">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&auto=format&fit=crop&q=80"
                      alt="Nike Air Max 270"
                      loading="lazy"
                      decoding="async"
                      className="w-13 h-13 rounded-xl object-cover border border-black/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#161616] truncate">Air Max 270 'Red'</div>
                      <div className="text-[11px] text-slate-500">Size 9 (UK/India) · 3 left</div>
                      <div className="text-xs font-black text-rose-600">₹8,999</div>
                    </div>
                  </div>
                  <div className="w-full py-1.5 rounded-xl bg-[#161616] text-white font-bold text-center text-[11px] shadow-xs hover:bg-black transition-colors flex items-center justify-center gap-1.5">
                    <span>⚡ Buy Now (1-Click)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-medium text-black/70 mt-3">
              <span className="font-bold text-[#161616]">Instagram Graph API</span>
              <span className="font-mono font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                Checkout sent
              </span>
            </div>
          </HeroTiltCard>

          {/* ─────────────────────────────────────────────────────────────
              CARD 3 (#dacaf4 / purple pastel): Business owner laptop dashboard (1,248 conversations)
              ───────────────────────────────────────────────────────────── */}
          <HeroTiltCard bgColor="bg-[#dacaf4]" initialRotate={-4} staggerDelay={0.2} minHeight="min-h-[440px]">
            <div>
              {/* Business Owner Portrait */}
              <div className="relative rounded-2xl overflow-hidden mb-3 shadow-xs group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
                  alt="Arjun Sharma"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-36 object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                  <div>
                    <div className="text-white text-xs font-bold flex items-center gap-1.5">
                      <span>Arjun Sharma</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">Founder · Footwear DTC</div>
                  </div>
                </div>
              </div>

              {/* Metric Panel with 1,248 Volume & Graph */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm space-y-2.5 border border-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#161616] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                    Conversations
                  </span>
                  <span className="text-xs font-extrabold text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-full">
                    +34% this wk
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#161616] tracking-tight">1,248</span>
                  <span className="text-[11px] font-bold text-slate-500">auto-handled</span>
                </div>

                {/* Sparkline Volume Bar Graph */}
                <div className="h-10 w-full flex items-end gap-1 pt-1 bg-purple-50/50 p-1.5 rounded-xl">
                  {[28, 42, 58, 35, 75, 62, 90, 115, 80, 130, 155, 184].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-400 hover:bg-purple-600 rounded-t-xs transition-colors cursor-pointer"
                      style={{ height: `${(h / 190) * 100}%` }}
                      title={`Hour ${i * 2}:00 - ${h} replies`}
                    />
                  ))}
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between font-medium pt-0.5">
                  <span>Avg latency: <strong className="text-[#161616]">1.2s</strong></span>
                  <span className="text-emerald-600 font-bold">100% accurate</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-medium text-black/70 mt-3">
              <span className="font-bold text-[#161616]">Unified Analytics</span>
              <span className="font-mono font-bold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-full">
                24/7 Autopilot
              </span>
            </div>
          </HeroTiltCard>

          {/* ─────────────────────────────────────────────────────────────
              CARD 4 (#f2f9f7 / light mint): Facebook post with automatic pricing comment reply
              ───────────────────────────────────────────────────────────── */}
          <HeroTiltCard bgColor="bg-[#f2f9f7]" initialRotate={5} staggerDelay={0.3} minHeight="min-h-[440px]">
            <div>
              {/* Facebook Post Card */}
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2 border border-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-xs font-black">
                      f
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#161616]">Urban Threads</div>
                      <div className="text-[9px] text-slate-400 font-medium">Sponsored · Active Campaign</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                <div className="text-[11px] text-slate-700 leading-snug font-medium">
                  Summer Linen Drop 🌿 Breathable, lightweight &amp; crafted for warm days.
                </div>

                <div className="relative rounded-xl overflow-hidden h-24 border border-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                    alt="Summer Linen Collection"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-black/5">
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <Heart className="w-3 h-3 fill-current" /> 1.4k
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <MessageCircle className="w-3 h-3" /> 84 comments
                  </span>
                </div>
              </div>

              {/* Comment to DM Automation Trigger Box */}
              <div className="p-3 rounded-2xl bg-white text-[#161616] text-xs font-medium mt-2.5 border border-black/5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                    Trigger: <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-mono text-[10px]">"LINEN"</code>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    98 DMs sent
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-black/5 leading-tight">
                  <strong className="text-[#161616]">Auto-DM:</strong> "Sent real catalog price &amp; 15% VIP link to your inbox! ✨"
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-medium text-black/70 mt-3">
              <span className="font-bold text-[#161616]">Meta Graph API</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                0.9s reply
              </span>
            </div>
          </HeroTiltCard>
        </div>
      </div>
    </section>
  );
}

