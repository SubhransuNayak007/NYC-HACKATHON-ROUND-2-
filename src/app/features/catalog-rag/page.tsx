"use client";

import React from "react";
import Link from "next/link";
import {
  Database,
  Cpu,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Search,
  Boxes,
  RefreshCw,
  Lock,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";
import { CatalogRAGMockup } from "@/frontend/components/landing/graphics/CatalogRAGMockup";

export default function CatalogRAGFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              1536-Dimensional Vector Semantic Search
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none text-[#161616]">
              AI PRODUCT <br />
              <span className="text-blue-600">KNOWLEDGE BASE</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Connect your Shopify, WooCommerce, or CSV catalog once. Every customer inquiry gets answered with verified facts — exact sizing, stock levels, warehouse ETA, and return policies with 0% hallucinations.
            </p>
          </div>
        </section>

        {/* Live Interactive Graphic Spotlight */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-[#D4EAF7] p-6 sm:p-10 lg:p-12 rounded-[36px] shadow-2xl border border-black/8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono font-black text-[#161616] uppercase">
                  Vector Retrieval Testbed
                </span>
                <h3 className="text-2xl font-black text-[#161616]">
                  Live Natural Language Catalog Search
                </h3>
              </div>
              <span className="px-3 py-1 bg-white text-xs font-bold text-blue-700 rounded-full border border-black/5">
                ⚡ 18ms Query Latency
              </span>
            </div>

            <CatalogRAGMockup />
          </div>
        </section>

        {/* Deep Architectural Features Breakdown */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-[#161616]">
              Why RAG Beats Generic Chatbots
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Generic LLMs invent prices and promise out-of-stock items. QuickReply pins every token to your live database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Zero-Hallucination Guardrails
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Our deterministic prompt boundary strictly rejects assumptions. If an SKU is out of stock in Mumbai, QuickReply offers alternatives or size pre-orders.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Fact Verified
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Grounded Citation Output
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Real-Time Inventory Webhooks
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                When an order completes on your website, inventory counts update across WhatsApp and Instagram within 500 milliseconds.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-warehouse routing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Low stock urgency pills
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/8 shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#161616]">
                Complex Sizing &amp; Policy Matrix
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Upload your sizing charts (UK/US/EU), return rules, pincode serviceability list, and shipping SLAs for instant accurate answers.
              </p>
              <ul className="space-y-2 text-xs font-bold text-slate-700 pt-2 border-t border-black/5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 29,000+ Indian Pincodes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-language translation
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#161616] text-white p-8 sm:p-12 rounded-[32px] text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Sync Your Store In One Click
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
              Works seamlessly with Shopify, WooCommerce, Magento, Custom APIs, and Google Sheets CSV.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-lg"
              >
                <span>Connect Your Store Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MySamparkFooter />
    </div>
  );
}
