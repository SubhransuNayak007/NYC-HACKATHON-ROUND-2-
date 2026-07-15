"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Send,
  Sparkles,
  CheckCircle2,
  Share2,
  Layers,
  ChevronRight,
  RefreshCw,
  Plus,
} from "lucide-react";

interface SchedulerCalendarMockupProps {
  className?: string;
}

interface ScheduledPost {
  id: string;
  day: string;
  date: string;
  isToday?: boolean;
  time: string;
  channel: "instagram" | "linkedin" | "twitter" | "telegram" | "facebook";
  title: string;
  image: string;
  badge: string;
  status: "ready" | "scheduled" | "draft";
  captionPreview: {
    instagram: string;
    linkedin: string;
    twitter: string;
  };
}

const SCHEDULE_DAYS: ScheduledPost[] = [
  {
    id: "post-1",
    day: "MON",
    date: "AUG 17",
    isToday: true,
    time: "4:00 PM",
    channel: "instagram",
    title: "Autumn Capsule Drop Teaser Reel",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80",
    badge: "Peak Engagement (94%)",
    status: "ready",
    captionPreview: {
      instagram: "The Autumn Minimalist capsule is officially here 🍂 Comment 'AUTUMN' to get the secret VIP early access link sent right to your DM! ✨ #StreetwearIndia #CapsuleWardrobe",
      linkedin: "Why DTC fashion brands must rethink seasonal release cadences: analyzing our 34% higher retention strategy.",
      twitter: "Autumn capsule drops in 2 hours. Comment 'AUTUMN' below for the direct VIP checkout link 🧵👇",
    },
  },
  {
    id: "post-2",
    day: "TUE",
    date: "AUG 18",
    time: "9:30 AM",
    channel: "linkedin",
    title: "DTC Scaled to ₹1Cr/mo Case Study",
    image: "https://images.unsplash.com/photo-1557838923-2985c318be48?w=400&auto=format&fit=crop&q=80",
    badge: "B2B Morning Slot",
    status: "scheduled",
    captionPreview: {
      instagram: "Behind the scenes of our 10x scale journey 🚀 Link in bio!",
      linkedin: "How automating 10,000+ customer comment interactions boosted our checkout conversion rate from 1.2% to 4.8% without hiring additional support staff. Key learnings below 📈",
      twitter: "How we turned Instagram comments into a ₹1Cr/mo revenue engine using zero-latency AI automations 🧵",
    },
  },
  {
    id: "post-3",
    day: "WED",
    date: "AUG 19",
    time: "6:15 PM",
    channel: "twitter",
    title: "3 Mistakes Brands Make in Customer DMs",
    image: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=400&auto=format&fit=crop&q=80",
    badge: "Thread Viral Hook",
    status: "scheduled",
    captionPreview: {
      instagram: "Are you losing buyers in your DMs? Check our 3 rules 👉",
      linkedin: "The latency cost of customer support: Why waiting 4 hours for a DM response reduces closing likelihood by 80%.",
      twitter: "3 mistakes killing your Instagram DM sales:\n1. 'Link in bio'\n2. Generic 'Please check DM'\n3. 4-hour delay\n\nHere is how to fix them today 🧵👇",
    },
  },
  {
    id: "post-4",
    day: "THU",
    date: "AUG 20",
    time: "1:00 PM",
    channel: "telegram",
    title: "Flash Sale 24h Community Alert",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80",
    badge: "VIP Broadcast",
    status: "ready",
    captionPreview: {
      instagram: "Secret 24h Telegram drop live now 🔥",
      linkedin: "Community-led commerce insights from our 20,000 member Telegram broadcast.",
      twitter: "24h Telegram flash sale is live for VIP members only. Code: FLASH20 ⚡",
    },
  },
  {
    id: "post-5",
    day: "FRI",
    date: "AUG 21",
    time: "7:30 PM",
    channel: "instagram",
    title: "Customer Styling Showcase & Tag UGC",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&auto=format&fit=crop&q=80",
    badge: "Weekend Prime",
    status: "ready",
    captionPreview: {
      instagram: "How our community is styling the classic oversized jacket this weekend 🌟 Tag @yourbrand to be featured next!",
      linkedin: "Building sustainable user-generated content flywheels for consumer brands.",
      twitter: "Friday styling roundup: which fit is your favorite? 1, 2, or 3? 👇",
    },
  },
  {
    id: "post-6",
    day: "SAT",
    date: "AUG 22",
    time: "11:00 AM",
    channel: "facebook",
    title: "Weekend Weekend Lookbook Album",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&auto=format&fit=crop&q=80",
    badge: "Catalog Album",
    status: "scheduled",
    captionPreview: {
      instagram: "Swipe through our weekend curation ➡️",
      linkedin: "Omnichannel inventory sync in action.",
      twitter: "Full weekend catalog lookbook is up on Facebook & Web 📸",
    },
  },
  {
    id: "post-7",
    day: "SUN",
    date: "AUG 23",
    time: "8:00 PM",
    channel: "linkedin",
    title: "Weekly Founder Retrospective",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80",
    badge: "Thought Leadership",
    status: "draft",
    captionPreview: {
      instagram: "Weekly wrap up! See you tomorrow 💫",
      linkedin: "Week in review: 14,200 automated comments handled, 0 customer wait-times, and ₹4.2L in direct DM attributed revenue. What we learned this week.",
      twitter: "Week in review: 14.2k comments automated, ₹4.2L in sales. Scaling without burnout 🚀",
    },
  },
];

export function SchedulerCalendarMockup({ className = "" }: SchedulerCalendarMockupProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [previewChannel, setPreviewChannel] = useState<"instagram" | "linkedin" | "twitter">("instagram");

  const activePost = SCHEDULE_DAYS[selectedDayIndex] || SCHEDULE_DAYS[0];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "instagram":
        return <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />;
      case "linkedin":
        return <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />;
      case "twitter":
        return <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />;
      case "telegram":
        return <Send className="w-3.5 h-3.5 text-[#229ED9]" />;
      case "facebook":
        return <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide">
              Multi-Channel Post Scheduler &amp; Visual Calendar
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Compose Once · AI Tailors Copy &amp; Format for 5 Networks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#EE7D60]" />
            AI Slot Optimizer Active
          </span>
        </div>
      </div>

      {/* 7-Day Visual Calendar Strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SCHEDULE_DAYS.map((post, idx) => {
          const isSelected = selectedDayIndex === idx;
          return (
            <div
              key={post.id}
              onClick={() => setSelectedDayIndex(idx)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? "bg-[#FAF8F5] border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                  : "bg-white border-black/5 hover:border-black/20"
              }`}
            >
              {/* Day & Date Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-black ${post.isToday ? "text-[#EE7D60]" : "text-[#161616]"}`}>
                    {post.day}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {post.date}
                  </span>
                </div>
                {getChannelIcon(post.channel)}
              </div>

              {/* Post Thumbnail */}
              <div className="relative h-18 w-full rounded-lg overflow-hidden bg-slate-100 border border-black/5">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/75 backdrop-blur-xs text-white text-[8px] font-mono rounded">
                  {post.time}
                </span>
              </div>

              {/* Post Title */}
              <p className="text-[10px] font-bold text-[#161616] truncate leading-snug">
                {post.title}
              </p>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-[8px] font-bold pt-0.5">
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {post.status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Deep Dive: AI Multi-Network Copy Adaptation */}
      <div className="mt-4 bg-[#FAF8F5] p-4 rounded-xl border border-black/5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
              {activePost.day} {activePost.date} · {activePost.time}
            </span>
            <h5 className="text-xs font-black text-[#161616]">
              {activePost.title}
            </h5>
          </div>

          {/* Network Switcher for Copy Adaptation */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-black/5">
            <button
              type="button"
              onClick={() => setPreviewChannel("instagram")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                previewChannel === "instagram"
                  ? "bg-[#E1306C] text-white"
                  : "text-slate-600 hover:text-[#161616]"
              }`}
            >
              <Instagram className="w-3 h-3" />
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setPreviewChannel("linkedin")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                previewChannel === "linkedin"
                  ? "bg-[#0A66C2] text-white"
                  : "text-slate-600 hover:text-[#161616]"
              }`}
            >
              <Linkedin className="w-3 h-3" />
              LinkedIn
            </button>
            <button
              type="button"
              onClick={() => setPreviewChannel("twitter")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                previewChannel === "twitter"
                  ? "bg-[#1DA1F2] text-white"
                  : "text-slate-600 hover:text-[#161616]"
              }`}
            >
              <Twitter className="w-3 h-3" />
              X (Twitter)
            </button>
          </div>
        </div>

        {/* Live Adaptation Preview Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-3">
            <img
              src={activePost.image}
              alt={activePost.title}
              loading="lazy"
              decoding="async"
              className="w-full h-28 object-cover rounded-xl border border-black/10 shadow-xs"
            />
          </div>
          <div className="md:col-span-9 bg-white p-3 rounded-xl border border-black/5 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#EE7D60]" />
                Auto-Adapted Copy for {previewChannel.toUpperCase()}:
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                Optimal Length &amp; Emojis Applied
              </span>
            </div>
            <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {activePost.captionPreview[previewChannel]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
