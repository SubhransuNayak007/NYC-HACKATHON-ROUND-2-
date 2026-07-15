"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, Video, Calendar as CalendarIcon, CheckCircle2, ArrowRight } from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

const TIME_SLOTS = [
  "10:00 AM",
  "11:30 AM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
  "06:30 PM",
];

const DEMO_FAQS = [
  {
    q: "How long is the demo?",
    a: "Around 30 minutes. We keep it focused on what matters to you — Auto DM, AI product replies, scheduling, and the unified inbox — with time for your questions.",
  },
  {
    q: "What happens after I book?",
    a: "You'll get an email confirmation right away. Our team then reaches out to confirm the exact time and share a meeting link before your slot.",
  },
  {
    q: "Do I need to prepare anything?",
    a: "No preparation needed. If you'd like, mention your platforms and product catalog in the notes so we can tailor the walkthrough to your business.",
  },
  {
    q: "Is the demo free?",
    a: "Yes, completely free with no commitment. It's simply a chance to see QuickReply in action and decide if it's the right fit for you.",
  },
];

export default function RequestDemoPage() {
  const [selectedDay, setSelectedDay] = useState<number>(18);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const days = [
    { num: 17, label: "Mon", active: true },
    { num: 18, label: "Tue", active: true },
    { num: 19, label: "Wed", active: true },
    { num: 20, label: "Thu", active: true },
    { num: 21, label: "Fri", active: true },
    { num: 22, label: "Sat", active: false },
    { num: 23, label: "Sun", active: false },
    { num: 24, label: "Mon", active: true },
    { num: 25, label: "Tue", active: true },
    { num: 26, label: "Wed", active: true },
  ];

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBooked(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#161616] font-sans">
      <MySamparkHeader />

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 pt-8">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Request a demo
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#161616] uppercase">
              BOOK A LIVE <span className="text-[#E8590C]">DEMO.</span>
            </h1>
            <p className="mt-4 text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Pick a date and time that suits you — we&apos;ll tailor the walkthrough to your business and workflow.
            </p>
          </div>

          {/* Booking Container */}
          <div className="rounded-3xl bg-white border border-black/10 shadow-xl p-6 sm:p-10 mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Info */}
            <div className="lg:col-span-4 space-y-6 lg:border-r lg:border-black/10 lg:pr-8">
              <h2 className="text-2xl font-black text-[#161616]">Book a live demo</h2>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>30 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-slate-400" />
                  <span>Video call — link shared after booking</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-4 border-t border-black/5">
                A focused walkthrough of Auto DM, AI product replies, and the unified inbox — tailored to your business.
              </p>
            </div>

            {/* Right Column: Interactive Calendar & Slot Picker */}
            <div className="lg:col-span-8 space-y-6">
              {booked ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-[#161616]">Demo Booked Successfully!</h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    We&apos;ve sent an invitation for August {selectedDay}, 2026 at {selectedSlot} to <strong>{email}</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#161616] mb-3">Select a date (August 2026)</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {days.map((d) => (
                        <button
                          key={d.num}
                          type="button"
                          disabled={!d.active}
                          onClick={() => setSelectedDay(d.num)}
                          className={`p-2.5 rounded-xl text-center transition-all ${
                            !d.active
                              ? "opacity-30 cursor-not-allowed bg-slate-50"
                              : selectedDay === d.num
                              ? "bg-[#161616] text-white shadow-md font-bold"
                              : "bg-[#FAF8F5] text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <div className="text-[10px] uppercase font-mono">{d.label}</div>
                          <div className="text-sm font-bold">{d.num}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#161616] mb-3">Select a time slot</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                            selectedSlot === slot
                              ? "border-[#E8590C] bg-orange-50 text-[#E8590C] font-bold shadow-xs"
                              : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Neha Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E8590C]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                      <input
                        type="email"
                        required
                        placeholder="neha@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-black/10 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E8590C]/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedSlot}
                    className="w-full py-3.5 rounded-full bg-[#E8590C] hover:bg-[#D94E07] text-white font-bold text-xs sm:text-sm transition-all shadow-md disabled:opacity-50"
                  >
                    Confirm Demo for August {selectedDay} {selectedSlot ? `at ${selectedSlot}` : ""}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Demo FAQs */}
          <div className="max-w-4xl mx-auto pt-12 border-t border-black/10 mb-16">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">FAQs</div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#161616] uppercase">
                QUESTIONS BEFORE YOU <span className="text-[#E8590C]">BOOK.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DEMO_FAQS.map((faq, i) => (
                <div key={i} className="rounded-3xl bg-white border border-black/5 p-6 shadow-xs">
                  <h3 className="font-bold text-sm sm:text-base text-[#161616] mb-2">{faq.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MySamparkFooter />
    </div>
  );
}
