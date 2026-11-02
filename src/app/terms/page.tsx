import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions · QuickReply",
  description: "Terms of Service and Acceptable Use Policy governing your use of QuickReply social commerce automation.",
};

export default function TermsPage() {
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
              Legal &amp; Terms
            </span>
          </div>

          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>Official Terms of Service</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#161616] uppercase leading-tight mb-4">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Effective Date: {lastUpdated} · Version 2.4
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-white rounded-[32px] border border-black/5 p-8 sm:p-12 shadow-xs space-y-10 text-sm leading-relaxed text-slate-700">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#EE7D60]" />
                1. Acceptance of Terms
              </h2>
              <p>
                By creating an account, connecting third-party social accounts, or using QuickReply (&ldquo;Platform&rdquo;), you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must discontinue use of the Platform immediately.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                2. Acceptable Use &amp; Anti-Spam Policy
              </h2>
              <p>
                QuickReply is built strictly for legitimate customer service, verified product sales inquiries, and authenticated scheduling. You expressly agree that you will NOT use QuickReply to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>Send unsolicited bulk messages, commercial spam, or phishing campaigns.</li>
                <li>Violate Meta Platforms Terms of Service, Instagram Community Guidelines, or WhatsApp Business Messaging Policy.</li>
                <li>Scrape, reverse engineer, or connect unapproved third-party clients in violation of platform provider terms.</li>
                <li>Publish defamatory, fraudulent, deceptive, or infringing content.</li>
              </ul>
              <p className="text-xs text-slate-500">
                Violation of this Acceptable Use Policy results in immediate, non-refundable termination of your account and revocation of API connectivity.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                3. AI Automation &amp; Grounding Boundaries
              </h2>
              <p>
                QuickReply uses retrieval-augmented generation (RAG) to ground automated replies in your uploaded catalog data. While we apply strict anti-hallucination guardrails and confidence thresholds:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>You are solely responsible for ensuring that uploaded catalog information, pricing, stock levels, and refund policies remain accurate and up to date.</li>
                <li>We recommend configuring human review thresholds for high-risk actions (e.g. refunds or custom discounts exceeding your configured limits).</li>
                <li>QuickReply is not liable for business losses or customer disputes arising from incorrect pricing uploaded in your source catalog.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616]">4. Credit Ledger &amp; Subscriptions</h2>
              <p>
                QuickReply utilizes a transparent, usage-based credit model. Automated AI replies consume 1 credit per response. Manual human replies in the unified inbox are completely free and unlimited.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>Monthly subscription plans automatically renew unless cancelled prior to the renewal date.</li>
                <li>Credits allocated in a subscription billing cycle roll over according to your plan tier terms.</li>
                <li>If your credit balance reaches zero, automated replies pause gracefully until you top up or your cycle renews; your social accounts remain fully connected.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#161616]">5. Third-Party Platform Policies</h2>
              <p>
                QuickReply interacts with external third-party APIs (Meta, Google, Telegram, LinkedIn, X). We do not control and are not responsible for changes in platform terms, API deprecations, rate limits, or quota adjustments imposed by these external providers.
              </p>
            </section>

            <section className="space-y-3 pt-4 border-t border-black/5">
              <h2 className="text-lg font-bold text-[#161616]">6. Contact Information</h2>
              <p>
                For questions regarding these Terms, contact our legal team at:
              </p>
              <div className="font-mono text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-black/5 space-y-1">
                <div>QuickReply Technologies, Inc.</div>
                <div>Legal Department</div>
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
