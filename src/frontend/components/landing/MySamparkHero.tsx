"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
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
  Sparkles,
} from "lucide-react";
import { useCardTiltPhysics } from "@/frontend/lib/physicsMotion";

export const HERO_WORDS = ["POST", "COMMENT", "REEL", "STORY", "DM"];

export function HeroRotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <h1 className="mx-auto max-w-5xl lg:max-w-6xl text-center text-4xl sm:text-5xl md:text-[68px] font-black tracking-tight text-[#18181B] md:leading-[1.08] select-none uppercase">
      <span className="inline-block sm:whitespace-nowrap">INTELLIGENT AUTO-REPLIES</span> <br />
      <span className="inline-flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
        <span>FOR EVERY</span>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#FAD0B8] px-6 sm:px-8 py-1 sm:py-1.5 text-[#C85A32] shadow-inner min-w-[240px] sm:min-w-[320px] md:min-w-[420px] max-w-full"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={HERO_WORDS[index]}
              initial={{ y: 40, opacity: 0, rotateX: -65 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: -40, opacity: 0, rotateX: 65 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="inline-block font-black whitespace-nowrap text-center"
            >
              {HERO_WORDS[index]}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </span>
    </h1>
  );
}

const subscribeResize = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

const getIsMobile = () => (typeof window !== "undefined" ? window.innerWidth < 1024 : false);
const getIsMobileServer = () => true;

const subscribeReducedMotion = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

const getReducedMotion = () =>
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
const getReducedMotionServer = () => false;

function HeroTiltCard({
  children,
  bgColor,
  initialRotate,
  staggerDelay,
  fanOffset = 0,
  minHeight = "min-h-[440px]",
}: {
  children: React.ReactNode;
  bgColor: string;
  initialRotate: number;
  staggerDelay: number;
  fanOffset?: number;
  minHeight?: string;
}) {
  const { cardRef, tilt, handlePointerMove, handlePointerLeave } = useCardTiltPhysics(8, 10);
  const isMobile = useSyncExternalStore(subscribeResize, getIsMobile, getIsMobileServer);
  const isDesktop = useSyncExternalStore(
    subscribeResize,
    () => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true),
    () => false
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer
  );

  const safeFanOffset = reducedMotion || isMobile || !isDesktop ? 0 : fanOffset;
  const effectiveRotate = reducedMotion || isMobile || !isDesktop ? 0 : initialRotate;

  return (
    <motion.div
      ref={cardRef}
      initial={{
        opacity: 0,
        y: 50,
        x: safeFanOffset,
        rotateZ: 0,
        scale: 0.92,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        rotateZ: effectiveRotate,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        type: "spring",
        stiffness: 160,
        damping: 24,
        delay: staggerDelay,
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative rounded-[28px] ${bgColor} p-4 sm:p-5 text-left shadow-md border border-black/6 flex flex-col justify-between ${minHeight} select-none transition-shadow duration-300 hover:shadow-2xl overflow-hidden will-change-transform`}
      style={{
        transformStyle: reducedMotion || isMobile ? "flat" : "preserve-3d",
        transformPerspective: reducedMotion || isMobile ? undefined : 1000,
        rotateZ: effectiveRotate + (reducedMotion || isMobile ? 0 : tilt.rotateY * 0.25),
        rotateX: reducedMotion || isMobile ? 0 : tilt.rotateX,
        rotateY: reducedMotion || isMobile ? 0 : tilt.rotateY,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 50%)",
        }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full">
        {children}
      </div>
    </motion.div>
  );
}

function HeroHoverVideoPlayer({
  videoSrc,
  posterSrc,
  alt,
  heightClass = "h-44",
  topRightBadge,
  bottomOverlay,
  loading = "lazy",
  fetchPriority,
  width,
  height,
}: {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  heightClass?: string;
  topRightBadge?: React.ReactNode;
  bottomOverlay?: React.ReactNode;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const startPlayback = () => {
    setIsHovered(true);
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  };

  const stopPlayback = () => {
    setIsHovered(false);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onMouseEnter={startPlayback}
      onMouseLeave={stopPlayback}
      className={`relative rounded-2xl overflow-hidden shadow-xs group/img bg-slate-950 cursor-pointer select-none mb-3.5 ${heightClass}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt={alt}
        width={width || 400}
        height={height || 176}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={`w-full h-full object-cover transition-transform duration-500 ${
          isHovered ? "scale-105" : "scale-100"
        }`}
      />

      <video
        ref={videoRef}
        src={videoSrc}
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
          isPlaying ? "opacity-100" : "opacity-0"
        }`}
      />

      {topRightBadge || (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full liquid-glass-control text-[10px] font-bold text-[#161616] flex items-center gap-1.5 shadow-sm transition-all pointer-events-none">
          {isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-800 font-extrabold">Playing</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EE7D60] animate-pulse" />
              <span>Hover to play</span>
            </>
          )}
        </div>
      )}

      {bottomOverlay}
    </div>
  );
}

export function MySamparkHero() {
  const [card1Active, setCard1Active] = useState(false);
  const [card2Bought, setCard2Bought] = useState(false);
  const [commentCount, setCommentCount] = useState(84);
  const [activeComments, setActiveComments] = useState<string[]>([]);
  const [heroReplyState, setHeroReplyState] = useState<"idle" | "simulating" | "sent">("idle");
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerLinenComment = () => {
    if (heroReplyState === "simulating") return;

    if (heroReplyState === "sent") {
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
      setHeroReplyState("idle");
      return;
    }

    setHeroReplyState("simulating");
    setCommentCount((c) => c + 1);
    setActiveComments((prev) => [
      `@priya.style: Need size chart for LINEN dress!`,
      ...prev.slice(0, 1),
    ]);

    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);

    heroTimerRef.current = setTimeout(() => {
      setHeroReplyState("sent");
      heroTimerRef.current = setTimeout(() => {
        setHeroReplyState("idle");
      }, 4000);
    }, 900);
  };

  return (
    <section className="relative z-10 isolate pt-24 pb-20 sm:pt-28 md:pt-32 md:pb-28 overflow-hidden bg-[#F5F6F0]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* 3D Rotating Word Switcher Headline */}
        <HeroRotatingHeadline />

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6 mt-4 font-medium">
          QuickReply answers every comment and DM with the real price from your own catalog — then schedules your posts
          across every platform and keeps the whole conversation in one inbox.
        </p>

        {/* Dual CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
          <Link href="/register" className="group inline-flex items-center select-none w-full sm:w-auto justify-center">
            <div className="relative inline-flex items-center gap-3.5 rounded-full bg-[#161616] hover:bg-black p-2 pr-7 sm:pr-8 text-white shadow-[0_12px_24px_-6px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-md transition-all duration-150 ease-out cursor-pointer">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black shadow-xs overflow-hidden relative">
                <span className="relative inline-flex items-center justify-center overflow-hidden shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-[#161616]">
                  <ArrowRight className="w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-x-full" />
                  <ArrowRight className="w-full h-full absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] -translate-x-full group-hover:translate-x-0" />
                </span>
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight">Start for free</span>
            </div>
          </Link>

          <Link href="/demo" className="group inline-flex items-center select-none w-full sm:w-auto justify-center">
            <div className="liquid-glass-control inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold text-[#161616] hover:bg-white/90 transition-all duration-150 ease-out cursor-pointer">
              <span className="relative inline-flex items-center justify-center overflow-hidden shrink-0 w-4 h-4 text-[#161616]">
                <ArrowRight className="w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-x-full" />
                <ArrowRight className="w-full h-full absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] -translate-x-full group-hover:translate-x-0" />
              </span>
              <span>Book a demo</span>
            </div>
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HERO 4-CARD INTERACTIVE FAN DECK (00:12–00:13)
            Cards fan out from a tight hand into an elegant arc
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-3 items-end max-w-6xl mx-auto [perspective:1200px] overflow-x-clip sm:overflow-visible">
          
          {/* Card 1: Carolina Herrera / Zara Luxury Fashion - Sand/Gold */}
          <HeroTiltCard bgColor="bg-[#fcd98c]" initialRotate={-4} fanOffset={-60} staggerDelay={0}>
            <div>
              <HeroHoverVideoPlayer
                posterSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80"
                videoSrc="/videos/fashion_reel.mp4"
                alt="Carolina Herrera Silk Midi Dress"
                heightClass="h-44"
                loading="eager"
                fetchPriority="high"
                width={400}
                height={176}
                bottomOverlay={
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg liquid-glass-control text-[10px] font-extrabold text-[#161616] shadow-xs">
                    Carolina Herrera · Silk Midi
                  </div>
                }
              />

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCard1Active(!card1Active)}
                  className="w-full text-left p-3 rounded-2xl bg-white text-[#161616] shadow-xs font-medium border border-black/5 leading-snug hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Do you have this in size M?
                </button>
                <div className="p-3 rounded-2xl bg-[#161616] text-white shadow-md ml-auto max-w-[95%] font-medium space-y-1">
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

          {/* Card 2: Sneaker Store - Soft Pink / Rose */}
          <HeroTiltCard bgColor="bg-[#feebed]" initialRotate={-1.5} fanOffset={-20} staggerDelay={0.1}>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-black/8 mb-3 liquid-glass-control -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 p-3.5 rounded-t-[26px]">
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

              <div className="space-y-2.5 text-xs py-1">
                <div className="p-2.5 rounded-2xl bg-white text-[#161616] max-w-[90%] font-medium shadow-xs border border-black/5">
                  Hi! Is the Nike Air Max 270 available in size 9?
                </div>
                <div className="p-3 rounded-2xl bg-white border border-black/8 shadow-md space-y-2 ml-auto max-w-[96%]">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&auto=format&fit=crop&q=80"
                      alt="Nike Air Max 270"
                      width={52}
                      height={52}
                      loading="lazy"
                      decoding="async"
                      className="w-13 h-13 rounded-xl object-cover border border-black/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#161616] truncate">Air Max 270 &apos;Red&apos;</div>
                      <div className="text-[11px] text-slate-500">Size 9 (UK/India) · 3 left</div>
                      <div className="text-xs font-black text-rose-600">₹8,999</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCard2Bought(!card2Bought)}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-center text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                      card2Bought
                        ? "bg-emerald-600 text-white shadow-[0_2px_0_#065f46] translate-y-0.5"
                        : "bg-[#161616] text-white shadow-[0_4px_0_#000,0_6px_12px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-[0_1px_0_#000] hover:bg-black"
                    }`}
                  >
                    <span>{card2Bought ? "✅ 1-Click DM Sent!" : "⚡ Buy Now (1-Click)"}</span>
                  </button>
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

          {/* Card 3: Subhransu Nayak Analytics - Soft Lavender */}
          <HeroTiltCard bgColor="bg-[#dacaf4]" initialRotate={1.5} fanOffset={20} staggerDelay={0.2}>
            <div>
              <HeroHoverVideoPlayer
                posterSrc="/images/subhransu-nayak.jpg"
                videoSrc="/videos/yeti_mascot_clean.mp4"
                alt="Subhransu Nayak - CEO & Founder"
                heightClass="h-44"
                loading="lazy"
                width={400}
                height={176}
                bottomOverlay={
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-3 pt-8 flex items-end pointer-events-none">
                    <div>
                      <div className="text-white text-xs font-bold flex items-center gap-1.5 drop-shadow-sm">
                        <span>Subhransu Nayak</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium drop-shadow-xs">CEO &amp; Founder · QuickReply</div>
                    </div>
                  </div>
                }
              />

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
                <div className="h-10 w-full flex items-end gap-1 pt-1 bg-purple-50/50 p-1.5 rounded-xl">
                  {[45, 65, 80, 110, 95, 140, 120, 175, 160, 190, 145, 180].map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-500 rounded-t-sm transition-all duration-300 hover:bg-purple-700"
                      style={{ height: `${(v / 190) * 100}%` }}
                      title={`Hour ${i * 2}:00 - ${v} replies`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between font-medium pt-0.5">
                  <span>
                    Avg latency: <strong className="text-[#161616]">1.2s</strong>
                  </span>
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

          {/* Card 4: Urban Threads - Mint / Green */}
          <HeroTiltCard bgColor="bg-[#f2f9f7]" initialRotate={4} fanOffset={60} staggerDelay={0.3}>
            <div>
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="text-[11px] text-slate-700 leading-snug font-medium">
                  Summer Linen Drop 🌿 Breathable, lightweight &amp; crafted for warm days.
                </div>

                <HeroHoverVideoPlayer
                  posterSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                  videoSrc="/videos/campaign_reel.mp4"
                  alt="Summer Linen Collection"
                  heightClass="h-24"
                  loading="lazy"
                  width={300}
                  height={96}
                />

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-black/5">
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <Heart className="w-3 h-3 fill-current" /> 1.4k
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <MessageCircle className="w-3 h-3" /> {commentCount} comments
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white text-[#161616] text-xs font-medium mt-2.5 border border-black/5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                    Trigger: <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-mono text-[10px]">&quot;LINEN&quot;</code>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    {commentCount + 14} DMs sent
                  </span>
                </div>

                {activeComments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[10px] text-emerald-800 leading-tight space-y-1"
                  >
                    <div className="font-semibold text-emerald-950">{activeComments[0]}</div>
                    <div className="text-emerald-700">⚡ Auto-Replied: &quot;Check your DMs! 15% VIP link sent ✨&quot;</div>
                  </motion.div>
                )}

                <button
                  type="button"
                  onClick={triggerLinenComment}
                  disabled={heroReplyState === "simulating"}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-75 text-white font-bold text-[11px] shadow-[0_4px_0_#000,0_6px_12px_rgba(0,0,0,0.18)] active:translate-y-1 active:shadow-[0_1px_0_#000] border-b-2 border-black/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed select-none"
                >
                  {heroReplyState === "simulating" ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Simulating 0.9s turnaround...</span>
                    </>
                  ) : heroReplyState === "sent" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Auto-Reply Sent! (Click to Reset)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#FDD871]" />
                      <span>Click to Test Auto-Reply</span>
                    </>
                  )}
                </button>
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

export default MySamparkHero;
