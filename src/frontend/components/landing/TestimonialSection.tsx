"use client";

import React from "react";
import { Quote } from "lucide-react";

export function TestimonialSection() {
  const testimonials = [
    {
      quote:
        "QuickReply transformed our WhatsApp sales. We receive over 1,500 product inquiries every weekend, and our response time dropped from 4 hours to 2 seconds. Our weekend conversion rate surged by 38%.",
      author: "Aditi Sharma",
      role: "Head of Growth",
      company: "Velour Apparel",
      location: "Bengaluru, India",
    },
    {
      quote:
        "The Neural RAG system is unmatched. It never invents incorrect discounts or promises out-of-stock sizes. Connecting our Baileys WhatsApp web session took under 2 minutes with zero API wait times.",
      author: "Rohan Varma",
      role: "Founder & CEO",
      company: "Kuro Electronics",
      location: "Mumbai, India",
    },
    {
      quote:
        "Our YouTube channel has 450k subscribers, and reply fatigue was burning our team out. QuickReply now answers comments in our exact brand voice within 3 seconds, driving massive affiliate conversions.",
      author: "Sneha Patel",
      role: "Creator & Operations Lead",
      company: "TechCraft Media",
      location: "Delhi NCR",
    },
  ];

  return (
    <section className="py-24 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/40 dark:bg-[#050810]/40">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block font-mono">
            SOCIAL PROOF
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white">
            Trusted by modern high-growth brands.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            See how forward-thinking commerce teams automate their customer workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="p-7 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] shadow-xs flex flex-col justify-between"
            >
              <div>
                <Quote className="w-6 h-6 text-amber-500/40 mb-4" />
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  &quot;{t.quote}&quot;
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-black/[0.05] dark:border-zinc-800">
                <div className="font-bold text-sm text-[#111827] dark:text-slate-100">
                  {t.author}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.role} · {t.company}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                  {t.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
