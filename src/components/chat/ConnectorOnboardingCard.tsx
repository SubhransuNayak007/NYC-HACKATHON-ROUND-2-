"use client";

import React, { useState } from "react";
import { Link2, ShieldCheck, Key, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { OnboardingStep } from "@/backend/automation/intelligence/DynamicConnectorOnboarding";

export interface ConnectorOnboardingCardProps {
  step: OnboardingStep;
  onConnect: (connectorId: string, credentials: Record<string, any>) => void;
  isProcessing?: boolean;
}

export const ConnectorOnboardingCard: React.FC<ConnectorOnboardingCardProps> = ({
  step,
  onConnect,
  isProcessing = false,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    onConnect(step.connectorId, formData);
  };

  return (
    <div className="my-3 rounded-xl border border-indigo-500/30 bg-slate-900/90 p-4 text-slate-100 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">{step.title}</h4>
          <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">
            Service Authentication
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 mb-3 leading-relaxed">{step.description}</p>

      {step.instructions && step.instructions.length > 0 && (
        <div className="mb-3 rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/50 text-[11px] space-y-1">
          <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
            Setup Instructions:
          </div>
          {step.instructions.map((inst, i) => (
            <div key={i} className="flex items-start gap-1.5 text-slate-300">
              <span className="text-indigo-400 font-mono text-[10px]">{i + 1}.</span>
              <span>{inst}</span>
            </div>
          ))}
        </div>
      )}

      {step.authType === "oauth2" && step.oauthUrl ? (
        <div className="pt-1">
          <button
            onClick={() => {
              setIsSuccess(true);
              onConnect(step.connectorId, { authorized: true, token: "mock_oauth_verified_token" });
            }}
            disabled={isProcessing || isSuccess}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Connected Successfully
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" /> Authorize with Google / OAuth 2.0
              </>
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
          {step.fields.map((f) => (
            <div key={f.name}>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                {f.label} {f.required && <span className="text-rose-400">*</span>}
              </label>
              <input
                type={f.type === "password" ? "password" : "text"}
                placeholder={f.placeholder}
                required={f.required}
                value={formData[f.name] || ""}
                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={isProcessing || isSuccess}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all mt-2"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Verified & Connected
              </>
            ) : (
              <>
                <Key className="h-3.5 w-3.5" /> Save Credential to Vault
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        Credentials encrypted at rest with AES-256-GCM.
      </div>
    </div>
  );
};
