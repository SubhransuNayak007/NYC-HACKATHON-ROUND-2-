"use client";

import React, { useState } from "react";
import { QrCode, BookOpen, Shield, Zap, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      num: "01",
      title: "Connect Your Channels",
      desc: "Scan a QR code to link your WhatsApp Business number, or connect your Instagram and YouTube accounts in 1-click.",
      icon: <QrCode className="w-5 h-5" />,
      detail: "Zero API approvals required for WhatsApp Web session. Immediate live synchronization.",
    },
    {
      num: "02",
      title: "Teach the AI Your Business",
      desc: "Upload product catalogs, PDFs, FAQs, or past conversation transcripts. The Neural RAG index builds instantly.",
      icon: <BookOpen className="w-5 h-5" />,
      detail: "Deterministic knowledge grounding guarantees zero made-up prices or false promises.",
    },
    {
      num: "03",
      title: "Set Autonomous Guardrails",
      desc: "Configure confidence gates and two-way WhatsApp owner approvals for refunds or sensitive customer actions.",
      icon: <Shield className="w-5 h-5" />,
      detail: "Action Firewall enforces prompt injection defense and security boundaries.",
    },
    {
      num: "04",
      title: "Turn System on Autopilot",
      desc: "Watch the autonomous AI engine reply in < 3 seconds, qualify high-intent buyers, and update your CRM 24/7.",
      icon: <Zap className="w-5 h-5" />,
      detail: "Your team only steps in when human escalation is explicitly needed.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#FAF8F5] dark:bg-[#050810]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block font-mono">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white">
            Up and running in 4 simple steps.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            No complex coding, no engineering tickets. Deploy an enterprise-grade conversation AI in minutes.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              onClick={() => setActiveStep(idx)}
              className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                activeStep === idx
                  ? "border-[#111827] dark:border-white bg-white dark:bg-zinc-900 shadow-md scale-[1.02]"
                  : "border-black/[0.07] dark:border-white/[0.08] bg-white/80 dark:bg-zinc-900 hover:border-black/[0.14] dark:hover:border-zinc-700 shadow-2xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-mono font-bold text-slate-400 dark:text-slate-500">
                    {s.num}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#F4F2EE] dark:bg-zinc-800 flex items-center justify-center text-[#111827] dark:text-zinc-100">
                    {s.icon}
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#111827] dark:text-slate-100 mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-black/[0.05] dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{s.detail}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#111827] text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 transition-colors shadow-xs group"
          >
            <span>Start Free Onboarding</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
