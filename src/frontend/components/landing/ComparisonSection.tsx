"use client";

import React from "react";
import { Check, X, Minus } from "lucide-react";

export function ComparisonSection() {
  const comparisonRows = [
    {
      feature: "Instant < 3s AI Replies 24/7",
      quickreply: "Yes (Anthropic Claude 3.5)",
      legacy: "Rule-based tree only",
      manual: "Hours of waiting",
    },
    {
      feature: "WhatsApp Web (Baileys) + Cloud API",
      quickreply: "Both Supported (Zero Ban Risk)",
      legacy: "Cloud API Only (Expensive)",
      manual: "Physical Phone Typing",
    },
    {
      feature: "Neural RAG on Exact Store Inventory & Policies",
      quickreply: "Yes (Deterministic Facts)",
      legacy: "No (Generic Hallucinations)",
      manual: "Manual Catalog Check",
    },
    {
      feature: "Action Firewall & 2-Way WhatsApp Approval",
      quickreply: "Yes (Owner Phone 2-Way)",
      legacy: "No Guardrails",
      manual: "Internal Slack Tickets",
    },
    {
      feature: "Unified Inbox (WhatsApp, Instagram, YouTube)",
      quickreply: "Yes (Single Brain)",
      legacy: "Separate Disjointed Tools",
      manual: "8-10 Separate Browser Tabs",
    },
    {
      feature: "Operating Cost for 20,000 Inquiries/mo",
      quickreply: "Fixed SaaS (Predictable)",
      legacy: "Per-message markup surge",
      manual: "₹1,50,000+ support payroll",
    },
  ];

  return (
    <section className="py-24 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/40 dark:bg-[#050810]/40">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block font-mono">
            THE STRATEGIC ADVANTAGE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white">
            Why modern brands switch to QuickReply.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            A purpose-built autonomous operating system, not a robotic button-tree chatbot.
          </p>
        </div>

        {/* Minimalist Comparison Table */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/70 dark:bg-[#161B22]/70">
                <th className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300 w-[38%]">
                  Capability
                </th>
                <th className="py-4 px-5 font-bold text-[#111827] dark:text-white bg-amber-500/10 dark:bg-amber-400/10 w-[26%]">
                  QuickReply OS
                </th>
                <th className="py-4 px-5 font-medium text-slate-500 dark:text-slate-400 w-[18%]">
                  Legacy Chatbots
                </th>
                <th className="py-4 px-5 font-medium text-slate-500 dark:text-slate-400 w-[18%]">
                  Manual Team
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] dark:divide-zinc-800/60">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="hover:bg-[#FAF8F5]/80 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-5 font-semibold text-[#111827] dark:text-slate-100">
                    {row.feature}
                  </td>
                  <td className="py-4 px-5 font-semibold text-emerald-800 dark:text-emerald-300 bg-amber-500/5 dark:bg-amber-400/5">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{row.quickreply}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{row.legacy}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{row.manual}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
