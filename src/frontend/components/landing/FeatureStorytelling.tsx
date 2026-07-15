"use client";

import React, { useState } from "react";
import {
  UnifiedInboxVisual,
  WhatsAppAgentVisual,
  KnowledgeRAGVisual,
  ActionFirewallVisual,
  AnalyticsVisual,
} from "./ProductPreviews";
import {
  MessageSquare,
  Bot,
  Database,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  Layers,
  Sparkles,
  Smartphone,
  Send,
  Users,
} from "lucide-react";

interface FeatureStory {
  num: string;
  category: string;
  title: string;
  description: string;
  capabilities: string[];
  visualType: "inbox" | "whatsapp" | "rag" | "firewall" | "analytics";
}

const FEATURE_STORIES: FeatureStory[] = [
  {
    num: "01",
    category: "AUTONOMOUS INBOX",
    title: "Unified Cross-Platform Conversation Hub",
    description:
      "All your WhatsApp chats, Instagram DMs, and YouTube comments converge into a single, high-performance workspace. Your team never has to switch tabs or lose track of a high-intent conversation.",
    capabilities: ["Multi-Channel Sync", "Real-Time WebSockets", "Smart Tagging", "SLA Monitors"],
    visualType: "inbox",
  },
  {
    num: "02",
    category: "WHATSAPP COMMERCE",
    title: "Autonomous WhatsApp Web Session & Cloud API",
    description:
      "Connect your official WhatsApp number via high-speed Baileys Web session or Meta Cloud API in seconds. Auto-reply to product inquiries, catalog requests, and tracking questions with 0% simulated mock data.",
    capabilities: ["1-Scan QR Device Pairing", "Catalog & Order Sync", "Anti-Ban Protection", "24/7 Autonomous Bot"],
    visualType: "whatsapp",
  },
  {
    num: "03",
    category: "NEURAL RAG MEMORY",
    title: "Grounded Business Brain & Custom Memory",
    description:
      "Train the AI on your exact store catalog, PDF policies, price lists, and past customer orders. QuickReply verifies every fact before responding, eliminating hallucinations and incorrect pricing completely.",
    capabilities: ["Deterministic Product Facts", "Multi-Tenant RAG", "Dynamic Price Verification", "Auto-Catalog Sync"],
    visualType: "rag",
  },
  {
    num: "04",
    category: "SECURITY & GOVERNANCE",
    title: "Verifiable Action Firewall & Zero-Dashboard Alerts",
    description:
      "High-risk actions like refunds or address modifications are gated behind two-way WhatsApp authorization. The business owner receives a WhatsApp ping and replies 'APPROVE' to execute without opening any dashboard.",
    capabilities: ["Prompt Injection Defense", "Role-Based Gating", "2-Way WhatsApp Approvals", "Immutable Audit Ledger"],
    visualType: "firewall",
  },
  {
    num: "05",
    category: "INTELLIGENCE & ROI",
    title: "Live Lead Scoring & Conversational Analytics",
    description:
      "Automatically score customer purchase intent from conversation signals. Track revenue attribution, response latency, deflection rates, and customer sentiment in real time.",
    capabilities: ["Intent Classification", "Automated CRM Lead Scoring", "Revenue Attribution", "Deflection Rate Metrics"],
    visualType: "analytics",
  },
];

export function FeatureStorytelling() {
  const renderVisual = (type: string) => {
    switch (type) {
      case "inbox":
        return <UnifiedInboxVisual />;
      case "whatsapp":
        return <WhatsAppAgentVisual />;
      case "rag":
        return <KnowledgeRAGVisual />;
      case "firewall":
        return <ActionFirewallVisual />;
      case "analytics":
        return <AnalyticsVisual />;
      default:
        return <UnifiedInboxVisual />;
    }
  };

  return (
    <section id="features" className="py-24 bg-[#F4F2EE]/40 dark:bg-[#050810]/60 border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5 block font-mono">
            CORE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-white leading-tight mb-4">
            One intelligent system. <br />
            Every conversational workflow connected.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            From the first social comment to the final WhatsApp order confirmation, QuickReply automates the entire
            customer lifecycle with enterprise reliability.
          </p>
        </div>

        {/* Feature Story Sequence */}
        <div className="space-y-16 lg:space-y-24">
          {FEATURE_STORIES.map((story, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={story.num}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
                  isEven ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Story Editorial Text */}
                <div
                  className={`lg:col-span-5 space-y-4 ${
                    isEven ? "lg:order-2" : "lg:order-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-400 dark:text-slate-600">
                      {story.num}
                    </span>
                    <span className="text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase font-mono">
                      {story.category}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-slate-100 leading-snug">
                    {story.title}
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {story.description}
                  </p>

                  {/* Capability Badges */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {story.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-black/[0.07] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Story Visual Product Demo */}
                <div
                  className={`lg:col-span-7 ${
                    isEven ? "lg:order-1" : "lg:order-2"
                  }`}
                >
                  {renderVisual(story.visualType)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
