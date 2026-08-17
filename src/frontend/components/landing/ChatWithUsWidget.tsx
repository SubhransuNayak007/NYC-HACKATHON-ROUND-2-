"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send, Bot } from "lucide-react";

export function ChatWithUsWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    {
      sender: "ai",
      text: "Hi there! 👋 I'm your QuickReply assistant. Ask me anything about our automated replies, multi-channel scheduling, pricing, or catalog integrations!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/verify") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/onboarding");

  // Conditional early return AFTER all hooks have executed unconditionally
  if (isAuthPage) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg = { sender: "user" as const, text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // Dynamic AI reply simulation
    setTimeout(() => {
      let reply = "QuickReply connects directly to your product catalog to answer prices, availability, and delivery details automatically 24/7 across Instagram, WhatsApp, Telegram, LinkedIn, Facebook, and X.";
      const lower = text.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("credit") || lower.includes("plan")) {
        reply = "QuickReply runs on transparent credit pricing: 1 credit = 1 AI reply. Manual replies in the unified inbox are 100% free! Plans start at ₹0 (Free starter with 100 credits), Growth ₹1,100, Professional ₹1,599 (Most Popular), and Business ₹3,199.";
      } else if (lower.includes("instagram") || lower.includes("dm") || lower.includes("comment")) {
        reply = "When someone comments on your Instagram posts or Reels with trigger words like 'price' or 'link', QuickReply instantly replies to the comment publicly and sends them a personalized DM with live catalog checkout links.";
      } else if (lower.includes("whatsapp")) {
        reply = "QuickReply integrates native WhatsApp Cloud API, allowing 24/7 automatic catalog search, order placement, and live customer support.";
      } else if (lower.includes("telegram") || lower.includes("linkedin") || lower.includes("x") || lower.includes("twitter")) {
        reply = "QuickReply has official native API adapters for Telegram Bot API, LinkedIn REST API, and X API v2 for unified multi-channel publishing and auto-replies.";
      }

      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9995] font-sans">
      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="mb-3 w-[min(360px,calc(100vw-2rem))] bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col h-[460px] animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#161616] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EE7D60] text-white flex items-center justify-center font-bold text-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">QuickReply Assistant</div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online · Instant Answers</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5] text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#EE7D60] text-white rounded-tr-xs"
                      : "bg-white text-[#161616] rounded-tl-xs shadow-2xs border border-black/5"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-white text-slate-400 rounded-tl-xs shadow-2xs border border-black/5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white border-t border-black/5 flex gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSend("How does credit pricing work?")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer"
            >
              Pricing info?
            </button>
            <button
              onClick={() => handleSend("How does Instagram Auto DM work?")}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer"
            >
              Auto DM info?
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-black/5 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-black/10 text-xs text-[#161616] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EE7D60]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-[#EE7D60] text-white flex items-center justify-center hover:bg-[#D96549] transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Pill Trigger + Orange Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#161616] text-xs font-bold shadow-md hover:bg-slate-50 border border-black/5 transition-all cursor-pointer select-none"
        >
          <span>Chat with us</span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-13 h-13 rounded-2xl bg-[#EE7D60] hover:bg-[#D96549] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Chat with us"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageSquare className="w-6 h-6 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
}
