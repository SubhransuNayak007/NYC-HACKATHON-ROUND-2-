"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { EnterpriseAuthLayout } from "./EnterpriseAuthLayout";

export function EnterpriseForgotPasswordForm() {
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
      // Simulate API call
      await new Promise((r) => setTimeout(r, 750));
      setSent(true);
    } catch {
      setError("Unable to process request. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <EnterpriseAuthLayout
      headerRight={
        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors font-medium text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Icon Badge + Headings */}
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

        {/* Inline Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {sent ? (
          <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-center space-y-3 animate-fadeIn">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-950">
              Recovery link dispatched
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              If an account exists for <strong className="text-slate-900">{email}</strong>, you will receive password reset instructions shortly.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block text-xs font-bold text-slate-900 underline hover:text-black transition-colors"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send reset link</span>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-400">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-slate-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </EnterpriseAuthLayout>
  );
}
