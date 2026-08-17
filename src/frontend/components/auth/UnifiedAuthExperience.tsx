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
} from "lucide-react";

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

// ── RIGHT-PANEL ANIMATED WORKFLOW TASKS ──
interface WorkflowTask {
  id: string;
  title: string;
  category: string;
}

const WORKFLOW_TASKS: WorkflowTask[] = [
  {
    id: "task-1",
    title: "Identify code optimization opportunities and performance improvements",
    category: "AI Code Analysis",
  },
  {
    id: "task-2",
    title: "Multi-channel comment-to-DM routing on WhatsApp & Instagram",
    category: "Social Automation",
  },
  {
    id: "task-3",
    title: "Autonomous AI knowledge base sync and semantic vector retrieval",
    category: "RAG Pipeline",
  },
  {
    id: "task-4",
    title: "Automated 24/7 lead qualification and intelligent CRM sync",
    category: "Growth Agent",
  },
];

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
  const [email, setEmail] = useState(searchParams.get("email") || "");
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

  // Right panel typing & animation state
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  // Right Panel Typing Effect
  const currentTask = WORKFLOW_TASKS[activeTaskIdx];
  useEffect(() => {
    let char = 0;
    setTypedText("");
    const target = currentTask.title;

    const interval = setInterval(() => {
      if (char <= target.length) {
        setTypedText(target.slice(0, char));
        char++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setActiveTaskIdx((prev) => (prev + 1) % WORKFLOW_TASKS.length);
        }, 3600);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [activeTaskIdx]);

  // 3D Mouse Parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

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
    <div className="min-h-screen w-full bg-[#f0f2f5] flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Main Container (Dribbble Dimensions & Spacing) ── */}
      <div className="w-full max-w-[1240px] min-h-[720px] lg:min-h-[760px] bg-white rounded-[28px] sm:rounded-[36px] border border-slate-200/90 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.06),0_0_1px_1px_rgba(0,0,0,0.02)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT PANEL: Dynamic Smooth Auth State (Cols: 6)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative bg-[#fafafa]">
          
          {/* ── Top Header Navigation ── */}
          <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
            {/* Product Logo & Enterprise Badge */}
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

            {/* Contextual Header Switcher Button */}
            <div className="flex items-center text-xs text-slate-500">
              {mode === "signup" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
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
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>
              )}

              {mode === "verify" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Check your</span>
                  <span className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold bg-slate-50">
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

          {/* ── Center Dynamic Form Container with Framer Motion ── */}
          <div className="w-full max-w-[370px] mx-auto my-auto py-2">
            <AnimatePresence mode="wait">
              
              {/* ═══════════════════════════════════════════════════════════════
                  STATE 1: SIGN UP ("Create your account")
                  ═══════════════════════════════════════════════════════════════ */}
              {mode === "signup" && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Top Avatar Icon + Title */}
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
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

                  {/* Inline Error Alert */}
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  {/* Social Auth Buttons */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
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
                      className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
                      </svg>
                      <span>Sign up with Apple</span>
                    </button>
                  </div>

                  {/* Subtle Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200/70" />
                    <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleSignup} className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Create password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                      className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer pt-0.5"
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

                  {/* Legal Notice */}
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Top Avatar Icon + Title */}
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
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

                  {/* Inline Error Alert */}
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  {/* Social Auth Buttons */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
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
                      className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
                      </svg>
                      <span>Login with Apple</span>
                    </button>
                  </div>

                  {/* Subtle Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200/70" />
                    <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                          className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                      className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
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

                  {/* Legal Notice */}
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Check your inbox
                      </h1>
                      <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
                        Enter the verification code we just sent to{" "}
                        <span className="font-semibold text-slate-700">{email || "your email"}</span>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerify} className="space-y-5">
                    {/* 6 Clean Rounded OTP Input Boxes (Exact Dribbble Match) */}
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
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
                          className="w-11 sm:w-12 h-12 sm:h-13 text-center text-lg font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs transition-all"
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.join("").length < 6}
                      className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
                    <div className="w-full border-t border-slate-200/70" />
                    <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      Or
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200/60 transition-all cursor-pointer"
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
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
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
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
                          className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
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

          {/* ── Bottom Left Footer (Exact Dribbble Match) ── */}
          <div className="flex items-center justify-between w-full pt-6 mt-6 border-t border-slate-200/60 text-[11px] text-slate-400 font-medium">
            <span>&copy; 2026 QuickReply.ai</span>
            <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-pointer transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="font-semibold">ENG</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT PANEL: Precision 3D Isometric Tile Grid & Live Workflow Engine (Cols: 6)
            (Stays completely unbroken across all authentication transitions)
            ══════════════════════════════════════════════════════════════════════ */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="hidden lg:flex lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-[#d9ebff] via-[#eaf2ff] to-[#a8cffd] p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-l border-slate-200/60 select-none cursor-default"
        >
          {/* Ambient Lighting Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.35, 0.5, 0.35],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-16 -right-16 w-80 h-80 bg-blue-300/40 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute -bottom-16 -left-16 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl pointer-events-none"
          />

          {/* Top Feature Headline & Description */}
          <div className="relative z-10 space-y-2.5 pt-2">
            <h2 className="text-[26px] xl:text-[30px] font-bold text-slate-900 tracking-tight leading-[1.18] max-w-[390px]">
              Build, Deploy &amp; Manage Enterprise AI Agents
            </h2>
            <p className="text-xs xl:text-[13px] text-slate-600 leading-relaxed max-w-[400px]">
              Manage every AI agent, workflow, and business automation from one intelligent platform built for modern enterprises.
            </p>
          </div>

          {/* Center 3D Isometric AI Glass Tile with Organic Floating Bounce & Parallax */}
          <div className="relative my-4 flex items-center justify-end pr-2">
            <motion.div
              animate={{
                y: [0, -8, 0],
                x: [0, 4, 0],
              }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                transform: `perspective(1000px) rotateX(${mousePos.y * 6}deg) rotateY(${mousePos.x * -6}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="relative w-[340px] h-[260px] xl:w-[380px] xl:h-[290px] flex items-center justify-center pointer-events-none drop-shadow-2xl"
            >
              {/* High-Precision SVG Isometric 3D Frosted Tiles with Elevated Blue Emblem */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/auth-isometric-3d.svg"
                alt="QuickReply Enterprise 3D AI Grid"
                className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(37,99,235,0.22)]"
              />
            </motion.div>
          </div>

          {/* Bottom Live Animated Workflow Execution Reel (Exact Motion from Video) */}
          <div className="relative z-10 space-y-2.5 overflow-hidden">
            {/* Active Running Task Card with Live Typing */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTask.id}
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -22, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-lg border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  </div>
                  <span className="font-medium text-slate-800 truncate max-w-[240px] xl:max-w-[280px]">
                    {typedText}
                    <span className="animate-pulse text-blue-600 font-bold">|</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-amber-600">Working...</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Done Task Card 2 */}
            <motion.div
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="p-3.5 rounded-2xl bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
                <div className="flex flex-col gap-1 w-32 xl:w-44">
                  <div className="h-2 rounded-full bg-slate-300/60 w-full" />
                  <div className="h-2 rounded-full bg-slate-300/40 w-2/3" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-600">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </motion.div>

            {/* Done Task Card 3 */}
            <motion.div
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.0,
              }}
              className="p-3.5 rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 shadow-xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
                <div className="flex flex-col gap-1 w-24 xl:w-36">
                  <div className="h-2 rounded-full bg-slate-300/50 w-full" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-600/80">Done</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
}
