"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Tag,
  Search,
  Sparkles,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

type BlogCategory = "all" | "instagram" | "whatsapp" | "rag" | "case_study" | "dtc";

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  category: "instagram" | "whatsapp" | "rag" | "case_study" | "dtc";
  categoryLabel: string;
  readTime: string;
  date: string;
  img: string;
  featured?: boolean;
}

const POSTS: BlogPost[] = [
  {
    title: "How to Turn Instagram Reel Comments into 4-Figure Sales with Auto DM",
    slug: "instagram-reel-comment-auto-dm-guide",
    excerpt:
      "Learn how modern D2C fashion brands set up comment-to-DM triggers that quote exact catalog prices within 1.2 seconds, boosting checkout conversions by 3.4x.",
    category: "instagram",
    categoryLabel: "Instagram Growth",
    readTime: "5 min read",
    date: "Aug 14, 2026",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80",
    featured: true,
  },
  {
    title: "Why WhatsApp Commerce Outconverts Traditional Checkout Pages by 3.8x",
    slug: "whatsapp-commerce-conversion-rate-breakdown",
    excerpt:
      "Data from 250,000 conversational checkouts across Indian retail stores reveals the secret to zero-drop cart recovery and frictionless 1-click buy links.",
    category: "whatsapp",
    categoryLabel: "WhatsApp Strategy",
    readTime: "7 min read",
    date: "Aug 11, 2026",
    img: "https://images.unsplash.com/photo-1557838923-2985c318be48?w=600&auto=format&fit=crop&q=80",
  },
  {
    title: "Neural RAG vs Fixed Keyword Chatbots: Why Knowledge Grounding Matters",
    slug: "neural-rag-vs-keyword-chatbots",
    excerpt:
      "Why fixed keyword rules fail on nuanced customer inquiries like 'does this run small?', and how neural vector retrieval solves it with zero hallucinations.",
    category: "rag",
    categoryLabel: "AI Architecture",
    readTime: "6 min read",
    date: "Aug 08, 2026",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
  },
  {
    title: "How Bombay Velvet Scaled to ₹18 Lakhs/Month with Zero Customer Support Reps",
    slug: "bombay-velvet-scale-case-study",
    excerpt:
      "A complete behind-the-scenes breakdown of how an apparel boutique automated 94% of customer questions and scaled midnight orders on autopilot.",
    category: "case_study",
    categoryLabel: "DTC Case Study",
    readTime: "8 min read",
    date: "Aug 05, 2026",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
  },
  {
    title: "The Zero-Dashboard Philosophy: Controlling Your AI via WhatsApp Approvals",
    slug: "zero-dashboard-whatsapp-approvals",
    excerpt:
      "You don't need another SaaS dashboard open on your laptop. Here is how 2-way owner WhatsApp firewalls keep you in complete control from your phone.",
    category: "dtc",
    categoryLabel: "Product Strategy",
    readTime: "4 min read",
    date: "Aug 02, 2026",
    img: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=600&auto=format&fit=crop&q=80",
  },
  {
    title: "Omnichannel Social Commerce: Connecting Telegram, LinkedIn & Messenger",
    slug: "omnichannel-social-commerce-playbook",
    excerpt:
      "Why leading omnichannel brands don't rely only on one network, and how unified inboxes prevent agent collisions across multiple channels.",
    category: "dtc",
    categoryLabel: "Omnichannel Growth",
    readTime: "6 min read",
    date: "Jul 28, 2026",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
  },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory>("all");
  const [search, setSearch] = useState<string>("");

  const categories = [
    { id: "all", label: "All Guides" },
    { id: "instagram", label: "Instagram Growth" },
    { id: "whatsapp", label: "WhatsApp Strategy" },
    { id: "rag", label: "AI Architecture" },
    { id: "case_study", label: "Case Studies" },
    { id: "dtc", label: "DTC Playbooks" },
  ];

  const filteredPosts = POSTS.filter((post) => {
    const matchesCat = activeCategory === "all" || post.category === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      post.categoryLabel.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredPost = POSTS.find((p) => p.featured) || POSTS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-black transition-colors"
            >
              Home
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs font-bold text-[#EE7D60] uppercase tracking-wider">
              Social Commerce Playbook &amp; Blog
            </span>
          </div>

          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs mb-4">
              <span className="w-2 h-2 rounded-full bg-[#EE7D60]" />
              Engineering &amp; Strategy Insights
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black tracking-tight text-[#161616] uppercase leading-[0.98] mb-6">
              THE SOCIAL COMMERCE <br />
              <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">PLAYBOOK.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Expert guides, data studies, and automation blueprints for growing direct-to-consumer brands and creators.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-14">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as BlogCategory)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#161616] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-black/5 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guides..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-black/10 text-xs text-[#161616] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EE7D60]"
              />
            </div>
          </div>

          {/* Featured Article Card */}
          {activeCategory === "all" && !search && (
            <div className="rounded-[36px] bg-white border border-black/5 p-6 sm:p-10 shadow-md mb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center hover:shadow-xl transition-all">
              <div className="lg:col-span-6 h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={featuredPost.img}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-orange-50 text-[#EE7D60] text-xs font-bold font-mono">
                    Featured Blueprint
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{featuredPost.readTime}</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-[#161616] leading-tight">
                  {featuredPost.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2">
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    <span>Read Full Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-[28px] bg-white border border-black/5 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img
                    src={post.img}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#161616] shadow-2xs">
                    {post.categoryLabel}
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium mb-2.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" /> {post.date}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {post.readTime}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#161616] leading-snug group-hover:text-[#EE7D60] transition-colors mb-2">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {post.excerpt}
                    </p>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EE7D60] group-hover:translate-x-1 transition-transform pt-2"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter Subscription Card */}
          <div className="rounded-[36px] bg-[#161616] text-white p-8 sm:p-14 shadow-xl text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Get weekly social commerce teardowns.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Join 12,000+ founders and digital marketers receiving our weekly breakdown of viral Reel triggers, WhatsApp conversion funnels, and prompt engineering blueprints.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto pt-2">
              <input
                type="email"
                placeholder="Enter your work email..."
                className="w-full sm:flex-1 h-12 px-4 rounded-full bg-white/10 border border-white/20 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EE7D60]"
              />
              <button
                type="button"
                className="w-full sm:w-auto px-6 h-12 rounded-full bg-[#EE7D60] hover:bg-[#D96549] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
              >
                Subscribe Free
              </button>
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
