"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizes = {
    sm: { w: 40, h: 22, icon: 14, starSize: 1.5 },
    md: { w: 56, h: 30, icon: 16, starSize: 2 },
    lg: { w: 64, h: 36, icon: 20, starSize: 2.5 },
  };
  const s = sizes[size];

  if (!mounted) {
    return (
      <div
        role="switch"
        aria-checked={false}
        aria-label="Toggle theme"
        className={`theme-toggle theme-toggle--light ${className}`}
        style={{ width: s.w, height: s.h }}
      >
        <Sun className="theme-toggle__icon theme-toggle__icon--sun" style={{ width: s.icon, height: s.icon, color: "#E8B931" }} />
        <div className="theme-toggle__thumb" />
      </div>
    );
  }

  return (
    <div
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTheme(); } }}
      className={`theme-toggle ${isDark ? "theme-toggle--dark" : "theme-toggle--light"} ${className}`}
      style={{ width: s.w, height: s.h }}
    >
      {/* Stars (twinkle on the night-sky track in dark mode) */}
      <div className="theme-toggle__stars" aria-hidden="true">
        {[{ t: "20%", l: "16%" }, { t: "34%", l: "38%" }, { t: "14%", l: "58%" }, { t: "58%", l: "26%" }, { t: "46%", l: "68%" }].map((star, i) => (
          <span key={i} className="theme-toggle__star" style={{ top: star.t, left: star.l, animationDelay: `${i * 0.4}s`, width: s.starSize, height: s.starSize }} />
        ))}
      </div>
      {/* Sun icon (visible in light mode) */}
      <Sun className="theme-toggle__icon theme-toggle__icon--sun" style={{ width: s.icon, height: s.icon, color: "#E8B931" }} />
      {/* Moon icon (visible in dark mode) */}
      <Moon className="theme-toggle__icon theme-toggle__icon--moon" style={{ width: s.icon, height: s.icon, color: "#6B7FA8" }} />
      {/* Sliding thumb */}
      <div className="theme-toggle__thumb" />
    </div>
  );
}