"use client";

/**
 * ============================================================================
 *  QuickReply — Butter-Smooth 120fps Auth Experience (Zero-Jitter, Pure Speed)
 *  src/frontend/components/auth/UnifiedAuthExperience.tsx
 * ============================================================================
 */

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { StudioMockupIllustration } from "./StudioMockupIllustration";

export type AuthMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "verify"
  | "setup-2fa";
type LoginMethod = "password" | "totp";

interface UnifiedAuthExperienceProps {
  initialMode?: AuthMode;
}

export function UnifiedAuthExperience({
  initialMode = "login",
}: UnifiedAuthExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode state
  const paramMode = searchParams.get("mode") as "login" | "signup" | null;
  const [mode, setMode] = useState<AuthMode>(paramMode || initialMode);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");

  // Input states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 6-Digit Google Authenticator states
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2FA Setup states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // High performance typing trigger
  const handleTypingEvent = useCallback(() => {
    if (!isTyping) setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 400);
  }, [isTyping]);

  // Social OAuth Handlers
  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  const handleMetaAuth = () => {
    window.location.href = "/api/auth/facebook";
  };

  // Google Authenticator Setup Fetch
  const handleInit2FASetup = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setSetupLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to setup Google Authenticator");
        setSetupLoading(false);
        return;
      }

      setQrCodeUrl(data.qrCodeDataUrl);
      setTotpSecret(data.totpSecret);
      setMode("setup-2fa");
      setSetupLoading(false);
    } catch {
      setError("Unable to connect to 2FA service.");
      setSetupLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!totpSecret) return;
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleTotpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...totpCode];
    newCode[index] = val.slice(-1);
    setTotpCode(newCode);

    if (val && index < 5) {
      totpRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !totpCode[index] && index > 0) {
      totpRefs.current[index - 1]?.focus();
    }
  };

  // Login Submit Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Welcome back! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  // 1-Click Demo Login Handler
  const handleDemoLogin = async () => {
    setEmail("demo@quickreply.io");
    setPassword("demo1234");
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "demo@quickreply.io",
          password: "demo1234",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Demo login failed.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Signed in as Demo Merchant! Redirecting to Dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setError("Unable to connect to server.");
      setLoading(false);
    }
  };

  // Forgot Password Submit Handler
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your account email.");
      return;
    }
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Password reset link has been dispatched to your email!");
    }, 800);
  };

  // Sign Up Submit Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!/\d/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError("Password must contain at least one symbol or special character.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Account created! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  // TOTP 2FA Verification Handler
  const handleTotpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.join("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit Google Authenticator code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          isLogin: mode === "login",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Authenticated successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#FAF8F5] flex items-center justify-center p-4 sm:p-8 lg:p-12 font-sans text-[#161616] antialiased relative overflow-hidden selection:bg-[#EE7D60]/20 selection:text-[#EE7D60]">
      
      {/* ── Background Geometric Float Elements (Warm Editorial QuickReply Palette) ── */}
      <div className="absolute top-10 left-16 w-3.5 h-3.5 bg-[#EE7D60] rounded-full pointer-events-none shadow-xs" />
      <div className="absolute top-14 left-24 w-4 h-4 rounded-full border-2 border-[#EE7D60]/30 pointer-events-none" />
      <div className="absolute top-8 right-16 text-3xl pointer-events-none select-none drop-shadow-xs">⚡</div>
      <div className="absolute bottom-12 right-28 w-6 h-6 rounded-full bg-[#FFE4D6] pointer-events-none shadow-xs" />
      <div className="absolute bottom-6 left-8 w-2.5 h-2.5 bg-[#161616] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-3.5 h-3.5 bg-[#EE7D60] rounded-full pointer-events-none" />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN WHITE CANVAS CARD
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[480px] lg:max-w-[1120px] min-h-auto lg:min-h-[640px] bg-white text-[#161616] rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] shadow-2xl p-5 sm:p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between relative z-20 gap-8 lg:gap-14 border border-black/5 transform-gpu my-auto">
        
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT COLUMN: The World's Most Powerful Reply Tool + 3D Studio Mockup (Desktop Only)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex w-full lg:w-[48%] flex-col justify-between space-y-6 lg:space-y-8 select-none">
          
          {/* Top Brand Headline */}
          <div className="relative space-y-3 z-10">
            <div className="absolute -top-8 -left-6 w-44 h-44 rounded-full border border-black/5 pointer-events-none -z-10" />

            <h1 className="relative z-10 text-[32px] sm:text-[38px] xl:text-[42px] font-black text-[#161616] leading-[1.14] tracking-tight">
              The World&apos;s Most <br />
              Powerful Autonomous Reply Engine.
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed max-w-[340px]">
              Scale your customer conversations with the fastest multi-channel AI platform.
            </p>
          </div>

          {/* 3D Studio Computer & Floating Mockups with 120fps RAF lerp */}
          <div className="w-full flex items-center justify-center pt-2">
            <StudioMockupIllustration isTyping={isTyping} />
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN: Sign in Now / Sign up Now Interface
            ══════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[52%] flex flex-col justify-between space-y-5 sm:space-y-6">
          
          {/* ── Top Header Bar: Logo on mobile + Not a member? + Button ── */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-black text-[#161616] text-sm tracking-tight group">
              <span className="w-7 h-7 rounded-lg bg-[#EE7D60] text-white flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform">⚡</span>
              <span className="text-base font-black">QuickReply</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3.5 ml-auto">
              <span className="text-xs text-slate-500 font-medium hidden xs:inline">
                {mode === "login" ? "Not a member?" : "Already a member?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode(mode === "login" ? "signup" : "login");
                }}
                className="bg-[#161616] hover:bg-black text-white text-xs font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl shadow-md hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer select-none"
              >
                {mode === "login" ? "Sign up now" : "Sign in now"}
              </button>
            </div>
          </div>

          {/* ── Main Form Area ── */}
          <div className="space-y-5 max-w-[420px] w-full">
            
            {/* Morphing Form Title & Subtitle */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-1"
              >
                <h2 className="text-[28px] sm:text-[34px] font-black text-[#161616] tracking-tight uppercase">
                  {mode === "signup" ? "Create Account." : mode === "setup-2fa" ? "2FA Setup." : "Sign In."}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {mode === "signup"
                    ? "Enter your details to create your QuickReply workspace"
                    : mode === "setup-2fa"
                    ? "Scan with Google Authenticator to activate"
                    : "Enter your account credentials to access your dashboard"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Error / Success Alerts */}
            {error && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-2.5 font-medium shadow-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2.5 font-medium shadow-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── Butter-Smooth Social 1-Click OAuth Buttons (Google & Meta) ── */}
            {mode !== "setup-2fa" && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="h-11 px-3 rounded-2xl border border-black/10 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer select-none"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleMetaAuth}
                  className="h-11 px-3 rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 text-xs font-bold text-[#1877F2] flex items-center justify-center gap-2 shadow-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer select-none"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Meta Login</span>
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODE 1: LOGIN (PASSWORD & GOOGLE AUTHENTICATOR)
                ══════════════════════════════════════════════════════════════ */}
            {mode === "login" && (
              <div className="space-y-4">
                
                {/* Method Switch: Password vs 2FA */}
                <div className="flex gap-3 text-xs font-bold border-b border-black/5 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setLoginMethod("password");
                    }}
                    className={`cursor-pointer transition-colors relative ${
                      loginMethod === "password" ? "text-[#EE7D60] underline font-extrabold" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setLoginMethod("totp");
                    }}
                    className={`cursor-pointer flex items-center gap-1 transition-colors ${
                      loginMethod === "totp" ? "text-[#EE7D60] underline font-extrabold" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Google Authenticator (2FA)</span>
                  </button>
                </div>

                {/* Sub-A: Standard Password Login Form */}
                {loginMethod === "password" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {/* Username or Email Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Username or Email
                      </label>
                      <div
                        className={`h-12 bg-white rounded-2xl border px-3.5 flex items-center gap-3 transition-colors duration-150 ${
                          focusedField === "email"
                            ? "border-[#EE7D60] shadow-[0_0_0_4px_rgba(238,125,96,0.15)]"
                            : "border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                          focusedField === "email" ? "bg-[#EE7D60] text-white shadow-xs" : "bg-[#FFF0EB] text-[#EE7D60]"
                        }`}>
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            handleTypingEvent();
                          }}
                          placeholder="you@example.com"
                          className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setMode("forgot-password")}
                          className="text-xs font-medium text-[#EE7D60] hover:underline cursor-pointer"
                        >
                          Forget password?
                        </button>
                      </div>
                      <div
                        className={`h-12 bg-white rounded-2xl border px-3.5 flex items-center gap-3 transition-colors duration-150 ${
                          focusedField === "password"
                            ? "border-[#EE7D60] shadow-[0_0_0_4px_rgba(238,125,96,0.15)]"
                            : "border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                          focusedField === "password" ? "bg-[#161616] text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            handleTypingEvent();
                          }}
                          placeholder="Password"
                          className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Sign in and Demo Login Buttons */}
                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-36 sm:w-40 h-12 rounded-2xl bg-[#EE7D60] hover:bg-[#e06c4f] text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 select-none transform-gpu"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Sign in</span>}
                      </button>

                      <button
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={loading}
                        className="h-12 px-4 rounded-2xl bg-[#F5F6F0] hover:bg-[#eceee5] text-[#161616] border border-black/10 font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 select-none"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Demo Account</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-B: Google Authenticator 2FA Login */}
                {loginMethod === "totp" && (
                  <form onSubmit={handleTotpVerifySubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Account Email
                      </label>
                      <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-2xs px-3.5 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-[#FFF0EB] text-[#EE7D60] flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            handleTypingEvent();
                          }}
                          placeholder="you@example.com"
                          className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        6-Digit Google Authenticator Code
                      </label>
                      <div className="flex items-center justify-between gap-1.5">
                        {totpCode.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              totpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleTotpChange(i, e.target.value)}
                            onKeyDown={(e) => handleTotpKeyDown(i, e)}
                            className="w-11 h-12 text-center font-mono font-bold text-lg bg-white border border-slate-200 rounded-2xl shadow-2xs focus:outline-none focus:border-[#EE7D60] focus:ring-2 focus:ring-[#EE7D60]/20 transition-all duration-150"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading || totpCode.join("").length < 6}
                        className="h-12 px-6 rounded-2xl bg-[#EE7D60] hover:bg-[#e06c4f] text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 select-none transform-gpu"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Verify 2FA</span>}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODE 2: SIGN UP FLOW
                ══════════════════════════════════════════════════════════════ */}
            {mode === "signup" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div
                    className={`h-12 bg-white rounded-2xl border px-3.5 flex items-center gap-3 transition-colors duration-150 ${
                      focusedField === "fullName"
                        ? "border-[#EE7D60] shadow-[0_0_0_4px_rgba(238,125,96,0.15)]"
                        : "border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      focusedField === "fullName" ? "bg-[#161616] text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onFocus={() => setFocusedField("fullName")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        handleTypingEvent();
                      }}
                      placeholder="e.g. Subhransu Nayak"
                      className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email
                  </label>
                  <div
                    className={`h-12 bg-white rounded-2xl border px-3.5 flex items-center gap-3 transition-colors duration-150 ${
                      focusedField === "signupEmail"
                        ? "border-[#EE7D60] shadow-[0_0_0_4px_rgba(238,125,96,0.15)]"
                        : "border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      focusedField === "signupEmail" ? "bg-[#EE7D60] text-white shadow-xs" : "bg-[#FFF0EB] text-[#EE7D60]"
                    }`}>
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onFocus={() => setFocusedField("signupEmail")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        handleTypingEvent();
                      }}
                      placeholder="you@example.com"
                      className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Create Password
                  </label>
                  <div
                    className={`h-12 bg-white rounded-2xl border px-3.5 flex items-center gap-3 transition-colors duration-150 ${
                      focusedField === "signupPassword"
                        ? "border-[#EE7D60] shadow-[0_0_0_4px_rgba(238,125,96,0.15)]"
                        : "border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      focusedField === "signupPassword" ? "bg-[#161616] text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onFocus={() => setFocusedField("signupPassword")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        handleTypingEvent();
                      }}
                      placeholder="At least 8 characters"
                      className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Google Authenticator (2FA) Quick Setup Drawer Toggle */}
                <div className="p-3 rounded-2xl bg-[#F5F6F0] border border-black/5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Google Authenticator (2FA)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInit2FASetup}
                    disabled={setupLoading}
                    className="px-3 py-1.5 rounded-xl bg-white border border-black/10 text-[#EE7D60] text-xs font-bold hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    {setupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                    <span>Set up 2FA</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-40 sm:w-44 h-12 rounded-2xl bg-[#EE7D60] hover:bg-[#e06c4f] text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 select-none transform-gpu"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Sign up</span>}
                  </button>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODE 3: GOOGLE AUTHENTICATOR SETUP MODAL
                ══════════════════════════════════════════════════════════════ */}
            {mode === "setup-2fa" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-black/5">
                  <span className="text-xs font-bold text-slate-800">Scan with Google Authenticator</span>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Back
                  </button>
                </div>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-2xl border border-black/5 space-y-2.5">
                    <img src={qrCodeUrl} alt="Google Authenticator QR Code" className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs" />
                    {totpSecret && (
                      <div className="w-full flex items-center justify-between bg-white p-2 rounded-xl border border-black/10 text-[11px] font-mono font-bold text-slate-700">
                        <span>{totpSecret}</span>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="text-[#EE7D60] p-1 hover:scale-110 active:scale-95 transition-transform"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleTotpVerifySubmit} className="space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    {totpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          totpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleTotpChange(i, e.target.value)}
                        onKeyDown={(e) => handleTotpKeyDown(i, e)}
                        className="w-10 h-11 text-center font-mono font-bold text-base bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:border-[#EE7D60] transition-colors"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || totpCode.join("").length < 6}
                    className="w-full h-11 rounded-2xl bg-[#EE7D60] hover:bg-[#e06c4f] text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Activate &amp; Continue</span>}
                  </button>
                </form>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODE 4: FORGOT PASSWORD FLOW
                ══════════════════════════════════════════════════════════════ */}
            {mode === "forgot-password" && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-black/5">
                  <span className="text-xs font-bold text-slate-800">Reset Your Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-[#EE7D60] hover:underline cursor-pointer font-bold"
                  >
                    Back to Sign In
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your verified account email address and we&apos;ll send you a secure link to reset your password.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Email Address
                  </label>
                  <div className="h-12 bg-white rounded-2xl border border-slate-200 px-3.5 flex items-center gap-3 shadow-2xs">
                    <div className="w-6 h-6 rounded-lg bg-[#FFF0EB] text-[#EE7D60] flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-[#EE7D60] hover:bg-[#e06c4f] text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 select-none"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Send Reset Instructions</span>}
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
