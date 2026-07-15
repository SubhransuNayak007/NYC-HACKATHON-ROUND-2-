"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Zap,
  Sparkles,
  KeyRound,
  Bot,
  Database,
  Send,
  Loader2,
} from "lucide-react";
import PipelineVisualizer from "@/frontend/components/PipelineVisualizer";
import ThemeToggle from "@/frontend/components/ThemeToggle";

/* ══════════════════════════════════════════════════════
   DESIGN TOKENS — matching the landing page palette
   ══════════════════════════════════════════════════════ */
const C = {
  bg: "#070A12",
  offWhite: "#F3F4F6",
  muted: "#9CA3AF",
  dim: "#6B7280",
  mustard: "#E8B931",
  orange: "#FF6B35",
  cyan: "#38BDF8",
  emerald: "#10B981",
  emeraldLight: "#34d399",
} as const;

const F = {
  display: 'var(--font-display), "Space Grotesk", system-ui, sans-serif',
  brand: 'var(--font-brand), "Outfit", system-ui, sans-serif',
  mono: 'var(--font-mono), "JetBrains Mono", monospace',
} as const;

const ARCH_STEPS = [
  { icon: KeyRound, title: "OAuth 2.0", desc: "Secure Google OAuth connects your YouTube channel — no passwords, ever.", color: C.mustard, tag: "Connect" },
  { icon: Bot, title: "Rule Engine", desc: "Keyword rules + intent classification route every incoming comment.", color: C.orange, tag: "Filter" },
  { icon: Database, title: "RAG Matching", desc: "Semantic search over your FAQ knowledge base grounds each reply in facts.", color: C.cyan, tag: "Match" },
  { icon: Send, title: "Auto-Reply", desc: "Confidence-gated replies post instantly — humans only for edge cases.", color: C.emerald, tag: "Reply" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DemoPage() {
  const [injecting, setInjecting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const seededRef = useRef(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const injectDemo = useCallback(async (count = 3) => {
    setInjecting(true);
    try {
      const res = await fetch("/api/demo/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        // Remount the visualizer so it re-fetches the newest traces
        setRefreshKey((k) => k + 1);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Demo] Inject failed:", err);
      return false;
    } finally {
      setInjecting(false);
    }
  }, []);

  // Cinematic demo: auto-inject comments one at a time with a golden progress bar
  const startCinematic = async () => {
    setIsAutoPlaying(true);
    setAutoPlayProgress(0);
    for (let i = 0; i < 6; i++) {
      setAutoPlayProgress((i / 6) * 100);
      try {
        await fetch("/api/demo/inject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 1 }),
        });
      } catch {}
      await new Promise(r => setTimeout(r, 3000));
    }
    setAutoPlayProgress(100);
    setRefreshKey((k) => k + 1);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    autoPlayRef.current = setTimeout(() => setIsAutoPlaying(false), 2000);
  };

  // Clean up the auto-play timer if the component unmounts mid-play
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, []);

  // Auto-inject 3 demo comments on first load if no traces exist yet
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    async function maybeSeed() {
      try {
        const res = await fetch("/api/pipeline/traces?limit=5");
        if (res.ok) {
          const data = await res.json();
          const traces = data.traces || data || [];
          if (traces.length === 0) {
            await injectDemo(3);
          }
          return;
        }
      } catch {
        // Traces endpoint not ready yet — fall through and try injecting
      }
      await injectDemo(3);
    }
    maybeSeed();
  }, [injectDemo]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.offWhite }}>
      {/* Cinematic timeline */}
      {isAutoPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 right-0 h-1 z-50"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{ background: "linear-gradient(90deg, #E8B931, #FF6B35)" }}
            animate={{ width: `${autoPlayProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      )}

      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{
          opacity: 0.03,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Organic blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${C.mustard} 0%, transparent 70%)`, filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${C.orange} 0%, transparent 70%)`, filter: "blur(60px)" }}
        />
      </div>

      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-[100]"
        style={{ background: "rgba(7,10,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex items-center justify-between px-6 lg:px-10 py-4" style={{ maxWidth: 1200 }}>
          <Link href="/" className="flex items-center gap-3 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" style={{ color: C.muted }} />
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: C.mustard }}>
                <Zap size={14} color={C.bg} strokeWidth={3} />
              </div>
              <span className="text-base font-bold" style={{ fontFamily: F.brand }}>
                quick<span style={{ color: C.mustard }}>reply</span>
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle size="md" />
            <a
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold"
              style={{ background: C.mustard, color: C.bg }}
            >
              get started <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-8 px-6 lg:px-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-10 h-[2px]" style={{ background: C.mustard }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted, fontFamily: F.mono }}>
              live keynote demo
            </span>
            <div className="w-10 h-[2px]" style={{ background: C.mustard }} />
          </div>
          <h1
            className="font-extrabold leading-[0.95] mb-4"
            style={{ fontFamily: F.display, fontSize: "clamp(2.2rem, 5vw, 4rem)", letterSpacing: "-0.03em" }}
          >
            QuickReply <span style={{ color: C.mustard }}>Engine Demo</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: C.muted }}>
            Watch the AI auto-reply pipeline in real-time — from OAuth to auto-reply.
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <span className="h-2 w-2 rounded-full dot-pulse" style={{ background: "#22c55e" }} />
            <span className="text-[10px] font-bold" style={{ color: C.emeraldLight }}>Engine Active</span>
          </div>
        </motion.div>
      </section>

      {/* Pipeline Visualizer */}
      <section className="px-6 lg:px-10 pb-6" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
          className="rounded-3xl overflow-hidden"
          style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-5 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28CA41" }} />
            </div>
            <div className="flex-1 mx-3">
              <div className="rounded-lg px-3 py-1.5 text-[10px] text-center" style={{ background: "rgba(255,255,255,0.05)", color: C.muted, fontFamily: F.mono }}>
                demo.quickreply.io/pipeline
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium" style={{ background: "rgba(16,185,129,0.12)", color: C.emeraldLight }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} /> live
            </div>
          </div>

          {/* Visualizer */}
          <div className="p-5 sm:p-6">
            <PipelineVisualizer key={refreshKey} />
          </div>
        </motion.div>

        {/* Inject button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => injectDemo(3)}
            disabled={injecting}
            className="inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
            style={{ background: C.mustard, color: C.bg, boxShadow: "0 4px 24px rgba(232,185,49,0.35)" }}
          >
            {injecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {injecting ? "Injecting..." : "Inject Demo Comments"}
          </button>
          <button
            onClick={startCinematic}
            disabled={isAutoPlaying}
            className="px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #E8B931, #FF6B35)", color: "#070A12" }}
          >
            {isAutoPlaying ? "🎬 Playing..." : "🎬 Cinematic Demo"}
          </button>
          <span className="text-[11px]" style={{ color: C.dim }}>
            Pushes 3 synthetic comments through the engine live
          </span>
        </motion.div>
      </section>

      {/* Architecture Diagram */}
      <section className="px-6 lg:px-10 py-12" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-[2px]" style={{ background: C.mustard }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted, fontFamily: F.mono }}>
              the pipeline
            </span>
            <div className="w-8 h-[2px]" style={{ background: C.mustard }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ fontFamily: F.display, letterSpacing: "-0.03em" }}>
            four stages. <span style={{ color: C.mustard }}>under a second.</span>
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } }}
          className="flex flex-col lg:flex-row items-center lg:items-stretch gap-4"
        >
          {ARCH_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Fragment key={step.title}>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                  }}
                  whileHover={{ y: -4 }}
                  className="flex-1 w-full lg:w-auto rounded-2xl p-5 relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* colored top accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${step.color}, transparent)` }} />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ fontFamily: F.mono, color: step.color }}>
                      step {i + 1}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.dim }}>
                      {step.tag}
                    </span>
                  </div>
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${step.color}1f` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: step.color }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ fontFamily: F.display, color: C.offWhite }}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>
                    {step.desc}
                  </p>
                </motion.div>

                {i < ARCH_STEPS.length - 1 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { duration: 0.4, delay: 0.8 } },
                    }}
                    className="flex items-center justify-center lg:px-1 py-1 lg:py-0 shrink-0"
                  >
                    <ArrowRight className="hidden lg:block h-5 w-5 animate-pulse" style={{ color: C.mustard }} />
                    <ArrowDown className="lg:hidden h-5 w-5 animate-pulse" style={{ color: C.mustard }} />
                  </motion.div>
                )}
              </Fragment>
            );
          })}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 py-16 text-center" style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: F.display, letterSpacing: "-0.03em" }}>
          ready to <span style={{ color: C.mustard }}>automate?</span>
        </h2>
        <p className="text-base mb-8" style={{ color: C.muted }}>Join creators saving hours every week.</p>
        <motion.a
          href="/auth"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-bold"
          style={{ background: C.mustard, color: C.bg, fontFamily: F.display }}
        >
          start free now <ArrowRight size={18} strokeWidth={2.5} />
        </motion.a>
      </section>
    </div>
  );
}
