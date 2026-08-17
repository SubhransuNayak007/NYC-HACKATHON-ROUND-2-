"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { EnterpriseAuthLayout } from "./EnterpriseAuthLayout";

export function EnterpriseVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "user@example.com";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendSent, setResendSent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    pasteData.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call verification API or simulate success for development
      await new Promise((r) => setTimeout(r, 600));
      router.push("/onboarding");
    } catch {
      setError("Invalid verification code. Please check and try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendSent(true);
    setResendCooldown(60);
    setTimeout(() => setResendSent(false), 4000);
  };

  return (
    <EnterpriseAuthLayout
      headerRight={
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Check your</span>
          <span className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold bg-slate-50">
            Inbox
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Icon Badge + Headings */}
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
              <span className="font-semibold text-slate-700">{email}</span>
            </p>
          </div>
        </div>

        {/* Inline Feedback Notices */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {resendSent && (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-xs text-emerald-700 flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>A fresh verification code has been dispatched!</span>
          </div>
        )}

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 6 Clean Rounded OTP Input Boxes (Dribbble Reference Match) */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-11 sm:w-12 h-12 sm:h-13 text-center text-lg font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs transition-all"
              />
            ))}
          </div>

          {/* Primary CTA: Continue */}
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

          {/* Resend email control */}
          <div className="text-center">
            {resendCooldown > 0 ? (
              <span className="text-[11px] text-slate-400">
                Resend code in <strong className="text-slate-600">{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                Resend email
              </button>
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-200/70" />
          <span className="absolute px-3 bg-white text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Or
          </span>
        </div>

        {/* Secondary Action: Continue with password (Dribbble Match) */}
        <Link
          href="/login"
          className="w-full h-11 px-4 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200/60 transition-all"
        >
          Continue with password
        </Link>

        {/* Footer Legal Links */}
        <p className="text-[11px] text-center text-slate-400 space-x-2">
          <Link href="/terms" className="hover:text-slate-600 underline">
            Terms of Use
          </Link>
          <span>&bull;</span>
          <Link href="/privacy" className="hover:text-slate-600 underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </EnterpriseAuthLayout>
  );
}
