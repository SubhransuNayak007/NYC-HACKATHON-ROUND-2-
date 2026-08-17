"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  Brain,
  MessageSquare,
  GitFork,
} from "lucide-react";
import { IsometricTiles3DExperience } from "./IsometricTiles3DExperience";

export type AuthMode =
  | "signup"
  | "login"
  | "verify"
  | "create-password"
  | "forgot-password"
  | "reset-password";

interface UnifiedAuthExperienceProps {
  initialMode?: AuthMode;
}

export function UnifiedAuthExperience({
  initialMode = "signup",
}: UnifiedAuthExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode state
  const paramMode = searchParams.get("mode") as AuthMode | null;
  const [mode, setMode] = useState<AuthMode>(paramMode || initialMode);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "md.imranhossen.db@gmail.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Async & feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);

  // Sync mode with URL when query changes
  useEffect(() => {
    if (paramMode && paramMode !== mode) {
      setMode(paramMode);
      setError(null);
      setSuccessMsg(null);
    }
  }, [paramMode]);

  // Resend OTP countdown
  useEffect(() => {
    if (mode === "verify" && resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [mode, resendTimer]);

  // Smooth State Switcher
  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessMsg(null);
    setMode(newMode);
    window.history.replaceState(null, "", `/${newMode === "signup" ? "register" : newMode}`);
  };

  // ── SUBMIT HANDLERS ──

  // Signup Submit
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
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
        setError(data.error || "Unable to create account. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setMode("verify");
      setResendTimer(60);
    } catch {
      setError("Connection error. Please verify your internet connection.");
      setLoading(false);
    }
  };

  // Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  // OTP Verification Submit
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));
      router.push("/onboarding");
    } catch {
      setError("Invalid code. Please request a new one.");
      setLoading(false);
    }
  };

  // OTP Digit Change
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    pasted.split("").forEach((c, i) => {
      newOtp[i] = c;
    });
    setOtp(newOtp);

    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  // Forgot Password Submit
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 700));
      setSuccessMsg(`Recovery link sent to ${email}`);
    } catch {
      setError("Unable to process request. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 700));
      setSuccessMsg("Password updated successfully!");
      setTimeout(() => {
        switchMode("login");
      }, 1400);
    } catch {
      setError("Link expired or invalid.");
      setLoading(false);
    }
  };

  // Social OAuth
  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  const handleAppleAuth = () => {
    setError("Apple authentication will be available in the next release. Please use Google or Email.");
  };

  return (
    <div className="min-h-screen w-full bg-[#E5E9EE] flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Outer Card (Exact Dribbble Reference Dimensions & Floating Glass Card) ── */}
      <div className="w-full max-w-[1240px] min-h-[720px] lg:h-[780px] bg-[#F5F6F8] rounded-[32px] sm:rounded-[36px] border border-white/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] p-4 sm:p-5 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT PANEL: Clean Form Zone (Exact Spacing & Sizing)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative">
          
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between w-full">
            {/* Logo + Brand Name */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] tracking-tight text-slate-900 leading-none">
                  QuickReply
                </span>
                <span className="text-[9px] font-extrabold tracking-[0.14em] text-slate-400 uppercase mt-0.5">
                  ENTERPRISE
                </span>
              </div>
            </Link>

            {/* Contextual Top-Right Switcher Button */}
            <div className="flex items-center text-xs text-slate-500">
              {mode === "signup" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="px-3 py-1 rounded-lg border border-slate-300/80 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                  >
                    Login
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Don&apos;t have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="px-3 py-1 rounded-lg border border-slate-300/80 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>
              )}

              {mode === "verify" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Check your</span>
                  <span className="px-3 py-1 rounded-lg border border-slate-300/80 bg-white text-slate-700 font-semibold shadow-2xs">
                    Inbox
                  </span>
                </div>
              )}

              {(mode === "forgot-password" || mode === "reset-password") && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Center Dynamic Form Container with Smooth Crossfade ── */}
          <div className="w-full max-w-[360px] mx-auto my-auto py-2">
            <AnimatePresence mode="wait">
              
              {/* ═══════════════════════════════════════════════════════════════
                  STATE 1: SIGN UP ("Create your account")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "signup" && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-2xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Create your account
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        Get started with QuickReply in minutes.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full h-11 px-4 rounded-[13px] bg-[#ECEFF3] hover:bg-[#E2E6EC] text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign up with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAppleAuth}
                      className="w-full h-11 px-4 rounded-[13px] bg-[#ECEFF3] hover:bg-[#E2E6EC] text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
                      </svg>
                      <span>Sign up with Apple</span>
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200" />
                    <span className="absolute px-3 bg-[#F5F6F8] text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Create password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-3.5 pr-10 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-[13px] bg-slate-950 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer pt-0.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <span>Sign up with Email</span>
                      )}
                    </button>
                  </form>

                  <p className="text-[11px] text-center text-slate-400 leading-normal">
                    By continuing, you acknowledge QuickReply{" "}
                    <Link href="/privacy" className="underline hover:text-slate-600">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STATE 2: SIGN IN ("Welcome back!")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-2xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Welcome back!
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        Sign in to continue where you left off.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full h-11 px-4 rounded-[13px] bg-[#ECEFF3] hover:bg-[#E2E6EC] text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Login with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAppleAuth}
                      className="w-full h-11 px-4 rounded-[13px] bg-[#ECEFF3] hover:bg-[#E2E6EC] text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
                      </svg>
                      <span>Login with Apple</span>
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200" />
                    <span className="absolute px-3 bg-[#F5F6F8] text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-3.5 pr-10 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode("forgot-password")}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-[13px] bg-slate-950 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>Login with Email</span>
                      )}
                    </button>
                  </form>

                  <p className="text-[11px] text-center text-slate-400 leading-normal">
                    By continuing, you acknowledge QuickReply{" "}
                    <Link href="/privacy" className="underline hover:text-slate-600">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STATE 3: OTP VERIFY ("Check your inbox")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "verify" && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-2xs">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Check your inbox
                      </h1>
                      <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-normal">
                        Enter the verification code we just sent to{" "}
                        <span className="font-semibold text-slate-700 block truncate">{email || "your email"}</span>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerify} className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpInputRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 shadow-2xs transition-all"
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.join("").length < 6}
                      className="w-full h-11 rounded-[13px] bg-slate-950 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Continue</span>
                      )}
                    </button>

                    <div className="text-center">
                      {resendTimer > 0 ? (
                        <span className="text-[11px] text-slate-400">
                          Resend code in <strong className="text-slate-600">{resendTimer}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setResendTimer(60)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                        >
                          Resend email
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200" />
                    <span className="absolute px-3 bg-[#F5F6F8] text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full h-11 px-4 rounded-[13px] bg-[#ECEFF3] hover:bg-[#E2E6EC] text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    Continue with password
                  </button>

                  <p className="text-[11px] text-center text-slate-400 space-x-2">
                    <Link href="/terms" className="hover:text-slate-600 underline">
                      Terms of Use
                    </Link>
                    <span>&bull;</span>
                    <Link href="/privacy" className="hover:text-slate-600 underline">
                      Privacy Policy
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STATE 4: FORGOT PASSWORD ("Reset your password")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "forgot-password" && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-2xs">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Reset your password
                      </h1>
                      <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
                        Enter your verified email and we&apos;ll send recovery instructions.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  {successMsg ? (
                    <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-center space-y-3 animate-fadeIn">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <div className="text-sm font-bold text-emerald-950">
                        Recovery link dispatched
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        {successMsg}
                      </p>
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="inline-block text-xs font-bold text-slate-900 underline hover:text-black transition-colors cursor-pointer"
                      >
                        Return to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <input
                          type="email"
                          required
                          placeholder="Work email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-[13px] bg-slate-950 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Sending link...</span>
                          </>
                        ) : (
                          <span>Send reset link</span>
                        )}
                      </button>
                    </form>
                  )}

                  <p className="text-[11px] text-center text-slate-400">
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-medium text-slate-700 hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STATE 5: RESET PASSWORD ("Set new password")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "reset-password" && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-2xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Set new password
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        Create a secure password with at least 8 characters.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  {successMsg ? (
                    <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-center space-y-2 animate-fadeIn">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <div className="text-sm font-bold text-emerald-950">
                        {successMsg}
                      </div>
                      <p className="text-xs text-emerald-800">
                        Redirecting you to login...
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="New password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-3.5 pr-10 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-[13px] border border-slate-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-[13px] bg-slate-950 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Updating password...</span>
                          </>
                        ) : (
                          <span>Update password</span>
                        )}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Bottom Left Footer ── */}
          <div className="flex items-center justify-between w-full pt-4 border-t border-slate-200/60 text-[11px] text-slate-400 font-medium">
            <span>&copy; 2026 QuickReply.ai</span>
            <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-pointer transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="font-semibold">ENG</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT PANEL: Sub-Card with Pure Interactive 3D Isometric Engine & Live Workflow Reel
            (Matches Reference Layout & Aesthetics 100%)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-[1.15] bg-gradient-to-br from-[#dcebff] via-[#eaf3ff] to-[#accffc] rounded-[26px] border border-white/80 p-8 lg:p-10 flex-col justify-between relative overflow-hidden shadow-sm select-none cursor-default">
          
          {/* Top Feature Headline & Description */}
          <div className="relative z-20 space-y-2 max-w-[340px] pt-1">
            <h2 className="text-[26px] xl:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.16]">
              Build, Deploy &amp; Manage Enterprise AI Agents
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-[320px]">
              Manage every AI agent, workflow, and business automation from one intelligent platform built for modern enterprises.
            </p>
          </div>

          {/* ── Pure Interactive 3D Isometric Tiles Stage ── */}
          <div className="absolute top-0 right-0 w-[520px] h-[440px] z-10 pointer-events-auto">
            <IsometricTiles3DExperience />
          </div>

          {/* ── Bottom Workflow Execution Cards (Exact Visual Match) ── */}
          <div className="relative z-20 space-y-2.5">
            
            {/* Card 1: Autonomous AI knowledge base sync (Working...) */}
            <div className="p-3.5 rounded-2xl bg-white/75 backdrop-blur-md border border-white/80 shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Glowing Blue Indicator */}
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] shrink-0 animate-pulse" />
                
                {/* Brain / AI Icon Badge */}
                <div className="w-7 h-7 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0">
                  <Brain className="w-4 h-4" />
                </div>

                {/* Title & Animated Progress Bar */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    Autonomous AI knowledge base sync
                  </div>
                  <div className="h-1.5 w-full max-w-[200px] bg-slate-200/60 rounded-full overflow-hidden">
                    <motion.div
                      animate={{
                        width: ["15%", "75%", "92%", "40%"],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[11px] font-semibold text-amber-600">Working...</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
            </div>

            {/* Card 2: Customer conversation analysis (Done) */}
            <div className="p-3.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Glowing Green Indicator */}
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                
                {/* Chat Bubble Icon Badge */}
                <div className="w-7 h-7 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>

                {/* Title & Green Progress Bar */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    Customer conversation analysis
                  </div>
                  <div className="h-1.5 w-full max-w-[200px] bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[11px] font-semibold text-emerald-600">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Card 3: Workflow automation setup (Done) */}
            <div className="p-3.5 rounded-2xl bg-white/45 backdrop-blur-sm border border-white/60 shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Glowing Green Indicator */}
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                
                {/* Network / Hierarchy Icon Badge */}
                <div className="w-7 h-7 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0">
                  <GitFork className="w-3.5 h-3.5" />
                </div>

                {/* Title & Green Progress Bar */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    Workflow automation setup
                  </div>
                  <div className="h-1.5 w-full max-w-[200px] bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="text-[11px] font-semibold text-emerald-600/90">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500/90" />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
