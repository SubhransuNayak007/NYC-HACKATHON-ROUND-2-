"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";

export function Footer() {
  return (
    <footer className="bg-[#FAF8F5] dark:bg-[#050810] border-t border-black/[0.06] dark:border-white/[0.08] pt-16 pb-12 text-xs">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-zinc-950 fill-current" />
              </div>
              <span className="font-bold text-base tracking-tight text-[#111827] dark:text-[#F0F2F5]">
                {BRAND_CONFIG.name}
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              {BRAND_CONFIG.description}
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational (99.98% SLA)</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <div className="font-bold text-[#111827] dark:text-white uppercase tracking-wider text-[11px] font-mono">
              Product
            </div>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              {BRAND_CONFIG.footerNav.product.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-[#111827] dark:hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Channels Column */}
          <div className="space-y-3">
            <div className="font-bold text-[#111827] dark:text-white uppercase tracking-wider text-[11px] font-mono">
              Channels
            </div>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              {BRAND_CONFIG.footerNav.channels.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-[#111827] dark:hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="space-y-3">
            <div className="font-bold text-[#111827] dark:text-white uppercase tracking-wider text-[11px] font-mono">
              Company
            </div>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              {BRAND_CONFIG.footerNav.company.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-[#111827] dark:hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-400 text-[11px]">
          <div>
            &copy; {BRAND_CONFIG.foundingYear} {BRAND_CONFIG.legalName}. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-white transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
