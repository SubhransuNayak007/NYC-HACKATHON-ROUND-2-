"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { ThreeYetiMascot, MascotMode } from "@/frontend/components/auth/ThreeYetiMascot";

export function MySamparkRegister() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mascotMode, setMascotMode] = useState<MascotMode>("idle");

  // Dynamic password validation rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);

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

    if (!hasMinLength || !hasNumber || !hasUpperLower) {
      setError("Please ensure password satisfies all security requirements.");
      return;
    }

    setLoading(true);
    setMascotMode("submitting");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        setMascotMode("idle");
        return;
      }

      setMascotMode("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
      setMascotMode("idle");
    }
  };

  const handleGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-[#dcebf7] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      
      {/* ── Soft Ambient Clouds in Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute top-1/4 right-10 w-80 h-28 bg-white/70 rounded-full blur-2xl animate-pulse" />
      </div>

      {/* ── Top Left Back Arrow Button ── */}
      <div className="fixed top-6 left-6 z-50">
        <Link
          href="/"
          className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-center text-[#161616] hover:bg-white hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Main Split Floating Register Card ── */}
      <div className="relative z-10 w-full max-w-[1040px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.14)] border border-white/90 p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        
        {/* ── LEFT COLUMN: True 3D Physics Yeti Mascot (Seamless Full-Bleed) ── */}
        <div className="lg:col-span-6 w-full flex min-h-[460px] sm:min-h-[540px] lg:min-h-[620px]">
          <ThreeYetiMascot
            mode={mascotMode}
            charCount={name.length + email.length + password.length}
            typingProgress={Math.min(1, (name.length + email.length) / 32)}
          />
        </div>

        {/* ── RIGHT COLUMN: Registration Form ── */}
        <div className="lg:col-span-6 flex flex-col justify-center px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          


          {/* Heading & Subtitle */}
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
              CREATE AN ACCOUNT
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              Start with 100 free AI credits. No credit card required.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 ml-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setMascotMode("email_focused")}
                onBlur={() => setMascotMode("idle")}
                className="w-full h-11 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/30 focus:border-[#EE7D60] transition-all shadow-2xs"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 ml-1">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setMascotMode("email_focused")}
                onBlur={() => setMascotMode("idle")}
                className="w-full h-11 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/30 focus:border-[#EE7D60] transition-all shadow-2xs"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setMascotMode(showPassword ? "password_peeking" : "password_focused")}
                  onBlur={() => setMascotMode("idle")}
                  className="w-full h-11 pl-4 pr-11 rounded-2xl bg-slate-50 border-2 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/30 focus:border-[#EE7D60] transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password strength criteria */}
              {password.length > 0 && (
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600 font-semibold">
                  <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 font-bold" : ""}`}>
                    {hasMinLength ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 text-slate-300" />}
                    8+ chars
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 font-bold" : ""}`}>
                    {hasNumber ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 text-slate-300" />}
                    1 number
                  </span>
                  <span className={`flex items-center gap-1 ${hasUpperLower ? "text-emerald-600 font-bold" : ""}`}>
                    {hasUpperLower ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 text-slate-300" />}
                    Upper &amp; lower
                  </span>
                </div>
              )}
            </div>

            {/* Create Account Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#111827] text-white text-sm font-bold shadow-md hover:bg-black active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold text-slate-400">
              <span className="bg-white px-3">or</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-11 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-[#111827] text-xs font-bold shadow-2xs hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
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
            <span>Sign up with Google</span>
          </button>

          {/* Bottom Switcher */}
          <div className="text-center mt-5 text-xs text-slate-600">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="font-bold text-[#111827] underline underline-offset-4 hover:text-[#EE7D60] transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
