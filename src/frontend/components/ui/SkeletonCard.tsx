"use client";

import React, { useId } from "react";

interface SkeletonCardProps {
  lines?: number;
  hasIcon?: boolean;
  hasAvatar?: boolean;
  className?: string;
}

/** FNV-1a hash of the React useId() string -> per-instance, SSR/hydration-stable seed. */
function hashString(str: string): number {
  if (typeof str !== "string" || !str) return 0;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic PRNG (mulberry32). Replaces Math.random() so the server and
 * client hydration render identical skeleton bar widths (Math.random() makes
 * them differ, which triggers React hydration mismatch errors).
 */
function seededRandom(seed: number): number {
  let t = seed >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

export default function SkeletonCard({
  lines = 3,
  hasIcon = false,
  hasAvatar = false,
  className = "",
}: SkeletonCardProps) {
  // useId() is stable across server and client rendering for the same tree
  // position, so each card gets its own fixed set of widths with no mismatch.
  const seed = hashString(useId());

  return (
    <div className={`card-premium glass-card p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        {hasIcon && (
          <div className="h-9 w-9 rounded-xl skeleton shrink-0" />
        )}
        {hasAvatar && (
          <div className="h-8 w-8 rounded-lg skeleton shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 rounded-md skeleton" />
          <div className="h-2.5 w-1/5 rounded-md skeleton opacity-60" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 rounded-md skeleton"
            style={{
              width: `${Math.round((60 + seededRandom(seed + i * 101) * 40) * 100) / 100}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
