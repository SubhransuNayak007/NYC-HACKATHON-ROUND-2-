"use client";

import React from "react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import {
  MessageSquare,
  Instagram,
  Youtube,
  Linkedin,
  Facebook,
  Send,
  Twitter,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export function IntegrationRail() {
  const getIcon = (id: string) => {
    switch (id) {
      case "whatsapp":
        return <MessageSquare className="w-5 h-5 text-emerald-500" />;
      case "instagram":
        return <Instagram className="w-5 h-5 text-rose-500" />;
      case "youtube":
        return <Youtube className="w-5 h-5 text-red-500" />;
      case "linkedin":
        return <Linkedin className="w-5 h-5 text-sky-600" />;
      case "facebook":
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case "telegram":
        return <Send className="w-5 h-5 text-cyan-500" />;
      case "x":
        return <Twitter className="w-5 h-5 text-[#111827] dark:text-zinc-100" />;
      case "google":
        return <MapPin className="w-5 h-5 text-amber-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <section id="integrations" className="py-20 border-y border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/50 dark:bg-[#0D1117]/50">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block font-mono">
            OMNICHANNEL CONNECTIVITY
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111827] dark:text-[#F0F2F5]">
            Your customers are everywhere. <br className="hidden sm:inline" />
            So is QuickReply.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Connect all communication channels in seconds. One unified brain answers every message with zero latency.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BRAND_CONFIG.platforms.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:shadow-sm transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F2EE] dark:bg-zinc-800 flex items-center justify-center transition-transform group-hover:scale-105">
                    {getIcon(p.id)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-zinc-800 text-slate-600 dark:text-slate-400 font-medium border border-black/[0.05] dark:border-white/[0.06]">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#F0F2F5] mb-1">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Live Sync
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono">2-way</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
