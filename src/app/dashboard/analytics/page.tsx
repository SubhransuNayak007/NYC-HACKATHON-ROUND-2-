"use client";

import React, { useState } from "react";
import { useUIStore } from "@/frontend/store";
import AnalyticsCharts from "@/frontend/components/AnalyticsCharts";
import SectionHeader from "@/frontend/components/ui/SectionHeader";
import { Calendar, ChevronDown, Download, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AnalyticsPage() {
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const [dateRange, setDateRange] = useState("30d");

  const handleRangeChange = (val: string) => {
    setDateRange(val);
    showToast(`Analytics updated for past ${val === "7d" ? "7 days" : val === "90d" ? "90 days" : "30 days"}`, "success");
    triggerRefresh();
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader
          icon={BarChart3}
          title="Analytics & Insights"
          subtitle="Audit automatic reply counts, match accuracy, saved time, and keyword frequencies."
        />

        {/* Date Selector and Download controls */}
        <motion.div variants={item} className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative inline-flex items-center rounded-xl bg-surface-0 border border-surface-200/80 px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-card hover:shadow-card-hover transition-all cursor-pointer focus-ring">
            <Calendar className="h-4 w-4 text-navy-500 mr-2 shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="bg-transparent outline-none pr-6 cursor-pointer appearance-none w-full text-ink-700"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <ChevronDown className="h-4 w-4 text-ink-400 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={() => showToast("Exporting report as CSV...", "success")}
            className="btn-glass inline-flex items-center gap-1.5 !rounded-xl text-xs !py-2 !px-4 focus-ring"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Main Analytics charts and metrics component */}
      <motion.div variants={item}>
        <AnalyticsCharts />
      </motion.div>
    </motion.div>
  );
}
