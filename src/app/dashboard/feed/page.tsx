"use client";

import React from "react";
import LiveCommentFeed from "@/frontend/components/LiveCommentFeed";
import CommentDetailsPanel from "@/frontend/components/CommentDetailsPanel";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function FeedPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left h-full relative"
    >
      {/* Header section */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-coral-500/10 flex items-center justify-center">
            <Radio className="h-4 w-4 text-coral-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
              Live Comment <span className="gradient-text">Feed</span>
            </h1>
          </div>
        </div>
        <p className="text-sm text-ink-500 mt-1 ml-12">
          Monitor incoming comments on active channels. Tap comment cards to inspect histories or edit draft replies.
        </p>
        <div className="mt-3 ml-12 inline-flex flex-wrap items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>24/7 Autonomous Background Worker Polling Active</span>
          <span className="text-emerald-300">|</span>
          <span className="text-emerald-700 font-normal">Sub-Millisecond RAG Reply Generation</span>
        </div>
      </motion.div>

      {/* Main Comment List component */}
      <motion.div variants={item}>
        <LiveCommentFeed />
      </motion.div>

      {/* Slide-out Comment Details drawer panel */}
      <CommentDetailsPanel />
    </motion.div>
  );
}
