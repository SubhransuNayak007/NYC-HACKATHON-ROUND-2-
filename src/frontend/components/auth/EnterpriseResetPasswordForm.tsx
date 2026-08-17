"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { EnterpriseAuthLayout } from "./EnterpriseAuthLayout";

export function EnterpriseResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasMatch = password && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLength || !hasNumber) {
      setError("Please ensure password satisfies all security requirements.");
      return;
    }
    if (!hasMatch) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 700));
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Unable to update password. Link may have expired.");
      setLoading(false);
    }
  };

  return (
    <EnterpriseAuthLayout
      headerRight={
        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            Cancel
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Icon Badge + Headings */}
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

        {/* Inline Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-950">
              Password updated successfully!
            </div>
            <p className="text-xs text-emerald-800">
              Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Confirm Password */}
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

            {/* Password Criteria indicators */}
            <div className="space-y-1.5 pt-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasLength ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasNumber ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span>At least one number (0-9)</span>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasMatch ? "bg-emerald-500" : "bg-red-400"
                    }`}
                  />
                  <span>{hasMatch ? "Passwords match" : "Passwords do not match"}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer mt-2"
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
      </div>
    </EnterpriseAuthLayout>
  );
}
