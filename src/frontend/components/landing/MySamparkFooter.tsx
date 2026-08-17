"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Zap,
  ArrowRight,
  Sparkles,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { appleSpring, tactileButtonTap } from "@/frontend/lib/physicsMotion";

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PinterestIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

const PAGE_LINKS = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Integrations", href: "/integrations" },
  { name: "FAQs", href: "/faq" },
  { name: "Contact", href: "/contact" },
  { name: "Log In", href: "/login" },
  { name: "Dashboard", href: "/dashboard" },
];

export function MySamparkFooter() {
  return (
    <footer className="bg-[#161616] text-white rounded-t-[36px] sm:rounded-t-[48px] pt-16 sm:pt-20 pb-12 text-xs font-sans mt-8 shadow-2xl relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Row: Brand & Info + Pages Directory Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          {/* Left Column: Dark Logo, Description & Socials */}
          <div className="lg:col-span-5 space-y-6">
            <Link href="/" className="inline-flex items-center gap-2.5 group select-none">
              <div className="w-9 h-9 rounded-2xl bg-[#EE7D60] text-white flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-105">
                <Zap className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="font-black tracking-tight text-2xl sm:text-3xl text-white">
                Quick<span className="text-[#EE7D60]">Reply</span>
              </span>
            </Link>

            <p className="text-slate-400 max-w-sm text-xs sm:text-sm leading-relaxed font-normal">
              We turn Instagram, WhatsApp, Facebook, LinkedIn, X, and YouTube comments into paying customers — answering from your live catalog around the clock.
            </p>

            {/* Circular Social Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <XIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.linkedin.com/in/subhransu-nayak-4b33383a7/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
                className="w-9 h-9 rounded-full bg-white/10 text-slate-300 hover:bg-[#EE7D60] hover:text-white transition-all flex items-center justify-center shadow-xs"
              >
                <PinterestIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column: PAGES Directory Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-white text-xs uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-[#EE7D60]" />
                <span>PAGES</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Quick Directory</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PAGE_LINKS.map((page, idx) => (
                <Link
                  key={idx}
                  href={page.href}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white font-medium text-xs text-center transition-all shadow-xs hover:border-white/20"
                >
                  {page.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Full-Width High-Contrast Yellow "Start Free" CTA Pill */}
        <div className="my-8">
          <Link href="/register" className="block w-full">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={tactileButtonTap}
              transition={appleSpring}
              className="w-full h-14 rounded-full bg-[#FAEE6A] text-black font-black uppercase tracking-wider text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg hover:bg-[#F6E84E] transition-all cursor-pointer select-none"
            >
              <span>Start free</span>
              <div className="w-6 h-6 rounded-full bg-black text-[#FAEE6A] flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </motion.div>
          </Link>
        </div>

        {/* 3-Column Navigation Directory: CONTACT INFO, EXPLORE FEATURES, EXPLORE INTEGRATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-t border-white/10">
          {/* Column 1: CONTACT INFO */}
          <div className="space-y-3.5">
            <div className="font-extrabold text-white uppercase tracking-widest text-[11px] text-[#EE7D60]">
              CONTACT INFO
            </div>
            <ul className="space-y-2 text-slate-400 text-xs font-normal">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href="mailto:subhransu.nayak.418@gmail.com" className="hover:text-white transition-colors">
                  subhransu.nayak.418@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>+91 (800) 492-9921</span>
              </li>
              <li className="pt-2 text-[11px] text-slate-400 leading-relaxed">
                QuickReply Autonomous AI Operating System. <br />
                Global 24/7 Multi-Tenant Infrastructure.
              </li>
            </ul>
          </div>

          {/* Column 2: EXPLORE FEATURES */}
          <div className="space-y-3.5">
            <div className="font-extrabold text-white uppercase tracking-widest text-[11px] text-[#EE7D60]">
              EXPLORE FEATURES
            </div>
            <ul className="space-y-2 text-slate-400 text-xs font-normal">
              <li>
                <Link href="/features/auto-dm" className="hover:text-white transition-colors">
                  Instant Auto DM Automation
                </Link>
              </li>
              <li>
                <Link href="/features/campaigns" className="hover:text-white transition-colors">
                  Multichannel Broadcast Campaigns
                </Link>
              </li>
              <li>
                <Link href="/features/knowledge-base" className="hover:text-white transition-colors">
                  AI Product Knowledge Base (Catalog RAG)
                </Link>
              </li>
              <li>
                <Link href="/features/unified-inbox" className="hover:text-white transition-colors">
                  Unified Multi-Channel Inbox
                </Link>
              </li>
              <li>
                <Link href="/features/analytics" className="hover:text-white transition-colors">
                  Attributed Revenue &amp; ROI Analytics
                </Link>
              </li>
              <li>
                <Link href="/features/scheduler" className="hover:text-white transition-colors">
                  Visual Multi-Platform Scheduler
                </Link>
              </li>
              <li>
                <Link href="/features/chat-widget" className="hover:text-white transition-colors">
                  Embeddable Storefront Chat Widget
                </Link>
              </li>
              <li>
                <Link href="/features/partner-marketing" className="hover:text-white transition-colors">
                  Partner Marketing &amp; Leaderboards
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: EXPLORE INTEGRATIONS */}
          <div className="space-y-3.5">
            <div className="font-extrabold text-white uppercase tracking-widest text-[11px] text-[#EE7D60]">
              EXPLORE INTEGRATIONS
            </div>
            <ul className="space-y-2 text-slate-400 text-xs font-normal">
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  Instagram Comments &amp; Reels DMs
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  WhatsApp Business API
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  Facebook Pages &amp; Messenger
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  X (Twitter) Direct Messaging
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  LinkedIn Company Pages &amp; InMail
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  YouTube Video Comments &amp; Shorts
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  Pinterest Product Pins
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  Shopify, WooCommerce &amp; Custom API
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-xs gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>&copy; {new Date().getFullYear()} QuickReply Inc. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/about" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              Security &amp; Compliance
            </Link>
            <Link href="/dashboard/status" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Systems Normal</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
