import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, ArrowLeft, Lock, Database, Eye, Trash2 } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export const metadata: Metadata = {
  title: "Privacy Policy · QuickReply",
  description: "Learn how QuickReply collects, processes, encrypts, and protects your data and social media accounts.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 31, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-black transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs font-bold text-[#EE7D60] uppercase tracking-wider">
              Legal &amp; Privacy
            </span>
          </div>

          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Privacy Policy</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#161616] uppercase leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Effective Date: {lastUpdated} · Version 2.4
            </p>
          </div>

          {/* Policy Body */}
          <div className="bg-white rounded-[32px] border border-black/5 p-8 sm:p-12 shadow-xs space-y-10 text-sm leading-relaxed text-slate-700">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#EE7D60]" />
                1. Overview &amp; Commitment
              </h2>
              <p>
                QuickReply (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides an intelligent social commerce automation platform connecting your online product catalog to customer messaging channels including Instagram, WhatsApp, YouTube, Facebook, LinkedIn, and Telegram. We consider privacy and security paramount. We do not sell your personal data or your customers&rsquo; conversation logs to data brokers or third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#EE7D60]" />
                2. Information We Collect
              </h2>
              <p>When you register, connect third-party platforms, or use QuickReply, we collect:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>
                  <strong className="text-slate-900">Account Credentials:</strong> Your email address, business name, and encrypted authentication tokens.
                </li>
                <li>
                  <strong className="text-slate-900">Integration Authorizations:</strong> Platform OAuth access tokens granted by you through Meta Graph API, Google OAuth, or WhatsApp Cloud API. All tokens are encrypted at rest using AES-256-GCM.
                </li>
                <li>
                  <strong className="text-slate-900">Product &amp; Catalog Data:</strong> Product titles, pricing, SKU availability, and sizing charts uploaded directly via CSV or synced via authorized e-commerce connectors.
                </li>
                <li>
                  <strong className="text-slate-900">Public Comments &amp; Inbound Inquiries:</strong> Inbound social comments and direct messages received from platforms you have explicitly connected, strictly for processing automated replies and unified inbox display.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#EE7D60]" />
                3. How We Process and Use Your Information
              </h2>
              <p>Collected information is utilized strictly to deliver QuickReply functionality:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>Grounding AI answers strictly in your verified catalog with deterministic fact verification.</li>
                <li>Dispatching public comment replies and private direct messages via official platform APIs.</li>
                <li>Scheduling and publishing your planned social content across selected channels.</li>
                <li>Calculating transparent credit usage and processing billing transactions via Stripe and Razorpay.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#EE7D60]" />
                4. Data Deletion Instructions (Meta &amp; Google Platform Compliance)
              </h2>
              <p>
                In compliance with Meta Platform Terms and Google API Services User Data Policy, you retain complete ownership and control over your data:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>
                  <strong className="text-slate-900">Immediate Disconnect:</strong> You may disconnect any social channel at any time from your QuickReply Integrations Dashboard. Disconnecting immediately revokes our API tokens and halts all inbound message synchronization.
                </li>
                <li>
                  <strong className="text-slate-900">Account Deletion Request:</strong> To completely delete your account, synced conversations, and catalog data, send an email from your registered account email to <a href="mailto:support@quickreply.ai" className="text-[#EE7D60] underline">support@quickreply.ai</a> with the subject line &ldquo;Data Deletion Request&rdquo;. All stored customer conversations and catalog embeddings will be permanently purged within 7 business days.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616]">5. Third-Party Sub-processors</h2>
              <p>QuickReply partners with trusted, industry-standard infrastructure providers:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <div className="font-bold text-xs text-slate-900">Meta Platforms, Inc.</div>
                  <div className="text-xs text-slate-500">Instagram Graph API &amp; WhatsApp Cloud API</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <div className="font-bold text-xs text-slate-900">Google Cloud / YouTube</div>
                  <div className="text-xs text-slate-500">YouTube Data API v3 &amp; Gemini Flash</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <div className="font-bold text-xs text-slate-900">Anthropic, PBC</div>
                  <div className="text-xs text-slate-500">Claude LLM Inference (Zero Data Retention)</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <div className="font-bold text-xs text-slate-900">Stripe &amp; Razorpay</div>
                  <div className="text-xs text-slate-500">PCI-DSS Compliant Payment Processing</div>
                </div>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-black/5">
              <h2 className="text-lg font-bold text-[#161616]">6. Contact Us</h2>
              <p>
                If you have questions regarding this Privacy Policy or our security practices, contact us at:
              </p>
              <div className="font-mono text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-black/5 space-y-1">
                <div>QuickReply Technologies, Inc.</div>
                <div>Legal &amp; Data Protection Officer</div>
                <div>Email: <a href="mailto:support@quickreply.ai" className="text-[#EE7D60]">support@quickreply.ai</a></div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
