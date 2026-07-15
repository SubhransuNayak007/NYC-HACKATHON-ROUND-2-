"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Radio,
  Tv,
  Activity,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import ThemeToggle from "@/frontend/components/ThemeToggle";

interface TVEmitLightAuthProps {
  mode: "login" | "signup";
}

export function TVEmitLightAuth({ mode }: TVEmitLightAuthProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mouse parallax state for dynamic light ray angle shift
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name or workspace title.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || (mode === "login" ? "Invalid credentials." : "Registration failed."));
        setLoading(false);
        return;
      }

      setSuccessMsg(mode === "login" ? "Signed in! Launching workspace..." : "Account created! Initializing system...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen relative overflow-hidden flex flex-col justify-between bg-[#0A0D14] text-slate-100 select-none"
    >
      {/* ═══════════════════════════════════════════════════════════════
          1. 3D SPATIAL RETRO TV ARRAY WITH VOLUMETRIC LIGHT RAYS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle Scanline Overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] z-30 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Ambient Room Lighting and Fog */}
        <div className="absolute inset-0 bg-radial from-amber-500/10 via-blue-900/15 to-transparent blur-3xl" />

        {/* Volumetric Light Beams Emitting from Center TV */}
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[750px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(-50%, 0) rotate(${(mousePos.x - 0.5) * 12}deg)`,
          }}
        >
          {/* Main Cone Light Ray */}
          <div
            className="w-full h-full opacity-60 mix-blend-screen filter blur-2xl"
            style={{
              background:
                "conic-gradient(from 180deg at 50% 0%, rgba(232, 185, 49, 0.35) 0deg, rgba(66, 133, 244, 0.25) 28deg, transparent 45deg, transparent 315deg, rgba(139, 92, 246, 0.25) 332deg, rgba(232, 185, 49, 0.35) 360deg)",
            }}
          />
        </div>

        {/* Left Monitor Light Ray */}
        <div
          className="absolute top-[18%] left-[12%] w-[500px] h-[600px] opacity-45 mix-blend-screen filter blur-xl transition-transform duration-300"
          style={{
            transform: `rotate(${25 + (mousePos.x - 0.5) * 8}deg)`,
            background: "linear-gradient(135deg, rgba(52, 211, 153, 0.3) 0%, rgba(66, 133, 244, 0.15) 40%, transparent 80%)",
          }}
        />

        {/* Right Monitor Light Ray */}
        <div
          className="absolute top-[18%] right-[12%] w-[500px] h-[600px] opacity-45 mix-blend-screen filter blur-xl transition-transform duration-300"
          style={{
            transform: `rotate(${-25 + (mousePos.x - 0.5) * 8}deg)`,
            background: "linear-gradient(225deg, rgba(232, 185, 49, 0.35) 0%, rgba(244, 63, 94, 0.15) 40%, transparent 80%)",
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════
            THE PHYSICAL RETRO TV / MONITOR CHASSIS UNITS
            ═══════════════════════════════════════════════════════════════ */}
        <div className="absolute inset-x-0 top-12 sm:top-16 flex items-center justify-center gap-6 sm:gap-12 lg:gap-20 opacity-90 px-4">
          {/* TV 1 (Left Monitor): Neural RAG Engine Stream */}
          <div className="hidden md:block w-56 lg:w-64 h-44 lg:h-48 rounded-2xl bg-zinc-900 border-4 border-zinc-800 shadow-2xl p-2.5 relative transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            {/* Vintage CRT Screen */}
            <div className="w-full h-full rounded-xl bg-[#08151A] border border-cyan-500/30 p-2.5 font-mono text-[10px] text-cyan-400 overflow-hidden relative shadow-inner">
              <div className="flex items-center justify-between text-[9px] text-cyan-600 pb-1 border-b border-cyan-900/60">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  RAG_CORE.01
                </span>
                <span>99.8%</span>
              </div>
              <div className="mt-1.5 space-y-1 opacity-90">
                <div className="text-emerald-400">&gt; VECTOR_EMBED_14K</div>
                <div>&gt; CHUNK_MATCH: 0.942</div>
                <div className="text-amber-300">&gt; RETRIEVE_PRICE: OK</div>
                <div className="text-cyan-300/60 text-[8px] truncate">SYS::TOKEN_SYNC_STREAM</div>
              </div>
              {/* Screen Glow */}
              <div className="absolute inset-0 bg-radial from-cyan-400/10 to-transparent pointer-events-none" />
            </div>
            {/* TV Stand Base */}
            <div className="w-16 h-3 bg-zinc-800 mx-auto -bottom-3 rounded-b-md shadow-md" />
          </div>

          {/* TV 2 (Center Large Monitor): Autonomous WhatsApp Hub */}
          <div className="w-72 sm:w-80 lg:w-96 h-52 sm:h-56 lg:h-60 rounded-3xl bg-zinc-900 border-4 border-zinc-800 shadow-2xl p-3 relative transform hover:scale-105 transition-transform duration-300">
            {/* Top Vintage Antenna */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-4 text-zinc-600">
              <div className="w-0.5 h-6 bg-zinc-700 -rotate-25 origin-bottom" />
              <div className="w-0.5 h-6 bg-zinc-700 rotate-25 origin-bottom" />
            </div>

            {/* Glowing Amber Phosphor Screen */}
            <div className="w-full h-full rounded-2xl bg-[#140F05] border-2 border-amber-500/40 p-3 font-mono text-[11px] text-amber-400 overflow-hidden relative shadow-inner">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-900/60">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Smartphone className="w-3.5 h-3.5" />
                  WHATSAPP_AUTONOMOUS_V3
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                  LIVE
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="text-slate-300">&gt; [INBOUND] &quot;Is Black Headset available?&quot;</div>
                <div className="text-emerald-400">&gt; [VERIFIED] Stock: 24 units in BLR</div>
                <div className="text-amber-200 font-bold">&gt; [AUTO_SENT] &quot;Yes! In stock at ₹4,499&quot; (1.1s)</div>
              </div>
              {/* Emitted Screen Core Flare */}
              <div className="absolute inset-0 bg-radial from-amber-400/20 via-amber-600/5 to-transparent pointer-events-none" />
            </div>

            {/* Vintage Knobs & Dial on Chassis */}
            <div className="absolute right-1 bottom-4 flex flex-col gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-600 shadow-xs" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-600 shadow-xs" />
            </div>
          </div>

          {/* TV 3 (Right Monitor): Real-Time Oscilloscope & Latency Radar */}
          <div className="hidden md:block w-56 lg:w-64 h-44 lg:h-48 rounded-2xl bg-zinc-900 border-4 border-zinc-800 shadow-2xl p-2.5 relative transform rotate-6 hover:rotate-0 transition-transform duration-300">
            {/* Vintage CRT Screen */}
            <div className="w-full h-full rounded-xl bg-[#140608] border border-rose-500/30 p-2.5 font-mono text-[10px] text-rose-400 overflow-hidden relative shadow-inner">
              <div className="flex items-center justify-between text-[9px] text-rose-500 pb-1 border-b border-rose-900/60">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  RADAR_TELEMETRY
                </span>
                <span>1.4s</span>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="text-rose-300">&gt; FIREWALL: ZERO_THREAT</div>
                <div className="text-purple-400">&gt; LATENCY: 1.4s AVG</div>
                <div className="text-emerald-400">&gt; DEFLECTION: 88.4%</div>
                <div className="text-rose-400/60 text-[8px]">SYS_STATUS: 99.98% SLA</div>
              </div>
              {/* Screen Glow */}
              <div className="absolute inset-0 bg-radial from-rose-400/10 to-transparent pointer-events-none" />
            </div>
            {/* TV Stand Base */}
            <div className="w-16 h-3 bg-zinc-800 mx-auto -bottom-3 rounded-b-md shadow-md" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. TOP HEADER BRAND BAR
          ═══════════════════════════════════════════════════════════════ */}
      <header className="relative z-20 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            <Sparkles className="w-4 h-4 text-zinc-950 fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            {BRAND_CONFIG.name}
          </span>
        </Link>
        <ThemeToggle size="sm" />
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          3. SUSPENDED GLASS AUTH PORTAL (ILLUMINATED BY TV RAYS)
          ═══════════════════════════════════════════════════════════════ */}
      <main className="relative z-20 w-full max-w-[440px] mx-auto px-4 my-auto py-8">
        <div className="rounded-3xl border border-white/15 bg-zinc-950/80 backdrop-blur-xl p-7 sm:p-9 shadow-2xl relative overflow-hidden">
          {/* Card Subtle Edge Sheen */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mode === "login" ? "Welcome back" : "Create your workspace"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {mode === "login"
                ? "Access your autonomous AI conversation operating system"
                : "Deploy your 24/7 autonomous store engine in 2 minutes"}
            </p>
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1-Tap Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-zinc-950 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
              or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name / Workspace
                </label>
                <input
                  type="text"
                  required
                  placeholder="Arjun Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-black/40 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-black/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-white/10 bg-white/5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-black/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>{mode === "login" ? "Signing in..." : "Launching workspace..."}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In to QuickReply" : "Create Workspace"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
            {mode === "login" ? (
              <span>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-amber-400 hover:underline"
                >
                  Create workspace
                </Link>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-amber-400 hover:underline"
                >
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          4. BOTTOM FOOTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="relative z-20 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 text-center text-[11px] text-slate-500">
        By signing in, you agree to QuickReply&apos;s{" "}
        <Link href="/about" className="underline hover:text-slate-300">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/about" className="underline hover:text-slate-300">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
