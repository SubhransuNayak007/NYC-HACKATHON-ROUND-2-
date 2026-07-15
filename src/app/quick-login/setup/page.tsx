"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, Smartphone, RefreshCw, Shield, Eye, EyeOff, ArrowLeft, Zap } from "lucide-react";

const C = {
  charcoal: "#1A1A1A",
  offWhite: "#FAF8F5",
  cream: "#F5F0EB",
  mustard: "#E8B931",
  orange: "#FF6B35",
  olive: "#606C38",
  slate: "#4A4A4A",
  slateMuted: "#8A8A8A",
  warmGrey: "#E8E4DF",
  white: "#FFFFFF",
};

const F = {
  display: 'var(--font-display), "Space Grotesk", system-ui, sans-serif',
  body: 'var(--font-body), "DM Sans", system-ui, sans-serif',
  mono: 'var(--font-mono), "JetBrains Mono", monospace',
};

export default function QuickLoginSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "show" | "done">("loading");
  const [secretCode, setSecretCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSetup();
  }, []);

  const fetchSetup = async () => {
    try {
      // Check if already configured
      const statusRes = await fetch("/api/auth/quick-login/status");
      const status = await statusRes.json();

      if (status.configured && status.quickLoginEnabled) {
        setStep("done");
        return;
      }

      // Generate new setup
      const res = await fetch("/api/auth/quick-login/setup", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSecretCode(data.secretCode);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setTotpSecret(data.totpSecret);
        setStep("show");
      }
    } catch {
      setError("Failed to load quick login setup");
      setStep("show");
    }
  };

  const handleCopy = async () => {
    const fallbackCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = secretCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secretCode);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 500);
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: C.offWhite }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.mustard }} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ background: C.offWhite, color: C.charcoal }}>
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.mustard} 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.orange} 0%, transparent 70%)`, filter: "blur(60px)" }} />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-8 group"
          style={{ color: C.slateMuted }}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          skip to dashboard
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
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: F.display }}>quick login setup</h2>
            <p className="text-sm" style={{ color: C.slateMuted }}>set up passwordless login for faster access</p>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-xl mb-6" style={{ background: `${C.mustard}10`, border: `1px solid ${C.mustard}30` }}>
            <h4 className="text-xs font-bold mb-2" style={{ color: C.charcoal }}>why set up quick login?</h4>
            <ul className="text-[11px] space-y-1" style={{ color: C.slate }}>
              <li>• no need to sign in with google every time</li>
              <li>• use your secret code or google authenticator</li>
              <li>• faster access to your dashboard</li>
              <li>• works even when offline (totp codes)</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-xl p-3.5 text-xs font-medium mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
              {error}
            </div>
          )}

          {step === "done" ? (
            /* Done State */
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `${C.olive}20` }}>
                <Check className="w-8 h-8" style={{ color: C.olive }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: F.display, color: C.charcoal }}>quick login enabled!</h3>
              <p className="text-sm mb-6" style={{ color: C.slateMuted }}>you can now sign in using your secret code or google authenticator.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-3 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: C.charcoal, color: C.offWhite }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "go to dashboard"}
                </button>
                <button
                  onClick={() => { setStep("show"); fetchSetup(); }}
                  className="px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all"
                  style={{ background: C.cream, color: C.charcoal, border: `1px solid ${C.warmGrey}` }}
                >
                  <RefreshCw className="w-4 h-4" /> reset
                </button>
              </div>
            </div>
          ) : (
            /* Setup State */
            <div className="space-y-6">
              {/* Secret Code Section */}
              <div>
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: C.charcoal }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: C.mustard }} />
                  YOUR SECRET CODE
                </h4>
                <div className="p-4 rounded-xl" style={{ background: C.cream, border: `1px solid ${C.warmGrey}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase" style={{ color: C.slateMuted }}>keep this safe - shown only once</span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{ color: C.slateMuted }}
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 rounded-lg text-center" style={{ background: C.white, border: `1px solid ${C.warmGrey}` }}>
                      <span className={`text-2xl tracking-[0.3em] font-bold ${showSecret ? "" : "blur select-none"}`} style={{ fontFamily: F.mono, color: C.charcoal }}>
                        {secretCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-3 rounded-lg transition-colors"
                      style={{ background: C.mustard, color: C.charcoal }}
                      title="copy code"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Authenticator Section */}
              <div>
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: C.charcoal }}>
                  <Smartphone className="w-3.5 h-3.5" style={{ color: C.mustard }} />
                  GOOGLE AUTHENTICATOR
                </h4>
                <div className="p-4 rounded-xl text-center" style={{ background: C.cream, border: `1px solid ${C.warmGrey}` }}>
                  <p className="text-[11px] mb-4" style={{ color: C.slateMuted }}>scan this qr code with google authenticator</p>
                  {qrCodeDataUrl && (
                    <div className="inline-block p-2 rounded-lg" style={{ background: C.white, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                      <img src={qrCodeDataUrl} alt="QR Code for Google Authenticator" className="w-48 h-48" />
                    </div>
                  )}
                  <p className="text-[10px] mt-3 font-bold uppercase" style={{ color: C.slateMuted }}>or enter manually:</p>
                  <p className="text-xs mt-1 break-all" style={{ fontFamily: F.mono, color: C.slate }}>{totpSecret}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${C.warmGrey}` }}>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 px-5 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: C.cream, color: C.charcoal, border: `1px solid ${C.warmGrey}` }}
                >
                  skip for now
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: C.charcoal, color: C.offWhite }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "i've saved my code"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6 flex items-center justify-center gap-1.5" style={{ color: C.slateMuted }}>
          <Shield className="w-3 h-3" />
          SOC-2 Ready · GDPR & CCPA Compliant
        </p>
      </div>
    </div>
  );
}