"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/frontend/store";
import {
  Youtube,
  CheckCircle,
  Sliders,
  ArrowRight,
  Sparkles,
  Loader2,
  Lock,
  Shield,
  Search,
  Zap,
  Send,
  Radio,
  ArrowLeft,
  LayoutDashboard,
  MessagesSquare,
} from "lucide-react";

/* ══════════════════════════════════════════════════════
   DESIGN TOKENS — charcoal + mustard (landing page look)
   ══════════════════════════════════════════════════════ */
const C = {
  charcoal: "#070A12",
  charcoalDeep: "#050810",
  cardBg: "rgba(15, 23, 42, 0.82)",
  cardBorder: "rgba(255, 255, 255, 0.1)",
  mustard: "#E8B931",
  mustardLight: "#F5D060",
  slate: "#D1D5DB",
  slateMuted: "#9CA3AF",
  white: "#FFFFFF",
  inputBg: "rgba(255, 255, 255, 0.05)",
  inputBorder: "rgba(255, 255, 255, 0.12)",
} as const;

const SPRING = [0.16, 1, 0.3, 1] as const;

interface Channel {
  id: string;
  name: string;
  handle?: string;
  avatar?: string;
  subscribers?: string;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [channelConnected, setChannelConnected] = useState(false);
  const [connectedChannelInfo, setConnectedChannelInfo] = useState<Channel | null>(null);

  // First Rule Data — pre-filled "Notes Request" rule
  const [ruleName, setRuleName] = useState("Notes Request");
  const [keywords, setKeywords] = useState("notes");
  const [replyBody, setReplyBody] = useState("Thanks for watching!");

  // Check query parameters for success return from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const chName = params.get("channel");

    if (success === "connected" && chName) {
      showToast(`Linked YouTube channel: ${chName} successfully!`, "success");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      setChannelConnected(true);
      setStep(2); // Auto-advance to Step 2
      triggerRefresh();
    } else if (error) {
      showToast(`Auth Error: ${error.replace(/_/g, " ")}`, "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast, triggerRefresh]);

  // Fetch connected channels + auth check
  useEffect(() => {
    async function loadOnboardingData() {
      try {
        const [channelsRes, settingsRes] = await Promise.all([
          fetch("/api/channels"),
          fetch("/api/settings"),
        ]);

        if (channelsRes.ok) {
          const channels = await channelsRes.json();
          if (Array.isArray(channels) && channels.length > 0) {
            setChannelConnected(true);
            setConnectedChannelInfo(channels[0] as Channel);
          }
        }

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (!settings.userSession || !settings.userSession.email) {
            router.push("/login");
            return;
          }
        } else {
          router.push("/login");
          return;
        }
      } catch (err) {
        console.error("Onboarding load error:", err);
      }
    }
    loadOnboardingData();
  }, [refreshTrigger, router]);

  const handleOAuthConnect = () => {
    window.location.href = "/api/auth/google?state=onboarding";
  };

  const handleSaveRule = async () => {
    setLoading(true);
    try {
      // 1. Create a template for this rule
      const tplRes = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${ruleName} Template`,
          emoji: "📝",
          body: replyBody,
          variants: [replyBody],
        }),
      });

      if (!tplRes.ok) {
        const err = await tplRes.json().catch(() => ({}));
        showToast(err.error || "Failed to create reply template", "error");
        return;
      }

      const template = await tplRes.json();

      // 2. Create the rule tied to this template
      const conditions = keywords
        .split(",")
        .map((kw, idx) => ({
          id: `cond-ob-${idx}`,
          type: "contains" as const,
          value: kw.trim(),
        }))
        .filter((c) => c.value);

      const ruleRes = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          conditions,
          operator: "OR",
          templateId: template.id,
          delaySeconds: 180,
          dailyLimit: 50,
          colorLabel: "blue",
        }),
      });

      if (!ruleRes.ok) {
        const err = await ruleRes.json().catch(() => ({}));
        showToast(err.error || "Failed to save rule", "error");
        return;
      }

      showToast("Auto-reply rule saved!", "success");
      triggerRefresh();
      setStep(3);
    } catch (err) {
      console.error("Save rule error:", err);
      showToast("Could not save rule. Is the server running?", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Progress indicator ---------- */
  const dot = (n: number) => (
    <span
      className="h-2 rounded-full transition-all duration-500"
      style={{
        width: step === n ? 26 : 8,
        background: step >= n ? C.mustard : "rgba(255, 255, 255, 0.14)",
        boxShadow: step >= n ? `0 0 12px rgba(232, 185, 49, 0.5)` : "none",
      }}
    />
  );

  const primaryBtn = {
    background: C.mustard,
    color: C.charcoal,
    fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
    boxShadow: "0 8px 24px rgba(232, 185, 49, 0.25)",
  };

  const ghostBtn = {
    background: "transparent",
    color: C.slate,
    border: "1px solid rgba(255, 255, 255, 0.18)",
  };

  const inputStyle: React.CSSProperties = {
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    color: C.white,
    outline: "none",
  };

  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center py-8 px-4 font-sans overflow-hidden">
      {/* Ambient mustard/charcoal glows */}
      <div
        className="pointer-events-none absolute top-[-10%] right-[-5%] h-[420px] w-[420px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #E8B931 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] left-[-8%] h-[340px] w-[340px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #3D348B 0%, transparent 70%)", filter: "blur(70px)" }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: SPRING }}
        className="relative w-full max-w-[600px] rounded-3xl p-7 md:p-8 overflow-hidden"
        style={{
          background: C.cardBg,
          border: `1px solid ${C.cardBorder}`,
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Card top-edge glow */}
        <div
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #E8B931 0%, transparent 70%)", filter: "blur(40px)" }}
        />

        {/* Brand mark */}
        <div className="relative flex items-center gap-2.5 mb-7">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-extrabold"
            style={{ background: C.mustard, color: C.charcoal, fontFamily: "var(--font-display), sans-serif" }}
          >
            QR
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-none" style={{ color: C.white, fontFamily: "var(--font-display), sans-serif" }}>
              QuickReply
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: C.slateMuted }}>
              Get your comments handled in 60 seconds
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">{dot(1)}{dot(2)}{dot(3)}</div>
          <span
            className="text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: C.slateMuted }}
          >
            Step {step} of 3
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* ══════════ STEP 1 — CONNECT YOUTUBE ══════════ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: SPRING }}
              className="relative space-y-6"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(232, 185, 49, 0.12)", border: "1px solid rgba(232, 185, 49, 0.35)" }}
                >
                  <Youtube className="h-8 w-8" style={{ color: C.mustard }} />
                </div>
                <h2 className="font-display text-2xl font-bold" style={{ color: C.white }}>
                  Connect your YouTube Channel
                </h2>
                <p className="mt-2 text-sm leading-relaxed max-w-md mx-auto" style={{ color: C.slateMuted }}>
                  Allow QuickReply to monitor comments and post replies automatically using secure, official Google OAuth integrations.
                </p>
              </div>

              {!channelConnected ? (
                <div
                  className="rounded-2xl p-6 flex flex-col items-center text-center"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}
                >
                  <div
                    className="mb-4 h-16 w-36 rounded-xl flex items-center justify-center text-[10px] font-semibold tracking-wider"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: C.slateMuted }}
                  >
                    YouTube API v3
                  </div>

                  <button
                    onClick={handleOAuthConnect}
                    className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition active:scale-95 hover:brightness-105 cursor-pointer"
                    style={primaryBtn}
                  >
                    <Lock className="h-4 w-4" style={{ color: C.charcoal }} />
                    Connect with Google / YouTube
                  </button>

                  <div className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-left" style={{ color: C.slateMuted }}>
                    <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                    <p>
                      We never store your password. YouTube access can be revoked anytime from your{" "}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold hover:underline"
                        style={{ color: C.mustard }}
                      >
                        Google account settings
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-2xl p-5 flex items-center justify-between"
                  style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={connectedChannelInfo?.avatar || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"}
                      alt={connectedChannelInfo?.name || "channel"}
                      className="h-11 w-11 rounded-full object-cover border-2"
                      style={{ borderColor: "rgba(16, 185, 129, 0.4)", background: C.white }}
                    />
                    <div className="text-left">
                      <h4 className="text-sm font-semibold" style={{ color: C.white }}>
                        {connectedChannelInfo?.name || "Connected Channel"}
                      </h4>
                      <p className="text-xs" style={{ color: C.slateMuted }}>
                        {connectedChannelInfo?.handle || "@handle"} · {connectedChannelInfo?.subscribers || "0"} subscribers
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#34D399" }}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Connected</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold transition hover:opacity-80 cursor-pointer"
                  style={{ color: C.slateMuted }}
                >
                  Skip for now
                </button>
                <button
                  disabled={!channelConnected}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ ...primaryBtn, opacity: channelConnected ? 1 : 0.4 }}
                >
                  Create First Rule
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 2 — CREATE FIRST RULE ══════════ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: SPRING }}
              className="relative space-y-5"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(232, 185, 49, 0.12)", border: "1px solid rgba(232, 185, 49, 0.35)" }}
                >
                  <Sliders className="h-8 w-8" style={{ color: C.mustard }} />
                </div>
                <h2 className="font-display text-2xl font-bold" style={{ color: C.white }}>
                  Create your first auto-reply rule
                </h2>
                <p className="mt-2 text-sm" style={{ color: C.slateMuted }}>
                  We pre-filled a handy one — any comment containing the word below gets an instant reply.
                </p>
              </div>

              <div
                className="space-y-4 rounded-2xl p-5"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}
              >
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.slateMuted }}>
                    Rule Name
                  </label>
                  <input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    style={inputStyle}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium focus:brightness-125"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.slateMuted }}>
                    Trigger Keywords (comma separated)
                  </label>
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium focus:brightness-125"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.slateMuted }}>
                      Response Template
                    </label>
                    <span
                      className="rounded-md px-2 py-0.5 text-[9px] font-mono"
                      style={{ background: "rgba(232, 185, 49, 0.12)", color: C.mustard }}
                    >
                      {"{{commenter_name}}"} supported
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    style={inputStyle}
                    className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm font-medium focus:brightness-125"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-semibold transition hover:opacity-80 cursor-pointer"
                    style={{ color: C.slateMuted }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: C.mustard }}
                  >
                    Skip to Dashboard
                  </button>
                </div>
                <button
                  disabled={loading || !ruleName.trim() || !keywords.trim() || !replyBody.trim()}
                  onClick={handleSaveRule}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={primaryBtn}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: C.charcoal }} />
                      Saving Rule...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 3 — WATCH IT WORK ══════════ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: SPRING }}
              className="relative space-y-6"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(232, 185, 49, 0.12)", border: "1px solid rgba(232, 185, 49, 0.35)" }}
                >
                  <Radio className="h-8 w-8" style={{ color: C.mustard }} />
                </div>
                <h2 className="font-display text-2xl font-bold" style={{ color: C.white }}>
                  Watch it work
                </h2>
                <p className="mt-2 text-sm leading-relaxed max-w-md mx-auto" style={{ color: C.slateMuted }}>
                  Your first rule is live. Incoming comments are scanned 24/7 and auto-replied in seconds — follow the live pipeline in real time.
                </p>
              </div>

              {/* Pipeline visual */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}
              >
                {[
                  { icon: Search, label: "Comment received", sub: "YouTube Studio → QuickReply engine" },
                  { icon: Zap, label: "Rule matched", sub: `"${keywords.trim()}" detected` },
                  { icon: Send, label: "Auto-reply sent", sub: replyBody },
                ].map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(232, 185, 49, 0.12)", border: "1px solid rgba(232, 185, 49, 0.3)" }}
                    >
                      <stage.icon className="h-4 w-4" style={{ color: C.mustard }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold" style={{ color: C.white }}>
                        {i + 1}. {stage.label}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: C.slateMuted }}>
                        {stage.sub}
                      </p>
                    </div>
                    {i < 2 && (
                      <div className="hidden md:block">
                        <ArrowRight className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => router.push("/dashboard/feed")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition active:scale-95 hover:brightness-105 cursor-pointer"
                  style={primaryBtn}
                >
                  <Sparkles className="h-4 w-4" style={{ color: C.charcoal }} />
                  Open Live Feed
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold transition hover:bg-white/5 active:scale-95 cursor-pointer"
                  style={ghostBtn}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Go to Dashboard
                </button>
                <p className="text-center text-[10px]" style={{ color: C.slateMuted }}>
                  <MessagesSquare className="mr-1 inline h-3 w-3" />
                  New comments arrive in your live feed within 30 seconds.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
