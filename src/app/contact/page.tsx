"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

type InquiryType = "general" | "enterprise" | "support" | "partner";

export default function ContactPage() {
  const [inquiryType, setInquiryType] = useState<InquiryType>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-40 sm:pt-48 pb-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
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
              Contact &amp; Support
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
            {/* Left Column: Direct Contact Info & SLAs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#161616] bg-white border border-black/5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                24/7 Engineering Hotline
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#161616] uppercase leading-[0.95]">
                LET&apos;S TALK <br />
                <span className="inline-flex items-center px-4 py-1 rounded-full bg-[#EE7D60] text-white">
                  AUTOMATION.
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Whether you need a custom enterprise catalog ingestion pipeline, volume credit pricing, or technical help configuring your Instagram Graph API webhooks, our engineering team is here to assist.
              </p>

              {/* Direct channels cards */}
              <div className="space-y-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-black/5 flex items-center gap-4 shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#EE7D60] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#161616]">Email Support</div>
                    <a
                      href="mailto:subhransu.nayak.418@gmail.com"
                      className="text-xs text-slate-500 hover:text-[#EE7D60] transition-colors"
                    >
                      subhransu.nayak.418@gmail.com
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 flex items-center gap-4 shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#161616]">WhatsApp VIP Hotline</div>
                    <a
                      href="https://wa.me/918004929921"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      +91 (800) 492-9921 (Direct Chat)
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 flex items-center gap-4 shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#161616]">Live Interactive Agent</div>
                    <Link
                      href="/features/chat-widget"
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Launch Web Chat Widget &rarr;
                    </Link>
                  </div>
                </div>
              </div>

              {/* SLA badge */}
              <div className="p-4 rounded-2xl bg-[#161616] text-white space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">GUARANTEED RESPONSE SLA</span>
                  <span className="text-emerald-400 font-mono font-bold">&lt; 2 Hours</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enterprise and Growth plan users receive dedicated WhatsApp account manager onboarding and custom catalog vector tuning.
                </p>
              </div>
            </div>

            {/* Right Column: Inquiry Form */}
            <div className="lg:col-span-7 rounded-[36px] bg-white border border-black/5 p-6 sm:p-10 shadow-lg">
              {submitted ? (
                <div className="text-center py-16 space-y-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-[#161616]">Inquiry Received!</h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                    Thank you {name}. An automation solutions engineer will review your store requirements and reach out via email/WhatsApp within 2 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="inline-block mt-4 px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-[#161616]">
                      Send Us a Message
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose an inquiry category so we can route your ticket to the appropriate team engineer.
                    </p>
                  </div>

                  {/* Category Pills */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Inquiry Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "general", label: "General" },
                        { id: "enterprise", label: "Enterprise RAG" },
                        { id: "support", label: "Tech Support" },
                        { id: "partner", label: "Affiliates" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setInquiryType(item.id as InquiryType)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                            inquiryType === item.id
                              ? "bg-[#161616] text-white border-[#161616] shadow-xs"
                              : "bg-slate-50 text-slate-600 border-black/5 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Rohan Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="rohan@yourbrand.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Store / Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Velvet Threads Mumbai"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">How can we help? *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Tell us about your monthly conversation volume, product catalog type, or any questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#EE7D60]/40 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 rounded-full bg-[#161616] hover:bg-black text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>Submit Inquiry</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
