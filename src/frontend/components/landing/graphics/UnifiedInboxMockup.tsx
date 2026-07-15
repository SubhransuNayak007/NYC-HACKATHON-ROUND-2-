"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Zap,
  Bot,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

interface UnifiedInboxMockupProps {
  className?: string;
}

interface ConversationItem {
  id: string;
  name: string;
  avatar: string;
  channel: "instagram" | "whatsapp" | "telegram" | "linkedin" | "twitter";
  handle: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  sentiment: {
    label: string;
    color: string;
    bg: string;
    confidence: number;
  };
  thread: {
    sender: "customer" | "ai" | "agent";
    text: string;
    time: string;
  }[];
  aiDraft: string;
}

const CONVERSATIONS: ConversationItem[] = [
  {
    id: "conv-1",
    name: "Priya Menon",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    channel: "whatsapp",
    handle: "+91 98450 12890",
    lastMessage: "Need 15 units of the Linen Shirt for a corporate event by Friday. Do you offer bulk discounts?",
    time: "Just now",
    unreadCount: 2,
    sentiment: {
      label: "VIP Bulk Buyer",
      color: "text-purple-700",
      bg: "bg-purple-100",
      confidence: 98,
    },
    thread: [
      { sender: "customer", text: "Hi! Loved your Linen Summer Collection.", time: "10:14 AM" },
      { sender: "customer", text: "Need 15 units of the Linen Shirt for a corporate event by Friday. Do you offer bulk discounts?", time: "10:15 AM" },
    ],
    aiDraft: "Hello Priya! Absolutely 🎉 For 15+ units, we apply our Tier-1 Corporate 22% discount + complimentary express courier arriving Thursday. Would you like me to send the digital invoice and size assortment sheet right now?",
  },
  {
    id: "conv-2",
    name: "Aditya Roy",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    channel: "instagram",
    handle: "@aditya_roy99",
    lastMessage: "Is this jacket waterproof in heavy rain? Looking to buy for Ladakh trip.",
    time: "2m ago",
    unreadCount: 1,
    sentiment: {
      label: "High Purchase Intent",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      confidence: 96,
    },
    thread: [
      { sender: "customer", text: "Hey! Saw your reel on the Biker Jacket.", time: "10:12 AM" },
      { sender: "customer", text: "Is this jacket waterproof in heavy rain? Looking to buy for Ladakh trip.", time: "10:13 AM" },
    ],
    aiDraft: "Hey Aditya! 🏔️ Yes, it features an internal seam-sealed waterproof barrier rated up to 10,000mm hydrostatic head — tested and battle-proven for Ladakh conditions. Use code ADVENTURE10 for ₹500 off at checkout!",
  },
  {
    id: "conv-3",
    name: "Dr. Sameer Sen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    channel: "telegram",
    handle: "@dr_sameer_tele",
    lastMessage: "Tracking for order #QR-9821 please",
    time: "5m ago",
    unreadCount: 0,
    sentiment: {
      label: "Tracking Enquiry",
      color: "text-blue-700",
      bg: "bg-blue-100",
      confidence: 99,
    },
    thread: [
      { sender: "customer", text: "Tracking for order #QR-9821 please", time: "10:09 AM" },
      { sender: "ai", text: "Hi Dr. Sameer! Your order #QR-9821 was dispatched via BlueDart Air (AWB: 489201948). It is out for delivery today before 2:00 PM 📦", time: "10:09 AM" },
    ],
    aiDraft: "Your delivery OTP is 4921. Our courier partner Suresh (+91 98111-22334) will contact you shortly.",
  },
  {
    id: "conv-4",
    name: "Meera Kapoor",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    channel: "linkedin",
    handle: "Meera Kapoor · VP Brand",
    lastMessage: "We'd love to partner for an influencer collaboration campaign next month.",
    time: "12m ago",
    unreadCount: 1,
    sentiment: {
      label: "B2B Partnership",
      color: "text-indigo-700",
      bg: "bg-indigo-100",
      confidence: 94,
    },
    thread: [
      { sender: "customer", text: "Hi QuickReply team, congratulations on the new launch!", time: "10:01 AM" },
      { sender: "customer", text: "We'd love to partner for an influencer collaboration campaign next month.", time: "10:03 AM" },
    ],
    aiDraft: "Hi Meera! Thanks for reaching out. We would love to collaborate. I have attached our creator partner deck and calendar link to schedule a 15-minute alignment sync with our brand lead.",
  },
  {
    id: "conv-5",
    name: "Kabir Mehta",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80",
    channel: "twitter",
    handle: "@kabirmehta",
    lastMessage: "What is your return policy if size doesn't fit?",
    time: "18m ago",
    unreadCount: 0,
    sentiment: {
      label: "Sizing & Returns",
      color: "text-amber-700",
      bg: "bg-amber-100",
      confidence: 97,
    },
    thread: [
      { sender: "customer", text: "What is your return policy if size doesn't fit?", time: "9:55 AM" },
      { sender: "ai", text: "Hi Kabir! We offer hassle-free 7-day doorstep size exchanges with free reverse pickup. You can exchange sizes directly in 1 click via our portal.", time: "9:55 AM" },
    ],
    aiDraft: "Feel free to check our sizing guide or order two sizes to try on at home.",
  },
];

export function UnifiedInboxMockup({ className = "" }: UnifiedInboxMockupProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedConvId, setSelectedConvId] = useState<string>("conv-1");
  const [autopilotMode, setAutopilotMode] = useState<boolean>(true);
  const [sentStatus, setSentStatus] = useState<boolean>(false);

  const filteredConversations =
    selectedChannel === "all"
      ? CONVERSATIONS
      : CONVERSATIONS.filter((c) => c.channel === selectedChannel);

  const activeConv =
    CONVERSATIONS.find((c) => c.id === selectedConvId) || CONVERSATIONS[0];

  const handleSendReply = () => {
    setSentStatus(true);
    setTimeout(() => setSentStatus(false), 3000);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <div className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[9px] font-bold">W</div>;
      case "instagram":
        return <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />;
      case "telegram":
        return <Send className="w-3.5 h-3.5 text-[#229ED9]" />;
      case "linkedin":
        return <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />;
      case "twitter":
        return <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide flex items-center gap-2">
              <span>Unified Multi-Channel Command Center</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              5 Connected Inboxes · 0 Missed Customer Inquiries
            </p>
          </div>
        </div>

        {/* Autopilot Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-black/5">
          <Bot className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-[11px] font-bold text-slate-700">AI Autopilot</span>
          <button
            type="button"
            onClick={() => setAutopilotMode(!autopilotMode)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
              autopilotMode ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-black/5 text-xs">
        <button
          type="button"
          onClick={() => setSelectedChannel("all")}
          className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
            selectedChannel === "all"
              ? "bg-[#161616] text-white shadow-xs"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Channels (5)
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("whatsapp")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
            selectedChannel === "whatsapp"
              ? "bg-[#25D366] text-white shadow-xs"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          WhatsApp (1)
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("instagram")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
            selectedChannel === "instagram"
              ? "bg-[#E1306C] text-white shadow-xs"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Instagram (1)
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("telegram")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
            selectedChannel === "telegram"
              ? "bg-[#229ED9] text-white shadow-xs"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Telegram (1)
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("linkedin")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
            selectedChannel === "linkedin"
              ? "bg-[#0A66C2] text-white shadow-xs"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          LinkedIn (1)
        </button>
      </div>

      {/* Main Grid: Split List + Detail Chat Window */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mt-3.5">
        {/* Left Column (5 cols): Conversation List */}
        <div className="md:col-span-5 space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredConversations.map((conv) => {
            const isSelected = activeConv.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? "bg-[#FAF8F5] border-[#EE7D60] ring-1 ring-[#EE7D60]/30 shadow-xs"
                    : "bg-white border-black/5 hover:border-black/15"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={conv.avatar}
                        alt={conv.name}
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-full object-cover border border-black/10"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full shadow-2xs">
                        {getChannelIcon(conv.channel)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-[#161616] truncate leading-none">
                        {conv.name}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                        {conv.handle}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {conv.time}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full bg-[#EE7D60] text-white text-[9px] font-black">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                  {conv.lastMessage}
                </p>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${conv.sentiment.bg} ${conv.sentiment.color}`}>
                    {conv.sentiment.label}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {conv.sentiment.confidence}% Confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (7 cols): Active Conversation & Generative Reply Pane */}
        <div className="md:col-span-7 bg-[#FAF8F5] p-3.5 rounded-xl border border-black/5 flex flex-col justify-between space-y-3">
          {/* Active Contact Header */}
          <div className="flex items-center justify-between pb-2 border-b border-black/5">
            <div className="flex items-center gap-2.5">
              <img
                src={activeConv.avatar}
                alt={activeConv.name}
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-full object-cover border border-black/10 shrink-0"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-black text-[#161616]">{activeConv.name}</h5>
                  <span className="text-[10px] font-mono text-slate-500">{activeConv.handle}</span>
                </div>
                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${activeConv.sentiment.bg} ${activeConv.sentiment.color}`}>
                  {activeConv.sentiment.label}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ⚡ 450ms turnaround
            </span>
          </div>

          {/* Chat Message Thread */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-xs">
            {activeConv.thread.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "customer" ? "items-start" : "items-end"}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] text-xs font-medium ${
                    msg.sender === "customer"
                      ? "bg-white text-[#161616] border border-black/5 shadow-2xs"
                      : "bg-[#161616] text-white"
                  }`}
                >
                  <p className="leading-snug">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">
                  {msg.time} {msg.sender === "ai" && "· AI Handled"}
                </span>
              </div>
            ))}
          </div>

          {/* AI Generative Draft Pane */}
          <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
                <span>AI Suggested Grounded Response:</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                Confidence: 99.4%
              </span>
            </div>

            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
              &quot;{activeConv.aiDraft}&quot;
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified vs Shopify Catalog &amp; Policies
              </span>
              <button
                type="button"
                onClick={handleSendReply}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  sentStatus
                    ? "bg-emerald-600 text-white"
                    : "bg-[#161616] text-white hover:bg-black"
                }`}
              >
                {sentStatus ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Sent!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 text-[#EE7D60]" />
                    <span>Approve &amp; Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
