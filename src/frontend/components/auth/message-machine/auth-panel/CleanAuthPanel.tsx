"use client";

/**
 * ============================================================
 *  QuickReply — Editorial Clean Auth Panel
 *  src/frontend/components/auth/message-machine/auth-panel/CleanAuthPanel.tsx
 *
 *  Ultra-clean, typography-driven authentication interface.
 * ============================================================
 */

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { AuthMode } from "../stateMachine";
import { MM_COLORS } from "../tokens";

interface CleanAuthPanelProps {
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: () => void;
}

export function CleanAuthPanel({
  initialMode = "signup",
  onClose,
  onSuccess,
}: CleanAuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("md.imranhossen.db@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);

  // Countdown timer for OTP
  useEffect(() => {
    if (mode === "verify" && resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [mode, resendTimer]);

  // Social OAuth Handlers
  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  const handleMetaAuth = () => {
    window.location.href = "/api/auth/facebook";
  };

  // Submit Handlers
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
      setError("Connection error. Please check your network.");
      setLoading(false);
    }
  };

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

      onSuccess();
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

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
      await new Promise((r) => setTimeout(r, 500));
      onSuccess();
      router.push("/onboarding");
    } catch {
      setError("Invalid code. Please request a new one.");
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[380px] bg-white rounded-2xl border border-[#DFDFD7] p-6 sm:p-7 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.08)] z-30"
    >
      {/* Top Controls: Close / Back */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#ECECE6]">
        <span className="font-mono text-[10px] tracking-widest text-[#6C6C65] uppercase">
          {mode === "signup" ? "GATEWAY / SIGNUP" : mode === "login" ? "GATEWAY / LOGIN" : "GATEWAY / VERIFY"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[#6C6C65] hover:text-[#111111] hover:bg-[#F7F7F3] transition-colors cursor-pointer"
          title="Back to interactive core"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ── MODE 1: SIGN UP ── */}
        {mode === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                CREATE ACCOUNT.
              </h2>
              <p className="text-xs text-[#6C6C65] mt-0.5">
                Join the autonomous message routing network.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#D34848] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="h-10 px-3 rounded-lg border border-[#DFDFD7] hover:border-[#111111] bg-white text-xs font-semibold text-[#111111] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                className="h-10 px-3 rounded-lg border border-[#DFDFD7] hover:border-[#111111] bg-white text-xs font-semibold text-[#111111] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Meta</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#ECECE6]" />
              <span className="absolute px-2 bg-white font-mono text-[9px] text-[#9C9C94] uppercase tracking-wider">
                Or email
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
                  className="w-full h-10 px-3 text-xs text-[#111111] bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 text-xs text-[#111111] bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-xs text-[#111111] bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C6C65] hover:text-[#111111] p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-[#111111] hover:bg-[#F3C515] hover:text-[#111111] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>CONTINUE →</span>}
              </button>
            </form>

            <div className="text-center pt-1">
              <span className="text-[11px] text-[#6C6C65]">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
                className="text-[11px] font-bold text-[#111111] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        )}

        {/* ── MODE 2: SIGN IN ── */}
        {mode === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                WELCOME BACK.
              </h2>
              <p className="text-xs text-[#6C6C65] mt-0.5">
                Resume active communication workflows.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#D34848] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="h-10 px-3 rounded-lg border border-[#DFDFD7] hover:border-[#111111] bg-white text-xs font-semibold text-[#111111] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                className="h-10 px-3 rounded-lg border border-[#DFDFD7] hover:border-[#111111] bg-white text-xs font-semibold text-[#111111] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Meta</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#ECECE6]" />
              <span className="absolute px-2 bg-white font-mono text-[9px] text-[#9C9C94] uppercase tracking-wider">
                Or email
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-2.5">
              <div>
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 text-xs text-[#111111] bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-xs text-[#111111] bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C6C65] hover:text-[#111111] p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-[#111111] hover:bg-[#F3C515] hover:text-[#111111] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>SIGN IN →</span>}
              </button>
            </form>

            <div className="text-center pt-1">
              <span className="text-[11px] text-[#6C6C65]">Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("signup");
                }}
                className="text-[11px] font-bold text-[#111111] hover:underline cursor-pointer"
              >
                Create one
              </button>
            </div>
          </motion.div>
        )}

        {/* ── MODE 3: OTP VERIFICATION ── */}
        {mode === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                VERIFY INBOX.
              </h2>
              <p className="text-xs text-[#6C6C65] mt-0.5">
                Enter code dispatched to <strong className="text-[#111111]">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#D34848] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex items-center justify-center gap-1.5">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-10 h-11 text-center font-mono font-bold text-base bg-[#F7F7F3] border border-[#DFDFD7] rounded-lg focus:outline-none focus:border-[#F3C515] transition-colors"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full h-10 rounded-lg bg-[#111111] hover:bg-[#F3C515] hover:text-[#111111] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>VERIFY &amp; ENTER →</span>}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <span className="text-[11px] text-[#6C6C65]">
                    Resend code in <strong className="text-[#111111]">{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResendTimer(60)}
                    className="text-[11px] font-bold text-[#111111] hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
