"use client";

/**
 * ============================================================
 *  QuickReply — Semantic Channel Node
 *  src/frontend/components/auth/message-machine/nodes/SemanticChannelNode.tsx
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { MM_COLORS } from "../tokens";

export interface ChannelNodeData {
  id: string;
  name: string;
  label: string;
  angle: number;
  distance: number;
  color: string;
  leadTime: string;
}

interface SemanticChannelNodeProps {
  channel: ChannelNodeData;
  isSelected: boolean;
  onHover: (id: string) => void;
  onUnhover: () => void;
  onClick: (id: string) => void;
  contractionProgress: number; // 0.0 -> 1.0
}

export function SemanticChannelNode({
  channel,
  isSelected,
  onHover,
  onUnhover,
  onClick,
  contractionProgress,
}: SemanticChannelNodeProps) {
  // Calculate polar position offset from center
  const shrink = 1.0 - contractionProgress * 0.9;
  const x = Math.cos(channel.angle) * channel.distance * shrink;
  const y = Math.sin(channel.angle) * (channel.distance * 0.75) * shrink;

  return (
    <motion.div
      style={{
        transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
        opacity: Math.max(0, 1.0 - contractionProgress * 1.5),
        pointerEvents: contractionProgress > 0.3 ? "none" : "auto",
      }}
      className="absolute top-1/2 left-1/2 z-20 select-none"
      onMouseEnter={() => onHover(channel.id)}
      onMouseLeave={onUnhover}
      onClick={() => onClick(channel.id)}
      data-interactive="true"
    >
      <div className="flex flex-col items-center group cursor-pointer">
        {/* Node Signal Point */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
              isSelected
                ? "bg-[#F3C515] border-[#111111] scale-125 shadow-sm"
                : "bg-white border-[#111111] group-hover:scale-110"
            }`}
          />
          {/* Subtle pulse ring on hover */}
          {isSelected && (
            <span className="absolute -inset-1 rounded-full border border-[#F3C515] animate-ping pointer-events-none" />
          )}
        </div>

        {/* Minimal Editorial Text Label */}
        <div className="mt-1.5 flex flex-col items-center text-center">
          <span className="font-mono text-[11px] font-bold tracking-wider text-[#111111] group-hover:text-[#F3C515] transition-colors">
            {channel.name}
          </span>
          <span className="text-[9.5px] font-mono text-[#6C6C65] tracking-tight whitespace-nowrap opacity-80 group-hover:opacity-100">
            {channel.label}
          </span>
          {isSelected && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[9px] font-mono text-[#218A61] font-semibold mt-0.5"
            >
              ⚡ {channel.leadTime} LATENCY
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
