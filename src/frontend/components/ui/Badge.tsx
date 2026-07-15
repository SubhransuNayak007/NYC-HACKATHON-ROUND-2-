"use client";

import React from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";

type BadgeVariant =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "muted"
  | "purple"
  | "volt";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  icon?: LucideIcon;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; iconColor: string }> = {
  success: { bg: "bg-mint-50", text: "text-mint-600", border: "border-mint-200/60", iconColor: "text-mint-500" },
  info: { bg: "bg-navy-500/8", text: "text-navy-600", border: "border-navy-200/30", iconColor: "text-navy-500" },
  warning: { bg: "bg-volt-50", text: "text-volt-700", border: "border-volt-200/60", iconColor: "text-volt-500" },
  error: { bg: "bg-coral-50", text: "text-coral-600", border: "border-coral-200/60", iconColor: "text-coral-500" },
  muted: { bg: "bg-surface-100", text: "text-ink-500", border: "border-surface-200/60", iconColor: "text-ink-400" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200/60", iconColor: "text-purple-500" },
  volt: { bg: "bg-volt-50", text: "text-volt-700", border: "border-volt-200/60", iconColor: "text-volt-500" },
};

const defaultIcons: Record<BadgeVariant, LucideIcon> = {
  success: CheckCircle,
  info: Clock,
  warning: AlertTriangle,
  error: XCircle,
  muted: MinusCircle,
  purple: Clock,
  volt: Clock,
};

export default function Badge({
  variant,
  children,
  icon: Icon,
  size = "sm",
  pulse = false,
  className = "",
}: BadgeProps) {
  const styles = variantStyles[variant];
  const ResolvedIcon = Icon || defaultIcons[variant];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.bg.replace("/8", "").replace("bg-", "bg-")}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.iconColor}`} />
        </span>
      )}
      <ResolvedIcon className={`shrink-0 ${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} ${styles.iconColor}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}
