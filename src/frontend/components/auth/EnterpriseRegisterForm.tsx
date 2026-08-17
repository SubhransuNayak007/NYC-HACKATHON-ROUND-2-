"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { EnterpriseAuthLayout } from "./EnterpriseAuthLayout";

export function EnterpriseRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
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

      // Success -> Redirect to Verify Email or Dashboard
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Unable to connect to server. Please check your internet connection.");
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  const handleAppleAuth = () => {
    setError("Apple authentication will be available in the next release. Please use Google or Email.");
  };

  return (
    <EnterpriseAuthLayout
      headerRight={
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Already have an account?</span>
          <Link
            href="/login"
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Login
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Avatar Badge + Headings */}
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

        {/* Inline Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Social Authentication Buttons */}
        <div className="space-y-2">
          {/* Google Auth Button (Official Google 'G' Logo) */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all"
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
            <span>Sign up with Google</span>
          </button>

          {/* Apple Auth Button */}
          <button
            type="button"
            onClick={handleAppleAuth}
            className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-200/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
            </svg>
            <span>Sign up with Apple</span>
          </button>
        </div>

        {/* Subtle 'Or' Divider (Dribbble Match) */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-200/70" />
          <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Or
          </span>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <input
              type="text"
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Email Address */}
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

          {/* Create Password */}
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
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary CTA: Sign up with Email */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
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

        {/* Terms Disclaimer */}
        <p className="text-[11px] text-center text-slate-400 leading-normal">
          By continuing, you acknowledge QuickReply{" "}
          <Link href="/terms" className="underline hover:text-slate-600">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </EnterpriseAuthLayout>
  );
}
