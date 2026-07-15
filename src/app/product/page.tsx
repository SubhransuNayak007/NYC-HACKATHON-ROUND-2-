"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Bot,
  MessageCircle,
  Shield,
  Clock,
  BarChart3,
  Globe,
  Sparkles,
  Play,
  Check,
  Send,
  Star,
  Menu,
  X,
} from "lucide-react";

const C = {
  charcoal: "#1A1A1A", offWhite: "#FAF8F5", cream: "#F5F0EB", mustard: "#E8B931",
  orange: "#FF6B35", olive: "#606C38", indigo: "#3D348B", slate: "#4A4A4A",
  slateMuted: "#8A8A8A", slateLight: "#B8B8B8", warmGrey: "#E8E4DF", white: "#FFFFFF",
} as const;
const F = {
  display: 'var(--font-display), "Space Grotesk", system-ui, sans-serif',
  brand: 'var(--font-brand), "Outfit", system-ui, sans-serif',
  body: 'var(--font-body), "DM Sans", system-ui, sans-serif',
  mono: 'var(--font-mono), "JetBrains Mono", monospace',
  serif: 'var(--font-serif), "DM Serif Display", Georgia, serif',
} as const;
const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const SPRING = [0.16, 1, 0.3, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } };
const stagger = { hidden: { opacity: 1 }, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };

const productFeatures = [
  { icon: <MessageCircle size={28} color={C.indigo} />, title: "Auto Replies", desc: "Instantly respond to repetitive comments across every platform. Set it once, it runs forever.", accent: C.indigo, details: ["AI-powered contextual replies", "Custom brand voice training", "Multi-language support", "Sentiment-aware responses"] },
  { icon: <Bot size={28} color={C.orange} />, title: "Smart Keyword Rules", desc: "Create unlimited trigger words and tailor every response to match your tone perfectly.", accent: C.orange, details: ["Unlimited keyword rules", "Regex pattern matching", "Priority-based rule ordering", "A/B test different replies"] },
  { icon: <Zap size={28} color={C.mustard} />, title: "Lightning Speed", desc: "From comment detection to reply in under 600ms. Your audience never waits.", accent: C.mustard, details: ["< 600ms response time", "Real-time comment monitoring", "Batch processing for volume", "Zero-downtime architecture"] },
  { icon: <Shield size={28} color={C.olive} />, title: "Enterprise Security", desc: "Official OAuth APIs only. We never store passwords. AES-256-GCM encryption at rest.", accent: C.olive, details: ["OAuth 2.0 official APIs", "AES-256-GCM encryption", "SOC-2 Type II ready", "GDPR & CCPA compliant"] },
  { icon: <Globe size={28} color={C.indigo} />, title: "Multi-Platform", desc: "YouTube, Instagram, LinkedIn, Twitter/X, and WhatsApp — one dashboard, all platforms.", accent: C.indigo, details: ["5 platforms supported", "Unified inbox view", "Per-platform rules", "Cross-platform analytics"] },
  { icon: <BarChart3 size={28} color={C.orange} />, title: "Live Analytics", desc: "Track every reply, engagement rate, and audience sentiment in real-time.", accent: C.orange, details: ["Real-time dashboards", "Engagement tracking", "Sentiment analysis", "Exportable reports"] },
  { icon: <Sparkles size={28} color={C.mustard} />, title: "RAG Engine", desc: "Retrieval-Augmented Generation for contextual, human-like replies that actually help.", accent: C.mustard, details: ["Semantic matching", "Knowledge base integration", "Context-aware responses", "Continuous learning"] },
  { icon: <Clock size={28} color={C.olive} />, title: "24/7 Automation", desc: "Runs around the clock. No laptop required. No babysitting needed.", accent: C.olive, details: ["Zero-browser operation", "Scheduled monitoring", "Automatic failover", "99.9% uptime SLA"] },
];

export default function ProductPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: C.offWhite, minHeight: "100vh", color: C.charcoal }}>
      {/* Navbar */}
      <motion.nav initial={{ y: 0 }} animate={{ y: 0 }} className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{ background: scrolled ? "rgba(250,248,245,0.88)" : "rgba(250,248,245,0.5)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.03)"}` }}>
        <div className="mx-auto flex items-center justify-between px-6 lg:px-10 py-4" style={{ maxWidth: 1400 }}>
          <a href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center rounded-lg group-hover:rotate-6 transition-transform" style={{ width: 34, height: 34, background: C.mustard }}>
              <Zap size={16} color={C.charcoal} strokeWidth={3} />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: F.brand }}>quick<span style={{ color: C.mustard }}>reply</span></span>
          </a>
          <div className="hidden md:flex items-center gap-10">
            <a href="/product" className="text-sm font-bold" style={{ color: C.charcoal }}>product</a>
            <a href="/pricing" className="text-sm font-medium lowercase" style={{ color: C.slateMuted }}>pricing</a>
            <a href="/about" className="text-sm font-medium lowercase" style={{ color: C.slateMuted }}>about</a>
            <a href="/auth" className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold" style={{ background: C.charcoal, color: C.offWhite }}>start free <ArrowRight size={14} /></a>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 lg:px-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-[2px]" style={{ background: C.mustard }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slateMuted, fontFamily: F.mono }}>product</span>
          </div>
          <h1 className="font-extrabold leading-[0.9] mb-6" style={{ fontFamily: F.display, fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.04em" }}>
            every tool you need.<br /><span style={{ color: C.mustard }}>one platform.</span>
          </h1>
          <p className="text-lg max-w-xl leading-relaxed" style={{ color: C.slate, fontFamily: F.serif, fontStyle: "italic" }}>
            QuickReply combines AI-powered auto-replies, smart keyword rules, real-time analytics, and multi-platform management into a single, beautiful dashboard.
          </p>
        </motion.div>
      </section>

      {/* Interactive Feature Explorer */}
      <section className="px-6 lg:px-10 pb-20" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Feature list */}
          <div className="w-full lg:w-1/3 space-y-2">
            {productFeatures.map((f, i) => (
              <motion.button
                key={f.title}
                onClick={() => setActiveFeature(i)}
                className="w-full text-left p-4 rounded-2xl transition-all duration-300 cursor-pointer flex items-center gap-4"
                style={{
                  background: activeFeature === i ? C.charcoal : "transparent",
                  color: activeFeature === i ? C.offWhite : C.charcoal,
                  border: `1px solid ${activeFeature === i ? C.charcoal : "transparent"}`,
                }}
                whileHover={{ x: activeFeature === i ? 0 : 4 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: activeFeature === i ? `${f.accent}30` : `${f.accent}10` }}>
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ fontFamily: F.display }}>{f.title}</div>
                  <div className="text-xs" style={{ color: activeFeature === i ? C.slateLight : C.slateMuted }}>{f.desc.slice(0, 50)}...</div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Feature detail */}
          <div className="w-full lg:w-2/3">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: SPRING }}
              className="rounded-3xl p-8 md:p-12"
              style={{ background: C.charcoal, color: C.offWhite, boxShadow: "0 30px 80px rgba(26,26,26,0.2)" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: `${productFeatures[activeFeature].accent}20` }}>
                {productFeatures[activeFeature].icon}
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ fontFamily: F.display }}>
                {productFeatures[activeFeature].title}
              </h3>
              <p className="text-base mb-8 max-w-lg" style={{ color: C.slateLight }}>{productFeatures[activeFeature].desc}</p>
              <ul className="space-y-3">
                {productFeatures[activeFeature].details.map((d) => (
                  <li key={d} className="flex items-center gap-3 text-sm">
                    <Check size={16} style={{ color: productFeatures[activeFeature].accent }} />
                    <span style={{ color: C.slateLight }}>{d}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform grid */}
      <section className="py-20 px-6 lg:px-10" style={{ background: C.cream }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="text-center mb-16">
            <h2 className="font-extrabold leading-none mb-4" style={{ fontFamily: F.display, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              every platform.<br /><span style={{ color: C.mustard }}>one inbox.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "YouTube", color: "#FF0000", emoji: "🎬" },
              { name: "Instagram", color: "#E1306C", emoji: "📸" },
              { name: "LinkedIn", color: "#0A66C2", emoji: "💼" },
              { name: "Twitter/X", color: "#1DA1F2", emoji: "🐦" },
              { name: "WhatsApp", color: "#25D366", emoji: "💬" },
            ].map((p) => (
              <motion.div key={p.name} whileHover={{ y: -4, scale: 1.02 }} className="p-6 rounded-2xl text-center cursor-default" style={{ background: C.white, border: `1px solid ${C.warmGrey}` }}>
                <div className="text-3xl mb-3">{p.emoji}</div>
                <div className="text-sm font-bold" style={{ fontFamily: F.display }}>{p.name}</div>
                <div className="w-full h-1 rounded-full mt-3" style={{ background: p.color }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 lg:px-10 text-center" style={{ background: C.charcoal }}>
        <div className="mx-auto" style={{ maxWidth: 800 }}>
          <h2 className="font-extrabold leading-none mb-6" style={{ fontFamily: F.display, fontSize: "clamp(2rem, 6vw, 4.5rem)", color: C.offWhite }}>
            ready to <span style={{ color: C.mustard }}>automate?</span>
          </h2>
          <p className="text-base mb-10" style={{ color: C.slateLight }}>Start free. No credit card. Cancel anytime.</p>
          <motion.a href="/auth" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-3 rounded-full px-10 py-5 text-base font-bold" style={{ background: C.mustard, color: C.charcoal, fontFamily: F.display }}>
            get started free <ArrowRight size={18} />
          </motion.a>
        </div>
      </section>
    </div>
  );
}
