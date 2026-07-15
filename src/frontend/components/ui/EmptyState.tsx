"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  iconColor?: string;
  iconBg?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = "text-ink-400",
  iconBg = "bg-surface-100",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium glass-card flex flex-col items-center justify-center p-12 text-center"
    >
      <div className={`h-14 w-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <h3 className="font-display text-base font-bold text-ink-800 mb-1.5">{title}</h3>
      <p className="text-sm text-ink-500 max-w-sm leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-5 text-sm"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
