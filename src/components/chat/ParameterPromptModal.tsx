"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  KeyRound,
  FileQuestion,
  Check,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export interface MissingRequirement {
  type: "PARAMETER" | "CREDENTIAL";
  appId: string;
  parameterName?: string;
  question: string;
  suggestionChips: string[];
}

export interface ParameterPromptModalProps {
  isOpen: boolean;
  missingRequirements: MissingRequirement[];
  onSubmit: (answers: Record<string, any>) => void;
  onClose: () => void;
}

export const ParameterPromptModal: React.FC<ParameterPromptModalProps> = ({
  isOpen,
  missingRequirements,
  onSubmit,
  onClose,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (!isOpen || missingRequirements.length === 0) return null;

  const handleSelectChip = (key: string, chipValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: chipValue,
    }));
  };

  const handleInputChange = (key: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
                Required Parameters & Credentials
              </h3>
              <p className="text-[11px] text-zinc-400">
                Provide configuration to complete automated graph compilation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {missingRequirements.map((req, idx) => {
            const fieldKey = req.parameterName || `${req.appId}_credential`;
            const currentValue = answers[fieldKey] || "";

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3"
              >
                <div className="flex items-center gap-2">
                  {req.type === "CREDENTIAL" ? (
                    <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      <FileQuestion className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-400">
                      {req.appId} · {req.type}
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">{req.question}</h4>
                  </div>
                </div>

                {/* Suggestion Chips */}
                {req.suggestionChips && req.suggestionChips.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-500">Quick Selection:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {req.suggestionChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleSelectChip(fieldKey, chip)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                            currentValue === chip
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Text Input */}
                <input
                  type="text"
                  placeholder={`Enter ${req.parameterName || "credential or account name"}...`}
                  value={currentValue}
                  onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-orange-500 transition font-mono"
                />
              </div>
            );
          })}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-950/50 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Continue Automation Synthesis</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
