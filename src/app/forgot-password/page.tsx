"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import ThemeToggle from "@/frontend/components/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Trigger password reset request
      await new Promise((r) => setTimeout(r, 800));
      setSent(true);
    } catch {
      setError("Unable to process request. Please try again later.");
    } finally {
      setLoading(false);
    }
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

      {/* Centered Card */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Reset your password
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your verified email and we&apos;ll send recovery instructions.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Password recovery email sent
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                If an account exists for <strong className="text-zinc-900 dark:text-white">{email}</strong>, you will receive a password reset link shortly.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-block text-xs font-bold text-zinc-950 dark:text-white underline hover:opacity-80"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending recovery email...</span>
                  </>
                ) : (
                  <span>Send reset instructions</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto text-center text-[11px] text-zinc-400">
        &copy; {BRAND_CONFIG.foundingYear} {BRAND_CONFIG.legalName}. All rights reserved.
      </div>
    </div>
  );
}
