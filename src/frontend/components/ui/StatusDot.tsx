"use client";

import React from "react";

type StatusColor = "mint" | "coral" | "volt" | "navy" | "muted";

interface StatusDotProps {
  color: StatusColor;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const colorMap: Record<StatusColor, string> = {
  mint: "bg-mint-500",
  coral: "bg-coral-500",
  volt: "bg-volt-500",
  navy: "bg-navy-500",
  muted: "bg-ink-400",
};

const glowMap: Record<StatusColor, string> = {
  mint: "rgba(16, 185, 129, 0.55)",
  coral: "rgba(224, 0, 43, 0.5)",
  volt: "rgba(255, 214, 10, 0.6)",
  navy: "rgba(0, 56, 255, 0.55)",
  muted: "rgba(148, 163, 184, 0.4)",
};

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export default function StatusDot({
  color,
  size = "md",
  pulse = false,
  className = "",
}: StatusDotProps) {
  if (pulse) {
    return (
      <span className={`relative inline-flex ${sizeMap[size]} ${className}`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorMap[color]}`} />
        <span
          className={`relative inline-flex rounded-full ${sizeMap[size]} ${colorMap[color]}`}
          style={{ boxShadow: `0 0 8px ${glowMap[color]}, 0 0 20px ${glowMap[color]}` }}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex rounded-full ${sizeMap[size]} ${colorMap[color]} ${className}`} />
  );
}
