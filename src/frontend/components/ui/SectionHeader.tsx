"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconBg = "bg-navy-500/10 dark:bg-navy-500/20",
  iconColor = "text-navy-600 dark:text-navy-400",
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className={`h-10 w-10 shrink-0 rounded-xl ${iconBg} flex items-center justify-center border border-black/5 dark:border-white/10 shadow-xs`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
