/**
 * ============================================================
 *  QuickReply Brand Configuration & Tokens
 *  src/lib/brand.config.ts
 *
 *  Single source of truth for QuickReply brand identity,
 *  editorial styling, platform integrations, and navigation.
 *  Unified with the Dashboard's Warm White / Light Gemini AI Aesthetic.
 * ============================================================
 */

export const BRAND_CONFIG = {
  name: "QuickReply",
  legalName: "QuickReply Technologies, Inc.",
  tagline: "The Autonomous AI Operating System for Modern Commerce",
  description:
    "Turn customer inquiries, social comments, and WhatsApp chats across YouTube, Instagram, and WhatsApp into closed sales, instant support, and delighted customers on autopilot.",
  foundingYear: 2026,
  supportEmail: "subhransu.nayak.418@gmail.com",
  salesEmail: "subhransu.nayak.418@gmail.com",
  url: "https://quickreply.ai",
  appUrl: "https://app.quickreply.ai",

  colors: {
    primary: "#111827",       // Deep charcoal ink
    accent: "#E8B931",        // Gemini warm gold/amber
    accentHover: "#D4A52A",
    geminiBlue: "#4285F4",    // Gemini spark blue
    geminiPurple: "#8B5CF6",  // Gemini spark purple
    background: "#FAF8F5",    // Warm off-white ivory canvas (identical to dashboard --bg-primary)
    surface: "#FFFFFF",       // Crisp white card surfaces (--bg-secondary)
    surfaceAlt: "#F4F2EE",    // Soft warm secondary surface (--bg-tertiary)
    border: "rgba(0, 0, 0, 0.08)",
    borderHover: "rgba(0, 0, 0, 0.16)",
    textPrimary: "#111827",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
  },

  typography: {
    hero: "font-semibold tracking-[-0.035em] leading-[1.08]",
    headline: "font-semibold tracking-[-0.025em] leading-[1.15]",
    subheadline: "font-normal leading-relaxed text-slate-600 dark:text-slate-400",
    label: "font-medium text-xs tracking-wider uppercase",
  },

  navigation: [
    { label: "Product", href: "#features" },
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#integrations" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
  ],

  footerNav: {
    product: [
      { label: "Autonomous Inbox", href: "#features" },
      { label: "WhatsApp Agent", href: "#features" },
      { label: "Social Auto-Responder", href: "#features" },
      { label: "Neural RAG Knowledge", href: "#features" },
      { label: "Action Firewall", href: "#features" },
      { label: "Lead Scoring CRM", href: "#features" },
    ],
    channels: [
      { label: "WhatsApp Business", href: "#integrations" },
      { label: "Instagram DMs & Comments", href: "#integrations" },
      { label: "YouTube Comments", href: "#integrations" },
      { label: "LinkedIn Company Inbox", href: "#integrations" },
      { label: "Facebook Messenger", href: "#integrations" },
      { label: "Telegram Communities", href: "#integrations" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      { label: "Security & Privacy", href: "/about" },
      { label: "Terms of Service", href: "/about" },
      { label: "Contact Support", href: "mailto:subhransu.nayak.418@gmail.com" },
    ],
  },

  platforms: [
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      badge: "Baileys + Meta API",
      desc: "Instant 1-scan QR device pairing or official Meta Cloud API. Zero ban-risk architecture.",
    },
    {
      id: "instagram",
      name: "Instagram DMs & Comments",
      badge: "Graph API v21",
      desc: "Auto-reply to story mentions, reels comments, and direct inquiries within 2 seconds.",
    },
    {
      id: "youtube",
      name: "YouTube Comments",
      badge: "Data API v3",
      desc: "Continuous 24/7 video monitoring. AI replies to subscriber questions in your brand voice.",
    },
    {
      id: "linkedin",
      name: "LinkedIn Lead Generation",
      badge: "Company Inbox",
      desc: "Turn B2B post interactions and messages into qualified sales pipeline.",
    },
    {
      id: "facebook",
      name: "Facebook Messenger",
      badge: "Page Messaging",
      desc: "Engage post commenters and Click-to-WhatsApp ad leads instantaneously.",
    },
    {
      id: "telegram",
      name: "Telegram Bot & Communities",
      badge: "Bot API 7.0",
      desc: "Manage customer support groups and high-volume community channels.",
    },
    {
      id: "x",
      name: "X (Twitter) Mentions & DMs",
      badge: "API v2",
      desc: "Auto-respond to viral brand mentions and customer support tweets.",
    },
    {
      id: "google",
      name: "Google Business Messages",
      badge: "Business Profile",
      desc: "Answer local store inquiries, hours, and catalog requests directly from Google Search.",
    },
  ],
};
