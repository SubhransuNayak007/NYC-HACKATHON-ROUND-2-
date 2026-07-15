"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Lock,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { ThreeYetiMascot, MascotMode } from "@/frontend/components/auth/ThreeYetiMascot";

export default function LoginPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mascotMode, setMascotMode] = useState<MascotMode>("idle");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleEmailFocus = () => {
    setMascotMode("email_focused");
  };

  const handleEmailBlur = () => {
    setMascotMode("idle");
  };

  const handlePasswordFocus = () => {
    setMascotMode(showPassword ? "password_peeking" : "password_focused");
  };

  const handlePasswordBlur = () => {
    setMascotMode("idle");
  };

  const handleTogglePassword = () => {
    const nextShow = !showPassword;
    setShowPassword(nextShow);
    if (mascotMode === "password_focused" || mascotMode === "password_peeking") {
      setMascotMode(nextShow ? "password_peeking" : "password_focused");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setMascotMode("submitting");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        setMascotMode("idle");
        return;
      }

      setMascotMode("success");
      setTimeout(() => {
        startTransition(() => {
          router.push("/dashboard");
        });
      }, 700);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
      setMascotMode("idle");
    }
  };

  const handleGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  // Calculate typing progress across field (0 to 1)
  const typingProgress = Math.min(1, email.length / 32);

  return (
    <div className="min-h-screen bg-[#dcebf7] flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      
      {/* ── Soft Ambient Clouds & Radial Glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute top-1/4 right-10 w-80 h-28 bg-white/70 rounded-full blur-2xl animate-pulse" />
      </div>

      {/* ── Top Left Back Arrow Button ── */}
      <div className="fixed top-5 left-5 sm:top-6 sm:left-6 z-50">
        <Link
          href="/"
          className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-center text-slate-800 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Main Split Floating Login Card ── */}
      <div className="relative z-10 w-full max-w-[1060px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.14)] border border-white/90 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        
        {/* ── LEFT COLUMN: True 3D Three.js Physics Yeti Mascot (Seamless Full-Bleed) ── */}
        <div className="lg:col-span-6 w-full flex min-h-[460px] sm:min-h-[540px] lg:min-h-[620px]">
          <ThreeYetiMascot
            mode={mascotMode}
            charCount={email.length + password.length}
            typingProgress={typingProgress}
          />
        </div>

        {/* ── RIGHT COLUMN: High-Contrast Modern Login Form ── */}
        <div className="lg:col-span-6 flex flex-col justify-center px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          
          {/* Top Brand Badge */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[#EE7D60]/10 border border-[#EE7D60]/25 flex items-center justify-center mb-2.5 shadow-2xs">
              <span className="w-4 h-4 rounded-full bg-[#EE7D60] animate-pulse" />
            </div>
            <span className="text-[11px] font-mono font-black tracking-widest text-slate-500 uppercase">
              QUICKREPLY.AI
            </span>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
              WELCOME BACK
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              Enter your email and password to access your autonomous console
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={handleEmailChange}
                onFocus={handleEmailFocus}
                onBlur={handleEmailBlur}
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/30 focus:border-[#EE7D60] transition-all shadow-2xs"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  className="w-full h-12 pl-4 pr-12 rounded-2xl bg-slate-50 border-2 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/30 focus:border-[#EE7D60] transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                  title={showPassword ? "Hide password" : "Peek password"}
                  aria-label={showPassword ? "Hide password" : "Peek password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-400 text-slate-900 focus:ring-[#EE7D60] accent-slate-900 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-slate-600 hover:text-slate-900 font-semibold transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#161616] hover:bg-black active:scale-[0.99] text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Signing in...</span>
                </>
              ) : mascotMode === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Welcome Back!</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold text-slate-400">
              <span className="bg-white px-3">or continue with</span>
            </div>
          </div>

          {/* Google Social Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-bold shadow-2xs hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.24 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.24 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Bottom Switcher */}
          <div className="text-center mt-6 text-xs text-slate-600">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="font-bold text-slate-900 underline underline-offset-4 hover:text-[#EE7D60] transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
