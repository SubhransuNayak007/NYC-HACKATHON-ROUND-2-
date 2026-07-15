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
  iconBg = "bg-navy-500/8",
  iconColor = "text-navy-500",
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
            {title.split(" ").map((word, i) => {
              const isLast = i === title.split(" ").length - 1;
              return isLast ? (
                <span key={i} className="gradient-text">{word} </span>
              ) : (
                <span key={i}>{word} </span>
              );
            })}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
