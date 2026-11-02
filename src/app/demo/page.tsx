"use client";

/**
 * ============================================================================
 *  QuickReply — Full Interactive Demo Dashboard
 *  src/app/demo/page.tsx
 *
 *  Provides an exact 1:1 simulation of the QuickReply SaaS Dashboard:
 *   - 100% Light Enterprise SaaS Design Tokens
 *   - Fully Interactive Sidebar & Multi-Tab Navigation
 *   - Real-Time Omnichannel Simulation Engine (Instagram, WhatsApp, Telegram, LinkedIn)
 *   - Live AI Reasoning & 6-Stage Pipeline Visualizer
 *   - Dynamic KPI Counters, Golden Hour Gauge & Rule Testing
 *   - Seamless Conversion CTA to Sign Up / Get Started
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Send,
  Globe,
  Play,
  Sliders,
  Zap,
  Users,
  Bell,
  Brain,
  Bot,
  BarChart3,
  Settings,
  Search,
  Power,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Radio,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  ThumbsUp,
  Check,
  X,
  Building2,
  Smartphone,
  CreditCard,
  Loader2,
  TrendingUp,
  Activity,
  Filter,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  FileText,
  Lock,
} from "lucide-react";

// Mock Channel Types
interface MockChannel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  type: "instagram" | "whatsapp" | "telegram" | "linkedin" | "youtube";
  status: "active" | "standby";
}

interface MockMessage {
  id: string;
  channel: "instagram" | "whatsapp" | "telegram" | "linkedin" | "youtube";
  author: string;
  avatar: string;
  content: string;
  reply?: string;
  intent: string;
  confidence: number;
  latency: string;
  createdAt: string;
  status: "replied" | "processing" | "escalated";
}

interface MockRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  intent: string;
  status: "active" | "paused";
  hitCount: number;
}

const INITIAL_CHANNELS: MockChannel[] = [
  { id: "ch_1", name: "QuickReply Store", handle: "@quickreply_official", avatar: "🛍️", type: "instagram", status: "active" },
  { id: "ch_2", name: "VIP Concierge", handle: "+1 (555) 019-2834", avatar: "💬", type: "whatsapp", status: "active" },
  { id: "ch_3", name: "Enterprise Bot", handle: "@QuickReplyEnterpriseBot", avatar: "🤖", type: "telegram", status: "active" },
  { id: "ch_4", name: "Company Page", handle: "QuickReply AI Inc.", avatar: "🏢", type: "linkedin", status: "active" },
];

const INITIAL_MESSAGES: MockMessage[] = [
  {
    id: "msg_1",
    channel: "instagram",
    author: "sarah_miller",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    content: "Do you offer free shipping to California for orders over $50?",
    reply: "Yes Sarah! All orders over $50 ship free within 2-3 business days across the US. 📦",
    intent: "SHIPPING_QUERY",
    confidence: 99.2,
    latency: "0.32s",
    createdAt: "2 mins ago",
    status: "replied",
  },
  {
    id: "msg_2",
    channel: "whatsapp",
    author: "David Chen",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    content: "Can we schedule a 15-minute demo with your solutions team tomorrow afternoon?",
    reply: "Hi David! I've reserved 3:00 PM EST for you. Here is your direct calendar invite link: quickreply.ai/book/david",
    intent: "BOOKING_REQUEST",
    confidence: 98.7,
    latency: "0.28s",
    createdAt: "5 mins ago",
    status: "replied",
  },
  {
    id: "msg_3",
    channel: "telegram",
    author: "Alexei Volkov",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    content: "I want to purchase the Pro Annual tier with Telegram Stars.",
    reply: "Awesome Alexei! Invoice created for 1,200 Stars. Tap below to complete in 1-click inside Telegram.",
    intent: "PURCHASE_INTENT",
    confidence: 99.5,
    latency: "0.35s",
    createdAt: "12 mins ago",
    status: "replied",
  },
  {
    id: "msg_4",
    channel: "linkedin",
    author: "Marcus Vance",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    content: "What LLM foundation models and RAG architecture power your real-time response engine?",
    reply: "We leverage Gemini 1.5 Pro + LangChain RAG with sub-second hybrid BM25/Vector retrieval and zero data leakage.",
    intent: "TECH_STACK_INQUIRY",
    confidence: 97.8,
    latency: "0.41s",
    createdAt: "18 mins ago",
    status: "replied",
  },
];

const INITIAL_RULES: MockRule[] = [
  { id: "rule_1", name: "Pricing & Discount Inquiries", trigger: "Keyword: 'price', 'cost', 'plan'", action: "RAG Answer + Booking Link", intent: "PRICING", status: "active", hitCount: 1420 },
  { id: "rule_2", name: "Order & Shipping Tracking", trigger: "Keyword: 'tracking', 'shipping', 'where is'", action: "Dynamic Order Status Lookup", intent: "SHIPPING", status: "active", hitCount: 890 },
  { id: "rule_3", name: "VIP Lead Scoring", trigger: "Intent: High Commercial Interest", action: "Tag as HOT Lead + Notify Team", intent: "HOT_LEAD", status: "active", hitCount: 312 },
  { id: "rule_4", name: "Human Support Escalation", trigger: "Sentiment: Very Negative / Frustrated", action: "Pause AI + Alert Manager", intent: "ESCALATION", status: "active", hitCount: 45 },
];

export default function DemoDashboardPage() {
  // Navigation & UI States
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeChannelFilter, setActiveChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Simulation States
  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [rules, setRules] = useState<MockRule[]>(INITIAL_RULES);
  const [customInput, setCustomInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    totalProcessed: 348,
    deflectionRate: 98.4,
    avgLatency: "0.34s",
    hotLeads: 86,
    creditsUsed: 348,
    creditsMax: 500,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run Step-by-Step AI Simulation Pipeline
  const runSimulation = async (
    author: string,
    channel: "instagram" | "whatsapp" | "telegram" | "linkedin" | "youtube",
    content: string,
    reply: string,
    intent: string
  ) => {
    if (isSimulating) return;
    setIsSimulating(true);

    const newMsgId = `msg_${Date.now()}`;
    const pendingMsg: MockMessage = {
      id: newMsgId,
      channel,
      author,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      content,
      intent,
      confidence: 99.1,
      latency: "0.31s",
      createdAt: "Just now",
      status: "processing",
    };

    setMessages((prev) => [pendingMsg, ...prev]);

    // Step 1: Inbound Webhook Verified
    setActivePipelineStep(1);
    await new Promise((r) => setTimeout(r, 450));

    // Step 2: Intent Classification
    setActivePipelineStep(2);
    await new Promise((r) => setTimeout(r, 450));

    // Step 3: RAG Knowledge Retrieval
    setActivePipelineStep(3);
    await new Promise((r) => setTimeout(r, 450));

    // Step 4: Safety & Prompt Injection Check
    setActivePipelineStep(4);
    await new Promise((r) => setTimeout(r, 400));

    // Step 5: AI Generation
    setActivePipelineStep(5);
    await new Promise((r) => setTimeout(r, 500));

    // Step 6: Dispatch & Delivered
    setActivePipelineStep(6);
    await new Promise((r) => setTimeout(r, 400));

    setMessages((prev) =>
      prev.map((m) => (m.id === newMsgId ? { ...m, reply, status: "replied" } : m))
    );

    setStats((prev) => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      creditsUsed: Math.min(prev.creditsMax, prev.creditsUsed + 1),
      hotLeads: intent.includes("BOOKING") || intent.includes("PURCHASE") ? prev.hotLeads + 1 : prev.hotLeads,
    }));

    setIsSimulating(false);
    setActivePipelineStep(null);
    showToast(`AI replied to ${author} via ${channel.toUpperCase()} in 0.31s!`);
  };

  const handleCustomSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const text = customInput.trim();
    setCustomInput("");

    let reply = "Thank you for reaching out! Our team is available 24/7 to assist with your request.";
    let intent = "GENERAL_INQUIRY";

    if (/price|cost|tier|pro/i.test(text)) {
      reply = "Our Starter plan starts at $29/mo with 500 AI replies, and Pro is $79/mo with unlimited channels.";
      intent = "PRICING_INQUIRY";
    } else if (/ship|deliver|track/i.test(text)) {
      reply = "We offer express 2-day delivery with real-time tracking updates sent directly to your phone.";
      intent = "SHIPPING_INQUIRY";
    } else if (/demo|call|book|meet/i.test(text)) {
      reply = "I'd love to show you around! Pick any time on our calendar here: quickreply.ai/demo";
      intent = "DEMO_BOOKING";
    }

    runSimulation("Customer (You)", "instagram", text, reply, intent);
  };

  const filteredMessages = messages.filter((m) => {
    const matchesChannel = activeChannelFilter === "all" || m.channel === activeChannelFilter;
    const matchesSearch =
      !searchQuery ||
      m.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.intent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* ═══ TOP BANNER: INTERACTIVE LIVE DEMO NOTICE ═══ */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0 z-50 shadow-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold tracking-tight text-white truncate">
            ⚡ QuickReply Interactive Live Demo Mode
          </span>
          <span className="hidden md:inline text-slate-400 font-normal">
            — Experience genuine 24/7 AI multi-channel automation in real-time.
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/auth/register"
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/"
            className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Exit Demo
          </Link>
        </div>
      </div>

      {/* ═══ MAIN APP SHELL WITH SIDEBAR & TOPBAR ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── 1. SIDEBAR ── */}
        <aside
          className={`bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 z-40 shrink-0 ${
            sidebarCollapsed ? "w-[72px]" : "w-[260px]"
          }`}
        >
          {/* Workspace Switcher Header */}
          <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                Q
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">QuickReply Demo</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Enterprise Sandbox</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "feed", label: "Live Feed", icon: MessageSquare, badge: messages.length },
              { id: "instagram", label: "Instagram", icon: Sparkles },
              { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
              { id: "telegram", label: "Telegram", icon: Send },
              { id: "linkedin", label: "LinkedIn", icon: Building2 },
              { id: "platforms", label: "Platforms Hub", icon: Globe },
              { id: "rules", label: "Rule Builder", icon: Sliders, badge: rules.length },
              { id: "automations", label: "Automations", icon: Zap },
              { id: "faqs", label: "FAQ Knowledge", icon: Brain },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Profile Card Footer */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                S
              </div>
              {!sidebarCollapsed && (
                <div className="truncate text-left flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">Demo Visitor</div>
                  <div className="text-[10px] text-slate-400 truncate">visitor@quickreply.ai</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── 2. MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header Bar */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rules, contacts, messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Daily Quota Meter */}
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Replies Today</div>
                  <div className="text-xs font-black text-slate-900 font-mono">
                    {stats.creditsUsed} / {stats.creditsMax}
                  </div>
                </div>
                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(stats.creditsUsed / stats.creditsMax) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Live Channel</span>
              </Link>
            </div>
          </header>

          {/* Dynamic Content Pane */}
          <main className="p-6 md:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
            {/* ═══ INTERACTIVE SIMULATION CONTROL PANEL ═══ */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Real-Time AI Response Engine Simulator
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click any preset scenario below or type a custom inquiry to test the autonomous RAG pipeline.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                  24/7 AI Engine Online
                </span>
              </div>

              {/* Quick Scenario Triggers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() =>
                    runSimulation(
                      "emily_style",
                      "instagram",
                      "Do you have this jacket in size Medium and what is the return policy?",
                      "Hey Emily! Yes, Medium is in stock! We also offer 30-day hassle-free returns on all items. 🧥✨",
                      "PRODUCT_AVAILABILITY"
                    )
                  }
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left space-y-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-[#E1306C]">
                      <Sparkles className="w-3.5 h-3.5" /> Instagram Comment
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0.32s</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    &ldquo;Do you have this jacket in size Medium and what is the return policy?&rdquo;
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() =>
                    runSimulation(
                      "Dr. Robert Hayes",
                      "whatsapp",
                      "Can I schedule a quick product onboarding consultation for our team?",
                      "Hi Dr. Hayes! I've reserved our VIP demo slot for you tomorrow at 2:00 PM EST: quickreply.ai/book/robert",
                      "DEMO_BOOKING"
                    )
                  }
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left space-y-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp DM
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0.28s</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    &ldquo;Can I schedule a quick product onboarding consultation for our team?&rdquo;
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() =>
                    runSimulation(
                      "cryptodev_99",
                      "telegram",
                      "Can I purchase the Pro license directly using Telegram Stars?",
                      "Yes! Direct Telegram Star invoicing is active. Tap to confirm 1,200 Stars payment.",
                      "TELEGRAM_STARS_PURCHASE"
                    )
                  }
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left space-y-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-[#0088cc]">
                      <Send className="w-3.5 h-3.5" /> Telegram Star Buy
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0.35s</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    &ldquo;Can I purchase the Pro license directly using Telegram Stars?&rdquo;
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() =>
                    runSimulation(
                      "VP of Engineering",
                      "linkedin",
                      "What security certifications and multi-tenant guarantees do you provide?",
                      "We maintain strict SOC-2 Type II standards with AES-256-GCM token encryption and complete cross-tenant BOLA isolation.",
                      "SECURITY_COMPLIANCE"
                    )
                  }
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left space-y-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-[#0077b5]">
                      <Building2 className="w-3.5 h-3.5" /> LinkedIn Inquiry
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0.39s</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    &ldquo;What security certifications and multi-tenant guarantees do you provide?&rdquo;
                  </p>
                </button>
              </div>

              {/* Custom Input Form */}
              <form onSubmit={handleCustomSimulate} className="flex flex-col sm:flex-row gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Type any custom customer message to test the AI engine (e.g. 'What is your pricing?')..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  disabled={isSimulating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
                <button
                  type="submit"
                  disabled={isSimulating || !customInput.trim()}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSimulating ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Send className="w-4 h-4 text-amber-400" />}
                  <span>Simulate Custom Event</span>
                </button>
              </form>

              {/* Live 6-Stage Execution Visualizer */}
              <AnimatePresence>
                {isSimulating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" /> Autonomous Pipeline Execution Live
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">Stage {activePipelineStep} of 6</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-medium">
                      {[
                        { step: 1, label: "1. HMAC Webhook Ingest" },
                        { step: 2, label: "2. Intent Classification" },
                        { step: 3, label: "3. RAG Knowledge Match" },
                        { step: 4, label: "4. Prompt Safety Check" },
                        { step: 5, label: "5. AI Reply Synthesis" },
                        { step: 6, label: "6. Channel API Dispatch" },
                      ].map((s) => {
                        const isDone = (activePipelineStep || 0) >= s.step;
                        const isCurrent = activePipelineStep === s.step;
                        return (
                          <div
                            key={s.step}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              isCurrent
                                ? "bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-xs scale-105"
                                : isDone
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                                : "bg-slate-800/60 text-slate-500 border-slate-700"
                            }`}
                          >
                            {s.label}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ═══ TAB CONTENT: DASHBOARD OVERVIEW ═══ */}
            {activeNav === "dashboard" && (
              <div className="space-y-6">
                {/* 4 Primary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Comments / DMs Processed",
                      value: stats.totalProcessed,
                      desc: "100% 24/7 Autonomous Ingestion",
                      icon: MessageSquare,
                      color: "text-[#0088cc]",
                      bg: "bg-sky-50",
                    },
                    {
                      label: "AI Deflection & Accuracy",
                      value: `${stats.deflectionRate}%`,
                      desc: "Zero hallucination with verified RAG",
                      icon: Sparkles,
                      color: "text-emerald-600",
                      bg: "bg-emerald-50",
                    },
                    {
                      label: "Average Reply Latency",
                      value: stats.avgLatency,
                      desc: "Sub-second instant response",
                      icon: Clock,
                      color: "text-purple-600",
                      bg: "bg-purple-50",
                    },
                    {
                      label: "HOT CRM Leads Captured",
                      value: stats.hotLeads,
                      desc: "High commercial purchase intent",
                      icon: TrendingUp,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                    },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {card.label}
                          </span>
                          <div className={`h-8 w-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 font-mono">{card.value}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{card.desc}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Omnichannel Live Stream & Feed */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Omnichannel Activity Stream</h3>
                      <p className="text-xs text-slate-500">
                        Live message ingestion across all connected social and messaging lines.
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      {[
                        { id: "all", label: "All Channels" },
                        { id: "instagram", label: "Instagram" },
                        { id: "whatsapp", label: "WhatsApp" },
                        { id: "telegram", label: "Telegram" },
                        { id: "linkedin", label: "LinkedIn" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setActiveChannelFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            activeChannelFilter === f.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                    {filteredMessages.map((msg) => (
                      <div key={msg.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={msg.avatar}
                              alt={msg.author}
                              className="w-9 h-9 rounded-full object-cover shadow-2xs shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{msg.author}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    msg.channel === "instagram"
                                      ? "bg-rose-50 text-[#E1306C] border border-rose-100"
                                      : msg.channel === "whatsapp"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : msg.channel === "telegram"
                                      ? "bg-sky-50 text-[#0088cc] border border-sky-100"
                                      : "bg-blue-50 text-[#0077b5] border border-blue-100"
                                  }`}
                                >
                                  {msg.channel}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{msg.createdAt}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                              Intent: {msg.intent}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                              {msg.latency}
                            </span>
                          </div>
                        </div>

                        {/* Customer Inbound */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                          {msg.content}
                        </div>

                        {/* AI Outbound Reply */}
                        {msg.reply && (
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>QuickReply AI Auto-Answer (Confidence {msg.confidence}%):</span>
                            </div>
                            <p>{msg.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Rules Grid Preview */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Active Routing &amp; Automation Rules</h3>
                      <p className="text-xs text-slate-500">Autonomous logic executed on every incoming event.</p>
                    </div>
                    <button
                      onClick={() => setActiveNav("rules")}
                      className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open Rule Builder <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rules.map((r) => (
                      <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{r.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>IF:</strong> {r.trigger} &bull; <strong>THEN:</strong> {r.action}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200">
                          Execution Count: {r.hitCount} automated dispatches
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB CONTENT: LIVE FEED ═══ */}
            {activeNav === "feed" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Live Omnichannel Message Feed</h3>
                <div className="divide-y divide-slate-100">
                  {messages.map((m) => (
                    <div key={m.id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {m.author} ({m.channel.toUpperCase()})
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{m.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {m.content}
                      </p>
                      {m.reply && (
                        <p className="text-xs text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                          <strong>AI Reply:</strong> {m.reply}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ TAB CONTENT: INSTAGRAM ═══ */}
            {activeNav === "instagram" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 text-[#E1306C] flex items-center justify-center border border-rose-100">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Instagram Professional 24/7 Engine</h3>
                    <p className="text-xs text-slate-500">Official Meta Graph API v19.0+ OAuth 2.0 Integration</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-900">Comment Moderation</div>
                    <p className="text-xs text-slate-500 mt-1">Automatically answers product inquiries under post reels.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-900">Story Mention DM Triggers</div>
                    <p className="text-xs text-slate-500 mt-1">Dispatches promo codes when customers mention your brand.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-900">Lead Scoring</div>
                    <p className="text-xs text-slate-500 mt-1">Automatically categorizes high-intent shoppers as HOT leads.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB CONTENT: WHATSAPP ═══ */}
            {activeNav === "whatsapp" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">WhatsApp Business Cloud API Suite</h3>
                    <p className="text-xs text-slate-500">Meta Cloud API v20.0 with 24-Hour Service Window Gate</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Replies are dispatched in under 300ms using official WhatsApp Cloud webhooks, maintaining strict SLA compliance.
                </p>
              </div>
            )}

            {/* ═══ TAB CONTENT: TELEGRAM ═══ */}
            {activeNav === "telegram" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-sky-50 text-[#0088cc] flex items-center justify-center border border-sky-100">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Telegram Bot &amp; Business Operations</h3>
                    <p className="text-xs text-slate-500">Bot API v10.2+ with Mini Apps and Star Payments</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Manage personal Telegram Business conversations and automated bot lines with sub-second AI copilot assistance.
                </p>
              </div>
            )}

            {/* ═══ TAB CONTENT: LINKEDIN ═══ */}
            {activeNav === "linkedin" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-[#0077b5] flex items-center justify-center border border-blue-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">LinkedIn Community Management &amp; REST 202401</h3>
                    <p className="text-xs text-slate-500">Thought leadership studio, scheduled posting, and comment auto-replies</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Integrated multi-stage Quality Gate evaluates engagement-bait signals and formats authentic B2B thought leadership content.
                </p>
              </div>
            )}

            {/* ═══ TAB CONTENT: RULE BUILDER ═══ */}
            {activeNav === "rules" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Visual Rule Builder Engine</h3>
                  <button
                    onClick={() => showToast("New rule template added to your sandbox!")}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Create Custom Rule</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {rules.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          <strong>TRIGGER:</strong> {r.trigger} &bull; <strong>ACTION:</strong> {r.action}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ TAB CONTENT: FAQ KNOWLEDGE BASE ═══ */}
            {activeNav === "faqs" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-amber-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">LangChain RAG Knowledge Base</h3>
                    <p className="text-xs text-slate-500">Fact-grounded semantic retrieval with zero hallucination</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your business FAQs, pricing tables, and support documents are automatically vector-embedded. When a customer asks a question, QuickReply retrieves verified answers in 0.08ms.
                </p>
              </div>
            )}

            {/* ═══ TAB CONTENT: ANALYTICS ═══ */}
            {activeNav === "analytics" && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Live Conversion &amp; SLA Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">First-Hour Response Rate</div>
                    <div className="text-2xl font-black text-slate-900 font-mono">99.8%</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Automated Sales Inquiries</div>
                    <div className="text-2xl font-black text-emerald-600 font-mono">1,420</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Hours Saved Weekly</div>
                    <div className="text-2xl font-black text-purple-600 font-mono">38.5 hrs</div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ═══ FLOATING BOTTOM CTA BANNER ═══ */}
      <div className="bg-white border-t border-slate-200/80 py-3.5 px-6 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
            ✨
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Ready to automate your social &amp; messaging channels?</div>
            <div className="text-[11px] text-slate-500 font-medium">
              Start with 500 free automated replies. No credit card required.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm text-center"
          >
            Start Free Trial
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center border border-slate-200"
          >
            View Pricing
          </Link>
        </div>
      </div>

      {/* ═══ FLOATING TOAST NOTIFICATION ═══ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
