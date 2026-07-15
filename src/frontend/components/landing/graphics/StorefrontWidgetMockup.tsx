"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  Send,
  ArrowRight,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronDown,
  X,
  Bot,
} from "lucide-react";

interface StorefrontWidgetMockupProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: "visitor" | "assistant";
  text: string;
  time: string;
  product?: {
    title: string;
    price: number;
    mrp: number;
    image: string;
    stock: string;
    sku: string;
  };
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "visitor",
    text: "Hey! I'm looking for a lightweight water-repellent jacket under ₹3,000 for morning runs.",
    time: "10:14 AM",
  },
  {
    id: "m2",
    sender: "assistant",
    text: "I found the perfect match in your size and budget! It is currently in stock with 2-day express dispatch 🏃‍♂️",
    time: "10:14 AM",
    product: {
      title: "AeroShield Wind & Water Runner",
      price: 2499,
      mrp: 3799,
      image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=400&auto=format&fit=crop&q=80",
      stock: "5 units left in Mumbai Hub",
      sku: "QR-RUN-8842",
    },
  },
];

const QUICK_PROMPTS = [
  "Do you deliver to pincode 400001?",
  "What is your exchange policy?",
  "Any first-time buyer discount code?",
];

export function StorefrontWidgetMockup({ className = "" }: StorefrontWidgetMockupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [whatsappHandoffState, setWhatsappHandoffState] = useState<"idle" | "opening" | "handed_off">("idle");

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "visitor",
      text: text,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    setTimeout(() => {
      let replyText = "I checked our live catalog & store policies. ";
      let prodData = undefined;

      if (text.toLowerCase().includes("pincode") || text.toLowerCase().includes("deliver")) {
        replyText += "Yes! Delivery to pincode 400001 is active via Express BlueDart Air (Estimated arrival in 48 hours) 🚚📦";
      } else if (text.toLowerCase().includes("exchange") || text.toLowerCase().includes("return")) {
        replyText += "We provide 7-day hassle-free doorstep size exchanges with free reverse pickup! 🔄";
      } else if (text.toLowerCase().includes("discount") || text.toLowerCase().includes("code")) {
        replyText += "Use coupon code WELCOME15 at checkout for 15% OFF your first order 🎉";
      } else {
        replyText += "Here is another top-rated item from our active catalog that buyers loved:";
        prodData = {
          title: "Ultralight Performance Runner Tee",
          price: 999,
          mrp: 1499,
          image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80",
          stock: "All sizes in stock",
          sku: "QR-TEE-1102",
        };
      }

      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        time: "Just now",
        product: prodData,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 700);
  };

  const handleWhatsAppHandoff = () => {
    setWhatsappHandoffState("opening");
    setTimeout(() => {
      setWhatsappHandoffState("handed_off");
      setTimeout(() => setWhatsappHandoffState("idle"), 4000);
    }, 1200);
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide flex items-center gap-2">
              <span>Embeddable Web Storefront Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              1-Line Embed Script · Real-Time Product Recommendations · 1-Click WhatsApp Handoff
            </p>
          </div>
        </div>

        <span className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 font-bold px-2.5 py-1 rounded-full">
          &lt;script src=&quot;quickreply.js&quot;&gt;
        </span>
      </div>

      {/* Mock Storefront Wrapper Frame */}
      <div className="mt-4 rounded-xl border border-black/10 bg-slate-50 overflow-hidden shadow-inner">
        {/* Browser Top Bar */}
        <div className="bg-slate-200/80 px-4 py-2 flex items-center justify-between text-xs text-slate-600 border-b border-black/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono text-[10px] text-slate-500">
              https://yourbrandstore.com/shop
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
            <span>AURA APPAREL</span>
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> Cart (2)
            </span>
          </div>
        </div>

        {/* Storefront Canvas with Embedded Chat Widget */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-100 to-white relative min-h-[380px] flex flex-col md:flex-row gap-4 items-start">
          {/* Background Store Catalog Showcase */}
          <div className="flex-1 space-y-3 hidden sm:block">
            <div className="bg-white p-4 rounded-xl border border-black/5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Featured Autumn Apparel</span>
                <span className="text-[10px] text-[#EE7D60]">View All &rarr;</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg overflow-hidden border border-black/5 bg-slate-50 p-2 space-y-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1544441893-675973e31985?w=300&auto=format&fit=crop&q=80"
                    alt="Runner jacket"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div className="text-[11px] font-bold text-[#161616] truncate">AeroShield Runner</div>
                  <div className="text-xs font-bold text-emerald-600 font-mono">₹2,499</div>
                </div>
                <div className="rounded-lg overflow-hidden border border-black/5 bg-slate-50 p-2 space-y-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80"
                    alt="Heavyweight tee"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div className="text-[11px] font-bold text-[#161616] truncate">Boxy Washed Tee</div>
                  <div className="text-xs font-bold text-emerald-600 font-mono">₹1,499</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Live QuickReply Chat Assistant Widget */}
          <div className="w-full md:w-[340px] bg-white rounded-2xl border border-black/15 shadow-2xl overflow-hidden flex flex-col justify-between shrink-0">
            {/* Widget Header */}
            <div className="bg-[#161616] text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-[#161616] flex items-center justify-center font-black text-xs">
                  QR
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Aura AI Concierge</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    Instant Catalog Knowledge · 1.1s reply
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetOpen(!isWidgetOpen)}
                className="text-slate-400 hover:text-white"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Widget Chat Messages Scroll Area */}
            {isWidgetOpen && (
              <>
                <div className="p-3 space-y-2.5 max-h-[220px] overflow-y-auto bg-[#FAF8F5] text-xs">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === "visitor" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-2.5 rounded-xl max-w-[90%] text-xs font-medium ${
                          m.sender === "visitor"
                            ? "bg-[#161616] text-white"
                            : "bg-white text-slate-800 border border-black/5 shadow-2xs"
                        }`}
                      >
                        <p className="leading-snug">{m.text}</p>

                        {/* If Assistant recommended a product card */}
                        {m.product && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-black/5 flex items-center gap-2">
                            <img
                              src={m.product.image}
                              alt={m.product.title}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-md object-cover border border-black/10 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold text-[#161616] truncate">
                                {m.product.title}
                              </div>
                              <div className="text-[11px] text-emerald-600 font-bold font-mono">
                                ₹{m.product.price.toLocaleString("en-IN")}{" "}
                                <span className="text-[9px] text-slate-400 line-through">
                                  ₹{m.product.mrp.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">
                        {m.time}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick Prompts Chips */}
                <div className="px-3 py-1.5 bg-slate-50 border-t border-black/5 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(p)}
                      className="text-[10px] px-2 py-0.5 bg-white border border-black/10 rounded-full text-slate-600 hover:border-black/30 shrink-0 font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* 1-Click WhatsApp Handoff Banner */}
                <div className="p-2.5 bg-emerald-50 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={handleWhatsAppHandoff}
                    disabled={whatsappHandoffState !== "idle"}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                      whatsappHandoffState === "handed_off"
                        ? "bg-emerald-700 text-white"
                        : "bg-[#25D366] text-white hover:bg-[#20bd5a]"
                    }`}
                  >
                    {whatsappHandoffState === "idle" && (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full bg-white text-[#25D366] flex items-center justify-center text-[8px] font-black">
                          W
                        </div>
                        <span>Continue Chat on WhatsApp 💬</span>
                      </>
                    )}
                    {whatsappHandoffState === "opening" && (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Transferring Cart &amp; History to WhatsApp...</span>
                      </>
                    )}
                    {whatsappHandoffState === "handed_off" && (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Chat Transferred to Mobile WhatsApp!</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-2.5 bg-white border-t border-black/5 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about size, stock, delivery..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-black/10 rounded-lg text-xs font-medium text-[#161616] focus:outline-none focus:border-black/30"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-[#161616] text-white hover:bg-black transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
