"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/frontend/store";
import {
  Menu,
  Search,
  Plus,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import ThemeToggle from "@/frontend/components/ThemeToggle";

export default function Header() {
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const showToast = useUIStore((state) => state.showToast);
  const router = useRouter();
  const pathname = usePathname();

  const refreshTrigger = useUIStore((state) => state.refreshTrigger);
  const [usage, setUsage] = useState<{ used: number; limit: number | null; tier: string; isUnlimited: boolean; remaining: number | null } | null>(null);
  const { isDark, toggleTheme } = useTheme();

  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/feed": "Live Feed",
    "/dashboard/feed/review": "Review Queue",
    "/dashboard/videos": "Video Selection",
    "/dashboard/rules": "Rule Builder",
    "/dashboard/rules/new": "Create Rule",
    "/dashboard/automations": "Automations",
    "/dashboard/channels": "Connected Platforms",
    "/dashboard/team": "Team",
    "/dashboard/notifications": "Notifications",
    "/dashboard/faqs": "FAQ Knowledge Base",
    "/dashboard/ai": "AI Insights",
    "/dashboard/intelligence": "Business Intelligence Engine",
    "/dashboard/analytics": "Analytics",
    "/dashboard/settings": "Settings",
    "/dashboard/settings/team": "Team Management",
    "/dashboard/status": "System Status",
  };
  const pageTitle = pageTitleMap[pathname] || "Dashboard";

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage/today");
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (err) {
        console.error("Error fetching usage:", err);
      }
    }
    fetchUsage();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  const usagePercent = usage && usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <header className="sticky top-0 z-30">
      <div className="glass-strong border-b border-surface-200/60">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2 text-ink-500 hover:bg-surface-100 hover:text-ink-800 active:scale-95 transition-all md:hidden focus-ring"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-ink-800 tracking-tight">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Center: Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="spotlight-search hidden md:flex max-w-[420px] w-full items-center justify-between gap-3 rounded-2xl border border-surface-200/80 bg-surface-0/60 px-4 py-2.5 text-left text-xs text-ink-400 hover:bg-surface-0 hover:border-navy-200/40 hover:shadow-glass transition-all duration-300 cursor-pointer group focus-ring"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="h-4 w-4 shrink-0 text-ink-400 group-hover:text-navy-500 transition-colors" />
              <span className="truncate">Search rules, templates, logs...</span>
            </div>
            <kbd className="hidden rounded-lg bg-surface-100 px-2 py-1 text-[10px] font-bold text-ink-400 border border-surface-200/80 sm:inline-block font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Right: Usage & Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Daily Usage */}
            {usage && !usage.isUnlimited && usage.limit && (
              <div className="hidden sm:flex items-center gap-2.5" title={`${usage.used} of ${usage.limit} auto-replies used today`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-500">
                    Replies
                  </span>
                  <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        usagePercent >= 100 ? "bg-coral-500" :
                        usagePercent >= 70 ? "bg-volt-600" :
                        "bg-gradient-to-r from-navy-500 to-navy-600"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${
                    usagePercent >= 100 ? "text-coral-600" :
                    usagePercent >= 70 ? "text-volt-700" :
                    "text-ink-700"
                  }`}>
                    {usage.used}/{usage.limit}
                  </span>
                </div>
              </div>
            )}

            {/* Premium Theme Toggle — Apple Liquid-Glass pill switch */}
            <ThemeToggle size="md" />

            {/* Connect Channel */}
            <button
              onClick={() => {
                router.push("/dashboard/channels");
                showToast("Opening channels page", "info");
              }}
              className="btn-primary inline-flex items-center gap-1.5 text-xs !py-2 !px-4 !rounded-xl cursor-pointer focus-ring spring-press"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-semibold">Connect Channel</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
