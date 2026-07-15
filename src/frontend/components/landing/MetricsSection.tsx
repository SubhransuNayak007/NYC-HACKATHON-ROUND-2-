"use client";

import React from "react";

export function MetricsSection() {
  const metrics = [
    {
      value: "< 2.5s",
      label: "Average AI Latency",
      desc: "Fastest response time in conversational commerce",
    },
    {
      value: "99.4%",
      label: "Intent Classification",
      desc: "Grounded neural classification across 19 categories",
    },
    {
      value: "88%",
      label: "Support Deflection",
      desc: "Customer inquiries resolved with zero human intervention",
    },
    {
      value: "0%",
      label: "Simulated Data",
      desc: "100% production-ready Baileys and Meta Graph integration",
    },
  ];

  return (
    <section className="py-20 bg-[#FAF8F5] dark:bg-[#050810] border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {metrics.map((m, i) => (
            <div key={i} className="text-center lg:text-left space-y-1.5">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#111827] dark:text-white font-mono">
                {m.value}
              </div>
              <div className="text-sm font-bold text-[#111827] dark:text-slate-100">
                {m.label}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
