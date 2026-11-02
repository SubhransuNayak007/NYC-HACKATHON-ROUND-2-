"use client";

import React from "react";
import Link from "next/link";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from "lucide-react";
import { MySamparkLogo } from "./MySamparkLogo";

export function MySamparkFooter() {
  return (
    <footer className="bg-[#F5F6F0] border-t border-black/5 pt-16 pb-24 sm:pb-20 text-xs font-sans text-[#161616]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Left Column: Brand & Info */}
          <div className="lg:col-span-5 space-y-6">
            <MySamparkLogo size="md" />

            <p className="text-slate-600 max-w-sm text-sm leading-relaxed font-normal">
              We turn Instagram, WhatsApp, Telegram, LinkedIn, and Facebook comments into paying customers — answering from your own live catalog around the clock.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow QuickReply on Instagram"
                className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-slate-700 hover:bg-[#EE7D60] hover:text-white transition-colors shadow-xs"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow QuickReply on Facebook"
                className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-slate-700 hover:bg-[#EE7D60] hover:text-white transition-colors shadow-xs"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow QuickReply on LinkedIn"
                className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-slate-700 hover:bg-[#EE7D60] hover:text-white transition-colors shadow-xs"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow QuickReply on X"
                className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-slate-700 hover:bg-[#EE7D60] hover:text-white transition-colors shadow-xs"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>

            <div className="pt-4 space-y-1 text-slate-500">
              <div className="font-bold text-[#161616] text-xs uppercase tracking-wider">CONTACT INFO</div>
              <div>support@quickreply.io</div>
              <div className="text-[11px] pt-1 text-slate-400">Autonomous AI Operating System</div>
            </div>
          </div>

          {/* Center Column: Features & Integrations */}
          <div className="lg:col-span-3 space-y-4">
            <div className="font-bold text-[#161616] uppercase tracking-wider text-[11px]">
              EXPLORE FEATURES
            </div>
            <ul className="space-y-2.5 text-slate-600">
              <li>
                <Link href="/#comment-to-dm" className="hover:text-[#EE7D60] transition-colors">
                  Comment to DM Automation
                </Link>
              </li>
              <li>
                <Link href="/#knowledge-base" className="hover:text-[#EE7D60] transition-colors">
                  Product Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="/#unified-inbox" className="hover:text-[#EE7D60] transition-colors">
                  Unified Multi-Channel Inbox
                </Link>
              </li>
              <li>
                <Link href="/#analytics" className="hover:text-[#EE7D60] transition-colors">
                  Analytics &amp; ROI Reports
                </Link>
              </li>
              <li>
                <Link href="/#partner-engine" className="hover:text-[#EE7D60] transition-colors">
                  Partner &amp; Affiliate Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Column: Platform Links */}
          <div className="lg:col-span-4 space-y-4">
            <div className="font-bold text-[#161616] uppercase tracking-wider text-[11px]">
              QUICK ACCESS
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <Link href="/pricing" className="p-2.5 rounded-xl bg-white/60 hover:bg-white transition-all text-center border border-black/5">
                Pricing
              </Link>
              <Link href="/faq" className="p-2.5 rounded-xl bg-white/60 hover:bg-white transition-all text-center border border-black/5">
                FAQs
              </Link>
              <Link href="/login" className="p-2.5 rounded-xl bg-white/60 hover:bg-white transition-all text-center border border-black/5">
                Log In
              </Link>
              <Link href="/register" className="p-2.5 rounded-xl bg-[#EE7D60] text-white hover:bg-[#E06C4F] transition-all text-center font-bold">
                Start Free
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-xs gap-4">
          <div>&copy; 2026 QuickReply. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#161616] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#161616] transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const QuickReplyFooter = MySamparkFooter;
export default MySamparkFooter;
