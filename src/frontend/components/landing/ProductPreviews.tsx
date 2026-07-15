"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Instagram,
  Youtube,
  Send,
  Database,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Smartphone,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

/**
 * 1. Unified Cross-Platform Inbox Visual Simulator
 */
export function UnifiedInboxVisual() {
  const [activeTab, setActiveTab] = useState<"all" | "whatsapp" | "instagram" | "youtube">("all");

  const conversations = [
    {
      id: "c1",
      platform: "whatsapp",
      name: "Dr. Ananya Roy",
      msg: "Can we get 10 units delivered to Kolkata by Friday?",
      time: "Just now",
      status: "AI Responded",
      unread: true,
    },
    {
      id: "c2",
      platform: "instagram",
      name: "@mumbai_cafes",
      msg: "Loved your packaging! Where can we order wholesale?",
      time: "2m ago",
      status: "Lead Qualified",
      unread: true,
    },
    {
      id: "c3",
      platform: "youtube",
      name: "Gaurav Reviews",
      msg: "Does this come with a 2-year warranty in India?",
      time: "6m ago",
      status: "Replied",
      unread: false,
    },
  ];

  const filtered =
    activeTab === "all" ? conversations : conversations.filter((c) => c.platform === activeTab);

  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] shadow-md overflow-hidden text-xs">
      <div className="p-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F4F2EE]/80 dark:bg-[#161B22]/80 flex items-center justify-between">
        <span className="font-semibold text-[#111827] dark:text-[#F0F2F5] flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#111827] dark:text-white" />
          Unified Omnichannel Inbox
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
          3 Real-Time Threads
        </span>
      </div>

      <div className="p-2.5 bg-[#FAF8F5] dark:bg-zinc-800/40 border-b border-black/[0.06] dark:border-white/[0.08] flex gap-1.5 overflow-x-auto">
        {(["all", "whatsapp", "instagram", "youtube"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-[#111827] text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-black/[0.08] dark:border-zinc-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="divide-y divide-black/[0.05] dark:divide-zinc-800/60 p-1">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-3 hover:bg-[#FAF8F5] dark:hover:bg-zinc-800/50 rounded-lg transition-colors flex items-start justify-between gap-2"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-[11px] shrink-0 mt-0.5">
                {c.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#111827] dark:text-[#F0F2F5]">{c.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#F4F2EE] dark:bg-zinc-800 text-slate-500 font-mono">
                    {c.platform}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">{c.msg}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">{c.time}</span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. WhatsApp Agent & QR Device Pairing Visual
 */
export function WhatsAppAgentVisual() {
  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] p-5 shadow-md text-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
            WA
          </div>
          <div>
            <div className="font-bold text-[#111827] dark:text-[#F0F2F5]">WhatsApp Web Session (Baileys)</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ● Connected: +91 98450 99881
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F2EE] dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
          Uptime: 99.98%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950/60">
          <div className="text-slate-500 mb-1">Pairing Engine</div>
          <div className="font-semibold text-[#111827] dark:text-[#F0F2F5] flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
            1-Scan QR / Code
          </div>
        </div>
        <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950/60">
          <div className="text-slate-500 mb-1">Human Takeover</div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            Phone Sync Active
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#111827] text-white dark:bg-zinc-800 dark:text-zinc-100 text-[11px] font-mono space-y-1">
        <div className="text-slate-400 text-[10px]">// Live WebSocket Stream</div>
        <div>[INBOUND] &quot;What is your Bangalore store address?&quot;</div>
        <div className="text-emerald-400">&gt; [RAG_LOOKUP] Found: Indiranagar 100ft Rd store</div>
        <div className="text-amber-400">&gt; [AUTO_SENT] &quot;We are located at #42, 100ft Road, Indiranagar...&quot; (1.2s)</div>
      </div>
    </div>
  );
}

/**
 * 3. Neural RAG Knowledge Base Ingestion Visual
 */
export function KnowledgeRAGVisual() {
  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] p-5 shadow-md text-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-[#111827] dark:text-[#F0F2F5]">Grounded Business Brain</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">14,280 Embeddings Synced</span>
      </div>

      <div className="space-y-2">
        <div className="p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Catalog_Summer_2026.csv</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Indexed (120 SKUs)
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Return_And_Refund_Policy.pdf</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Indexed (30-day rule)
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Shipping_Tier_Rates.json</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Live Database Connected
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Anti-Hallucination Guard: Every generated claim is verified against exact database rows.</span>
      </div>
    </div>
  );
}

/**
 * 4. Action Firewall & Zero-Dashboard 2-Way Approval Visual
 */
export function ActionFirewallVisual() {
  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] p-5 shadow-md text-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-[#111827] dark:text-[#F0F2F5]">Verifiable Action Firewall</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F2EE] dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
          Zero-Trust Boundary
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950 flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400">Low-Risk (FAQ &amp; Price Replies):</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Autonomous Instant Send</span>
        </div>
        <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
          <span className="text-amber-900 dark:text-amber-300 font-medium">High-Risk (Refund &gt; ₹2,000):</span>
          <span className="font-bold text-amber-700 dark:text-amber-400">Gated for Owner WhatsApp Approval</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#111827] text-white text-[11px] space-y-1 font-mono">
        <div className="text-slate-400 text-[10px]">// Owner WhatsApp Alert</div>
        <div>🔔 *QuickReply Alert*: Customer #9921 requested ₹4,500 refund.</div>
        <div className="text-emerald-400">👉 Reply *APPROVE 9921* or *REJECT 9921*</div>
      </div>
    </div>
  );
}

/**
 * 5. Real-Time Analytics & ROI Visual
 */
export function AnalyticsVisual() {
  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D1117] p-5 shadow-md text-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-[#111827] dark:text-[#F0F2F5]">Live ROI &amp; Performance Metrics</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">Updated 5s ago</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950">
          <div className="text-slate-500 text-[10px] uppercase font-mono">Deflection Rate</div>
          <div className="text-lg font-bold text-[#111827] dark:text-[#F0F2F5] mt-0.5">88.4%</div>
          <div className="text-[10px] text-emerald-600 font-medium">Automated without staff</div>
        </div>

        <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950">
          <div className="text-slate-500 text-[10px] uppercase font-mono">Avg Latency</div>
          <div className="text-lg font-bold text-[#111827] dark:text-[#F0F2F5] mt-0.5">1.8s</div>
          <div className="text-[10px] text-emerald-600 font-medium">96% faster than human</div>
        </div>

        <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-zinc-950 col-span-2 sm:col-span-1">
          <div className="text-slate-500 text-[10px] uppercase font-mono">Revenue Attributed</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹4,82,500</div>
          <div className="text-[10px] text-slate-500">Last 30 days</div>
        </div>
      </div>
    </div>
  );
}
