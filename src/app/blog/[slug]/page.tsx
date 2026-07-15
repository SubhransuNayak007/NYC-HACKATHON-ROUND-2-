"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Tag, Share2, CheckCircle2 } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-36 pb-24">
        <article className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#161616] mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Articles</span>
          </Link>

          <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-[#E8590C] text-xs font-bold uppercase tracking-wider mb-4">
            Social Commerce Strategy
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#161616] leading-tight mb-6">
            How to Turn Social Media Comments into Instant Sales with Grounded AI
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pb-8 mb-8 border-b border-black/10">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Published Aug 14, 2026
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 6 min read
            </span>
            <span>By Saurabh Infosys Research Team</span>
          </div>

          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed space-y-6 text-slate-700">
            <p className="font-semibold text-lg text-slate-900 leading-snug">
              When an engaged follower asks &quot;Price please?&quot; on your Instagram Reel or WhatsApp catalog, they are in
              the peak emotional moment of purchase intent.
            </p>

            <p>
              Traditional brands typically respond in 4 to 8 hours. By then, the user has scrolled past dozens of other posts,
              closed the app, or purchased from a competitor.
            </p>

            <h2 className="text-2xl font-bold text-[#161616] pt-4">1. Why Generic AI Bots Fail</h2>
            <p>
              Most standard chatbots make the fatal mistake of guessing or providing static template responses like &quot;Please check our website&quot;.
              This creates friction. A customer doesn&apos;t want to search your 500-product website for the item they just saw in a 10-second video.
            </p>

            <div className="p-5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-2">
              <div className="font-bold text-xs text-emerald-600 uppercase font-mono">The QuickReply Solution</div>
              <p className="text-xs text-slate-600">
                Our Neural RAG engine links the specific post ID to the exact inventory SKU in your database. The AI extracts the current stock, quotes the live price, and delivers a 1-tap checkout link into the user&apos;s private DM in 1.4 seconds.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-[#161616] pt-4">2. The 2-Way WhatsApp Safety Net</h2>
            <p>
              Store owners often worry about AI discounting products too aggressively or promising out-of-stock items. With our Action Firewall,
              any action with high financial impact requires a 1-tap SMS/WhatsApp confirmation from the owner before it executes.
            </p>

            <div className="rounded-2xl bg-[#D6EFE5] p-6 text-center mt-10">
              <h3 className="text-lg font-bold text-[#161616] mb-2">Want to try this on your own social channels?</h3>
              <p className="text-xs text-slate-700 mb-4">Set up your first automated keyword in 5 minutes.</p>
              <Link
                href="/signup"
                className="inline-block px-6 py-2.5 rounded-full bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </article>
      </main>

      <MySamparkFooter />
    </div>
  );
}
