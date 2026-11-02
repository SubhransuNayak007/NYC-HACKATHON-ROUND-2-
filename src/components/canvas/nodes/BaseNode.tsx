"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Loader2, Clock, Trash2, Sliders } from "lucide-react";
import type { ExecutionNodeStatus, SafetyTier } from "../types";

export interface BaseNodeProps {
  id: string;
  selected?: boolean;
  status?: ExecutionNodeStatus;
  categoryTheme: {
    border: string;
    bg: string;
    text: string;
    glow: string;
    badge: string;
  };
  categoryLabel: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  sideEffect?: SafetyTier;
  durationMs?: number;
  errorMessage?: string;
  children?: React.ReactNode;
  handles?: React.ReactNode;
  onDelete?: () => void;
  onInspect?: () => void;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  selected = false,
  status = "IDLE",
  categoryTheme,
  categoryLabel,
  title,
  subtitle,
  icon,
  sideEffect,
  durationMs,
  errorMessage,
  children,
  handles,
  onDelete,
  onInspect,
}) => {
  // Border and glow styling based on execution status and selection
  let statusBorder = "border-zinc-700/80 hover:border-zinc-600";
  let statusGlow = "";
  let statusBadge = null;

  if (status === "RUNNING") {
    statusBorder = "border-orange-500 ring-2 ring-orange-500/30 animate-pulse";
    statusGlow = "shadow-[0_0_20px_rgba(249,115,22,0.35)]";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        RUNNING
      </span>
    );
  } else if (status === "SUCCESS") {
    statusBorder = "border-emerald-500 ring-1 ring-emerald-500/30";
    statusGlow = "shadow-[0_0_15px_rgba(16,185,129,0.25)]";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
        <CheckCircle2 className="w-2.5 h-2.5" />
        SUCCESS
      </span>
    );
  } else if (status === "FAILED") {
    statusBorder = "border-red-500 ring-2 ring-red-500/30";
    statusGlow = "shadow-[0_0_20px_rgba(239,68,68,0.35)]";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
        <AlertCircle className="w-2.5 h-2.5" />
        FAILED
      </span>
    );
  } else if (status === "QUEUED") {
    statusBorder = "border-amber-500/80 ring-1 ring-amber-500/20 animate-pulse";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400">
        QUEUED
      </span>
    );
  } else if (status === "SKIPPED") {
    statusBorder = "border-dashed border-zinc-600 opacity-60";
  }

  const selectionClass = selected
    ? "ring-2 ring-orange-500 border-orange-500 shadow-[0_0_25px_rgba(234,88,12,0.4)]"
    : "";

  return (
    <div
      className={`relative min-w-[240px] max-w-[300px] rounded-xl bg-zinc-900/95 backdrop-blur-md border text-zinc-100 shadow-xl transition-all duration-200 select-none ${statusBorder} ${statusGlow} ${selectionClass}`}
    >
      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-medium shadow-inner ${categoryTheme.bg} ${categoryTheme.text} ${categoryTheme.border} border`}
          >
            {icon}
          </div>
          <div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-bold ${categoryTheme.text}`}
            >
              {categoryLabel}
            </span>
            <h4 className="text-xs font-semibold leading-tight text-zinc-100 truncate max-w-[150px]">
              {title}
            </h4>
          </div>
        </div>

        {/* Status or Latency Badge */}
        <div className="flex items-center gap-1">
          {statusBadge}
          {durationMs !== undefined && status === "SUCCESS" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
              <Clock className="w-2.5 h-2.5 text-zinc-500" />
              {durationMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3 text-xs space-y-2">
        {subtitle && (
          <p className="text-[11px] text-zinc-400 font-medium truncate">{subtitle}</p>
        )}

        {children}

        {/* Safety Classification Pill */}
        {sideEffect && sideEffect !== "SAFE_READ" && (
          <div className="pt-1">
            <span
              className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                sideEffect === "EXTERNAL_COMMUNICATION"
                  ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                  : sideEffect === "FINANCIAL"
                  ? "bg-rose-950/40 text-rose-300 border-rose-800/60"
                  : sideEffect === "DESTRUCTIVE"
                  ? "bg-purple-950/40 text-purple-300 border-purple-800/60"
                  : "bg-blue-950/40 text-blue-300 border-blue-800/60"
              }`}
            >
              {sideEffect.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && status === "FAILED" && (
          <div className="p-2 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-[10px] font-mono leading-tight">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Quick Action Overlay (shows on hover / selection) */}
      <div className="absolute -top-3 right-2 flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 rounded-md px-1 py-0.5 shadow-md">
        {onInspect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
            className="p-1 hover:text-orange-400 text-zinc-400 transition"
            title="Inspect Parameters"
          >
            <Sliders className="w-3 h-3" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:text-red-400 text-zinc-400 transition"
            title="Delete Node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* React Flow Handles */}
      {handles}
    </div>
  );
};
