"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, MessageSquare, Zap } from "lucide-react";

interface QuickReplyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function MySamparkLogo({ className = "", size = "md", href = "/" }: QuickReplyLogoProps) {
  const iconSizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Orange Coral Rounded Icon with Speech Spark */}
      <div
        className={`${iconSizeClasses[size]} rounded-2xl bg-[#EE7D60] text-white flex items-center justify-center shadow-xs shrink-0 font-bold transition-transform group-hover:scale-105`}
      >
        <Zap className="w-4 h-4 fill-white text-white" />
      </div>
      <span className={`font-black tracking-tight text-[#161616] ${textSizeClasses[size]}`}>
        Quick<span className="text-[#EE7D60]">Reply</span>
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Export as QuickReplyLogo as well
export const QuickReplyLogo = MySamparkLogo;
