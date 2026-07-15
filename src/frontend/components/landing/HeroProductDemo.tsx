"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Database,
  ArrowRight,
  Send,
  RefreshCw,
  Sliders,
  TrendingUp,
  User,
  Bot,
} from "lucide-react";

interface Scenario {
  id: string;
  channel: "whatsapp" | "instagram" | "youtube";
  title: string;
  sender: string;
  avatar: string;
  incomingText: string;
  intent: string;
  confidence: number;
  ragSources: string[];
  aiResponse: string;
  crmAction: string;
  processingTimeMs: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: "pricing",
    channel: "whatsapp",
    title: "Product & Delivery Inquiry",
    sender: "+91 98450 12345 (Pooja K.)",
    avatar: "P",
    incomingText: "Hi! Is the Matte Black Pro Headset in stock? How quickly can you deliver to Bangalore?",
    intent: "price_and_availability",
    confidence: 99.4,
    ragSources: ["Inventory: Pro Headset Matte Black (Stock: 24)", "Logistics: Bangalore Express (1-2 days)"],
    aiResponse:
      "Hello Pooja! Yes, the Matte Black Pro Headset is in stock at ₹4,499. Orders to Bangalore ship via Bluedart Express and arrive within 1–2 business days. Would you like me to send a direct checkout link with free shipping?",
    crmAction: "Created Lead: Pooja K. | Score: 85 (Hot Lead) | Tag: #headset-buyer",
    processingTimeMs: 1240,
  },
  {
    id: "order_status",
    channel: "whatsapp",
    title: "Real-Time Order Tracking",
    sender: "+91 91234 56789 (Rahul M.)",
    avatar: "R",
    incomingText: "Can you give me an update on my order #ORD-8492? Placed it yesterday.",
    intent: "order_status_lookup",
    confidence: 98.9,
    ragSources: ["DB Lookup: Order #ORD-8492", "Courier: Delhivery (AWB: DEL9920194)"],
    aiResponse:
      "Hi Rahul! Your order #ORD-8492 is out for delivery today via Delhivery (Tracking: DEL9920194). Expected delivery before 6:00 PM.",
    crmAction: "Updated Order History: #ORD-8492 | Status: Out for Delivery",
    processingTimeMs: 890,
  },
  {
    id: "insta_lead",
    channel: "instagram",
    title: "Instagram DM Lead Capture",
    sender: "@sarah.designs",
    avatar: "S",
    incomingText: "Do you offer bulk corporate gifting packages for Diwali? Looking for 50 boxes.",
    intent: "b2b_wholesale_lead",
    confidence: 97.8,
    ragSources: ["B2B Catalog: Corporate Hampers Tier 2", "Discount Matrix: > 50 units (20% off)"],
    aiResponse:
      "Hey Sarah! Absolutely. We curate custom Diwali gift hampers for 50+ units starting at ₹1,200/box with custom branding. May I share our corporate lookbook PDF and connect you with our gifting specialist on WhatsApp?",
    crmAction: "Captured B2B Lead: @sarah.designs | Deal Size: ₹60,000 | Pushed to CRM",
    processingTimeMs: 1450,
  },
  {
    id: "escalation",
    channel: "whatsapp",
    title: "Action Firewall & Human Handoff",
    sender: "+91 98801 44321 (Vikram S.)",
    avatar: "V",
    incomingText: "I received a damaged unit today. I want an immediate refund of ₹3,499.",
    intent: "refund_request_high_risk",
    confidence: 99.1,
    ragSources: ["Policy: Refund > ₹2,000 requires supervisor 2-way approval"],
    aiResponse:
      "I am so sorry for the inconvenience, Vikram. I have registered your damaged item claim #CLM-201 and forwarded it to our store manager for priority 1-click refund approval. You will receive an update here within 10 minutes.",
    crmAction: "Triggered Action Firewall: Sent 2-Way Approval SMS to Owner (+91 98450 99881)",
    processingTimeMs: 1100,
  },
];

export function HeroProductDemo() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [activeStage, setActiveStage] = useState<number>(4);
  const [isSimulating, setIsSimulating] = useState(false);
  const [, startTransition] = useTransition();

  const runSimulation = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setIsSimulating(true);
    setActiveStage(1);
  };

  useEffect(() => {
    if (!isSimulating) return;

    const t1 = setTimeout(() => setActiveStage(2), 350);
    const t2 = setTimeout(() => setActiveStage(3), 800);
    const t3 = setTimeout(() => setActiveStage(4), 1300);
    const t4 = setTimeout(() => setIsSimulating(false), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isSimulating, selectedScenario]);

  return (
    <div className="w-full max-w-[1140px] mx-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] shadow-xl overflow-hidden transition-all duration-300">
      {/* Top Application Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/80 dark:bg-[#161B22]/80 backdrop-blur-xs gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2 font-mono">
            quickreply.os · autonomous_pipeline_v3
          </span>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Autonomous Engine: Active</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Firewall: Enforced</span>
          </div>
        </div>
      </div>

      {/* Interactive Scenario Switcher Strip */}
      <div className="px-4 sm:px-6 py-3 bg-[#FAF8F5] dark:bg-[#0D1117] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">
          Live Scenarios:
        </span>
        {SCENARIOS.map((sc) => {
          const isActive = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => runSimulation(sc)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 focus:outline-none ${
                isActive
                  ? "bg-[#111827] text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-black/[0.08] dark:border-white/[0.08]"
              }`}
            >
              <span>{sc.title}</span>
              {isActive && isSimulating && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>
          );
        })}
      </div>

      {/* Main Split Layout: Inbound Conversation + AI Reasoning Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-black/[0.06] dark:divide-white/[0.08]">
        {/* Left Side: Live Conversation Stream (Col 1-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#0D1117] min-h-[380px]">
          <div>
            {/* Conversation Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                  {selectedScenario.avatar}
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#111827] dark:text-[#F0F2F5]">
                    {selectedScenario.sender}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize font-mono">
                    Channel: {selectedScenario.channel}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                Verified Session
              </span>
            </div>

            {/* Conversation Bubbles */}
            <div className="space-y-3.5">
              {/* Inbound Customer Message */}
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-xs bg-[#F4F2EE] dark:bg-zinc-800/90 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-400 mb-0.5">Customer Message</div>
                  {selectedScenario.incomingText}
                </div>
              </div>

              {/* AI Auto-Generated & Dispatched Reply */}
              <div className="flex items-start gap-2.5 max-w-[95%] ml-auto flex-row-reverse">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-950 fill-current" />
                </div>
                <div
                  className={`p-3.5 rounded-2xl rounded-tr-xs text-xs leading-relaxed transition-all duration-300 shadow-2xs ${
                    activeStage >= 4
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70"
                      : "bg-slate-100 dark:bg-zinc-800/50 text-slate-400 border border-dashed border-slate-300 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px]">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current text-emerald-600" />
                      QuickReply Autonomous Bot
                    </span>
                    <span className="font-mono text-slate-400">
                      {activeStage >= 4 ? `${selectedScenario.processingTimeMs}ms` : "Reasoning..."}
                    </span>
                  </div>
                  {activeStage >= 4 ? (
                    selectedScenario.aiResponse
                  ) : (
                    <div className="flex items-center gap-2 py-1 text-slate-500 italic">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                      <span>Synthesizing grounded reply with Neural RAG...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CRM Action Pill */}
          <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-mono">CRM Status:</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400 truncate max-w-[240px]">
              {selectedScenario.crmAction}
            </span>
          </div>
        </div>

        {/* Right Side: Real-Time Reasoning & RAG Knowledge Pipeline (Col 6-12) */}
        <div className="lg:col-span-7 p-5 sm:p-6 bg-[#FAF8F5]/70 dark:bg-[#050810]/70 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Autonomous Reasoning Trace
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                Confidence: {selectedScenario.confidence}%
              </span>
            </div>

            {/* Pipeline Stage 1: Inbound Parser */}
            <div
              className={`p-3 rounded-xl border text-xs transition-all duration-200 ${
                activeStage >= 1
                  ? "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900"
                  : "border-slate-200/50 dark:border-zinc-800/50 opacity-40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#111827] dark:text-[#F0F2F5] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  1. Intent &amp; Language Parsing
                </span>
                <span className="text-[10px] font-mono text-slate-400">Layer 1</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Detected Intent: <strong className="text-slate-800 dark:text-slate-200">{selectedScenario.intent}</strong>{" "}
                · Language: English (IN)
              </p>
            </div>

            {/* Pipeline Stage 2: Neural RAG Grounding */}
            <div
              className={`p-3 rounded-xl border text-xs transition-all duration-200 ${
                activeStage >= 2
                  ? "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900"
                  : "border-slate-200/50 dark:border-zinc-800/50 opacity-40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#111827] dark:text-[#F0F2F5] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  2. Business Brain &amp; Vector RAG Lookup
                </span>
                <span className="text-[10px] font-mono text-slate-400">Deterministic</span>
              </div>
              <div className="space-y-1 mt-1.5">
                {selectedScenario.ragSources.map((source, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-[#F4F2EE] dark:bg-zinc-800 text-slate-700 dark:text-slate-300"
                  >
                    ✓ {source}
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Stage 3: Action Firewall & Safety */}
            <div
              className={`p-3 rounded-xl border text-xs transition-all duration-200 ${
                activeStage >= 3
                  ? "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900"
                  : "border-slate-200/50 dark:border-zinc-800/50 opacity-40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#111827] dark:text-[#F0F2F5] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  3. Action Firewall &amp; Anti-Hallucination Gate
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  PASSED
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Grounded Fact Verification: 100% matched against verified database records. Prompt injection scan: 0 threats.
              </p>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>Model: Claude 3.5 Sonnet + Gemini RAG</span>
            <span>Latency: {selectedScenario.processingTimeMs}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
