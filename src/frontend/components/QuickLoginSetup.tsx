"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Copy, Check, Smartphone, RefreshCw, Shield, Eye, EyeOff } from "lucide-react";

const C = {
  charcoal: "#1A1A1A",
  offWhite: "#FAF8F5",
  cream: "#F5F0EB",
  mustard: "#E8B931",
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

interface QuickLoginSetupProps {
  onComplete?: () => void;
}

export default function QuickLoginSetup({ onComplete }: QuickLoginSetupProps) {
  const [step, setStep] = useState<"loading" | "show">("loading");
  const [secretCode, setSecretCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSetup();
  }, []);

  const fetchSetup = async () => {
    try {
      // Always call setup — if already configured, it returns existing data
      const res = await fetch("/api/auth/quick-login/setup", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSecretCode(data.secretCode);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setTotpSecret(data.totpSecret);
        setStep("show");
      } else {
        setError(data.error || "Failed to load quick login setup");
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

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.mustard }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl text-xs font-medium" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
          {error}
        </div>
      )}

      {/* Secret Code Section */}
      <div>
        <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-ink-800">
          <Shield className="w-3.5 h-3.5" style={{ color: C.mustard }} />
          YOUR SECRET CODE
          {secretCode === "••••••" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${C.olive}20`, color: C.olive }}>
              Already Set
            </span>
          )}
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
              <span className={`text-xl tracking-[0.3em] font-bold ${showSecret ? "" : "blur select-none"}`} style={{ fontFamily: F.mono, color: C.charcoal }}>
                {secretCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-lg transition-colors"
              style={{ background: C.mustard, color: C.charcoal }}
              title="copy code"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Google Authenticator Section */}
      <div>
        <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-ink-800">
          <Smartphone className="w-3.5 h-3.5" style={{ color: C.mustard }} />
          GOOGLE AUTHENTICATOR
        </h4>
        <div className="p-4 rounded-xl text-center" style={{ background: C.cream, border: `1px solid ${C.warmGrey}` }}>
          <p className="text-[11px] mb-3" style={{ color: C.slateMuted }}>scan this qr code with google authenticator</p>
          {qrCodeDataUrl && (
            <div className="inline-block p-2 rounded-lg" style={{ background: C.white, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
              <img src={qrCodeDataUrl} alt="QR Code for Google Authenticator" className="w-40 h-40" />
            </div>
          )}
          <p className="text-[10px] mt-2 font-bold uppercase" style={{ color: C.slateMuted }}>or enter manually:</p>
          <p className="text-[11px] mt-1 break-all" style={{ fontFamily: F.mono, color: C.slate }}>{totpSecret}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3" style={{ borderTop: `1px solid ${C.warmGrey}` }}>
        <button
          onClick={() => onComplete?.()}
          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
          style={{ background: C.cream, color: C.charcoal, border: `1px solid ${C.warmGrey}` }}
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
}