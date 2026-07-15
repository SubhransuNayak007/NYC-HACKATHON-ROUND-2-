"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import ThemeToggle from "@/frontend/components/ThemeToggle";

interface AuthShellProps {
  mode: "login" | "signup";
}

export function AuthShell({ mode }: AuthShellProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
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
        setError(data.error || (mode === "login" ? "Invalid email or password." : "Registration failed."));
        setLoading(false);
        return;
      }

      setSuccessMsg(mode === "login" ? "Signed in successfully! Redirecting..." : "Account created! Setting up workspace...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch {
      setError("Unable to connect to server. Please check your internet connection.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] dark:bg-[#0A0A0B] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="w-4 h-4 text-white dark:text-zinc-950 fill-current" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            {BRAND_CONFIG.name}
          </span>
        </Link>
        <ThemeToggle size="sm" />
      </div>

      {/* Centered Minimal Authentication Card (MySampark Style) */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs">
          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {mode === "login" ? "Welcome back" : "Create your workspace"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {mode === "login"
                ? "Sign in to access your autonomous AI operating system"
                : "Start automating your conversations in under 2 minutes"}
            </p>
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1-Tap Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors flex items-center justify-center gap-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-zinc-900 text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
              or with email
            </span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Full Name / Workspace
                </label>
                <input
                  type="text"
                  required
                  placeholder="Arjun Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white focus:bg-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
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
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white focus:bg-white dark:focus:bg-zinc-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-zinc-950 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === "login" ? "Signing in..." : "Creating workspace..."}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500">
            {mode === "login" ? (
              <span>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-zinc-900 dark:text-white hover:underline"
                >
                  Create workspace
                </Link>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-zinc-900 dark:text-white hover:underline"
                >
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Legal Notice */}
      <div className="max-w-[1200px] w-full mx-auto text-center text-[11px] text-zinc-400">
        By signing in, you agree to QuickReply&apos;s{" "}
        <Link href="/about" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/about" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
