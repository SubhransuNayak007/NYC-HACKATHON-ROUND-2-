"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, Smartphone, Lock, Shield, Zap, ChevronRight, Bot, ArrowLeft } from "lucide-react";

const C = {
  charcoal: "#1A1A1A",
  offWhite: "#FAF8F5",
  cream: "#F5F0EB",
  mustard: "#E8B931",
  orange: "#FF6B35",
  olive: "#606C38",
  slate: "#4A4A4A",
  slateMuted: "#8A8A8A",
  slateLight: "#B8B8B8",
  warmGrey: "#E8E4DF",
  white: "#FFFFFF",
};

const F = {
  display: 'var(--font-display), "Space Grotesk", system-ui, sans-serif',
  brand: 'var(--font-brand), "Outfit", system-ui, sans-serif',
  body: 'var(--font-body), "DM Sans", system-ui, sans-serif',
  mono: 'var(--font-mono), "JetBrains Mono", monospace',
  serif: 'var(--font-serif), "DM Serif Display", Georgia, serif',
};

function QuickLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [code, setCode] = useState("");
  const [useTotp, setUseTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/quick-login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = redirectTo;
      } else {
        setError(data.error || "Invalid code. Please try again.");
        setCode("");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ background: C.offWhite, color: C.charcoal }}>
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.mustard} 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.orange} 0%, transparent 70%)`, filter: "blur(60px)" }} />

      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-8 group"
          style={{ color: C.slateMuted }}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          back to login
        </button>

        {/* Auth Card */}
        <div
          className="rounded-3xl p-8 shadow-xl relative"
          style={{ background: C.white, border: `1px solid ${C.warmGrey}`, boxShadow: "0 20px 60px rgba(26,26,26,0.08)" }}
        >
          <div className="absolute top-0 left-8 right-8 h-[3px] rounded-b" style={{ background: `linear-gradient(90deg, ${C.mustard}, ${C.orange})` }} />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: C.charcoal }}>
              <Zap className="w-7 h-7" style={{ color: C.mustard }} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: F.display }}>quick login</h2>
            <p className="text-sm" style={{ color: C.slateMuted }}>enter your code to access the dashboard</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.warmGrey}` }}>
            <button
              onClick={() => { setUseTotp(false); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                !useTotp ? "text-white" : "hover:bg-gray-50"
              }`}
              style={!useTotp ? { background: C.charcoal, color: C.offWhite } : { color: C.slateMuted }}
            >
              <Lock className="w-3.5 h-3.5 inline mr-1.5" />
              Secret Code
            </button>
            <button
              onClick={() => { setUseTotp(true); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                useTotp ? "text-white" : "hover:bg-gray-50"
              }`}
              style={useTotp ? { background: C.charcoal, color: C.offWhite } : { color: C.slateMuted }}
            >
              <Smartphone className="w-3.5 h-3.5 inline mr-1.5" />
              Authenticator
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6 px-3 py-2 rounded-xl text-xs" style={{ background: C.cream, border: `1px solid ${C.warmGrey}`, color: C.slate }}>
            <Shield className="w-3.5 h-3.5" style={{ color: C.olive }} />
            <span>{useTotp ? "enter code from Google Authenticator" : "enter your 6-digit secret code"}</span>
          </div>

          {error && (
            <div className="rounded-xl p-3.5 text-xs font-medium mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: C.slateMuted }}>
                {useTotp ? "authenticator code" : "secret code"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.slateMuted }} />
                <input
                  type={showCode && !useTotp ? "text" : "password"}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={useTotp ? "000000" : "••••••"}
                  className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm outline-none transition-all text-center tracking-[0.3em] font-mono"
                  style={{ background: C.cream, border: `1px solid ${C.warmGrey}`, color: C.charcoal, fontFamily: F.mono, fontSize: "1.25rem" }}
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={loading}
                />
                {!useTotp && (
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: C.slateMuted }}
                  >
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group mt-2"
              style={{ background: C.charcoal, color: C.offWhite }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.mustard }} />
                  <span>verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" style={{ color: C.mustard }} />
                  <span>sign in</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform ml-auto" style={{ color: C.slateMuted }} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: C.slateMuted }}>
            don&apos;t have a quick login code?{" "}
            <a href="/login" className="font-bold hover:underline" style={{ color: C.charcoal }}>sign in with Google</a>
          </p>

          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${C.warmGrey}` }}>
            <div className="p-4 rounded-xl" style={{ background: C.cream, border: `1px solid ${C.warmGrey}` }}>
              <h4 className="text-xs font-bold mb-2" style={{ color: C.charcoal }}>how to set up quick login:</h4>
              <ol className="text-[11px] space-y-1" style={{ color: C.slate }}>
                <li>1. sign in with google first</li>
                <li>2. go to dashboard → settings → quick login</li>
                <li>3. scan qr code with google authenticator</li>
                <li>4. save your 6-digit secret code</li>
              </ol>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-6 flex items-center justify-center gap-1.5" style={{ color: C.slateMuted }}>
          <Lock className="w-3 h-3" />
          SOC-2 Ready · GDPR & CCPA Compliant
        </p>
      </div>
    </div>
  );
}

export default function QuickLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: C.offWhite }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.mustard }} />
      </div>
    }>
      <QuickLoginContent />
    </Suspense>
  );
}