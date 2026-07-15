"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, MessageSquare, CheckCircle2, ShoppingBag, Zap } from "lucide-react";
import { appleSpring, heavyCardSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

export function MySamparkFinalCTA() {
  return (
    <section className="py-24 bg-[#F5F6F0] border-t border-black/5 relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={heavyCardSpring}
          className="rounded-[40px] border border-black/10 bg-white p-8 sm:p-16 lg:p-20 text-center shadow-xl relative overflow-hidden select-none"
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-[#EE7D60]/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-[#FAEE6A]/20 rounded-full blur-3xl" />

          {/* Floating DM Notification Card 1 — Top Left */}
          <motion.div
            initial={{ opacity: 0, x: -30, y: 15 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.15 }}
            className="hidden xl:flex absolute top-10 left-10 max-w-xs text-left bg-white/95 backdrop-blur-md border border-black/10 rounded-2xl p-4 shadow-lg items-start gap-3 select-none pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-[#161616] flex items-center gap-1.5">
                <span>@sophia_style</span>
                <span className="text-[10px] text-slate-400 font-normal font-mono">1s ago</span>
              </div>
              <p className="text-slate-600 font-medium">&ldquo;How much for the linen shirt?&rdquo;</p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 pt-0.5">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>DM sent with sizing &amp; link in 0.8s</span>
              </div>
            </div>
          </motion.div>

          {/* Floating Notification Card 2 — Top Right */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: 15 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...heavyCardSpring, delay: 0.25 }}
            className="hidden xl:flex absolute top-10 right-10 max-w-xs text-left bg-white/95 backdrop-blur-md border border-black/10 rounded-2xl p-4 shadow-lg items-start gap-3 select-none pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-[#161616] flex items-center justify-between">
                <span>New Checkout Sale</span>
                <span className="text-emerald-700 font-mono font-bold">+$148.00</span>
              </div>
              <p className="text-slate-500 font-medium">Linen Overshirt (Size M)</p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 pt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Closed via automated Instagram DM</span>
              </div>
            </div>
          </motion.div>

          {/* Section Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={appleSpring}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[#161616] bg-[#F5F6F0] border border-black/5 shadow-2xs mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
            <span>Ready to convert every comment?</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={heavyCardSpring}
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#161616] leading-[1.08] uppercase max-w-4xl mx-auto mb-6"
          >
            COMMENTS KEEP COMING. <br />
            MISSING THEM{" "}
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
              DOESN&apos;T HAVE TO.
            </span>
          </motion.h2>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10 font-medium">
            Start free. Connect one account, add a few products, and watch the first DM go out. No credit card needed.
          </p>

          {/* Dual Pill CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            {/* Primary: Black Pill with Circle Arrow "( -> ) Start free" */}
            <Link href="/register" className="w-full sm:w-auto">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={tactileButtonTap}
                transition={appleSpring}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 px-8 py-4 rounded-full text-base font-extrabold bg-[#161616] text-white hover:bg-black transition-all shadow-xl group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-white text-[#161616] flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Start free</span>
              </motion.div>
            </Link>

            {/* Secondary: White Pill "See a demo first ->" */}
            <Link href="/demo" className="w-full sm:w-auto">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={tactileButtonTap}
                transition={appleSpring}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold border border-black/15 bg-white text-[#161616] hover:bg-slate-50 transition-all shadow-xs group cursor-pointer"
              >
                <span>See a demo first</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-slate-500" />
              </motion.div>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 pt-8 border-t border-black/5 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Free 14-day trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              15-minute setup
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

