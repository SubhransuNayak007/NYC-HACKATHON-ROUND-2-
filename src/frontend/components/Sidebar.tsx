"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/frontend/store";
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  MessageCircle,
  Sliders,
  BarChart3,
  LogOut,
  ChevronLeft,
  Users,
  Bell,
  Bot,
  Globe,
  Play,
  Brain,
  Zap,
  Sparkles,
  Telescope,
  X as CloseIcon,
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  status: "active" | "quota_error";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeChannelId = useUIStore((state) => state.activeChannelId);
  const setActiveChannelId = useUIStore((state) => state.setActiveChannelId);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const showToast = useUIStore((state) => state.showToast);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [userSession, setUserSession] = useState<any>(null);

  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  useEffect(() => {
    async function fetchChannelsAndSettings() {
      try {
        const [chRes, setRes] = await Promise.all([
          fetch("/api/channels"),
          fetch("/api/settings"),
        ]);
        if (chRes.ok) {
          const data = await chRes.json();
          setChannels(data);
        }
        if (setRes.ok) {
          const data = await setRes.json();
          setWorkspaceName(data.workspace?.name || "My Workspace");
          setUserSession(data.userSession || null);
        }
      } catch (err) {
        console.error("Error fetching sidebar data:", err);
      }
    }
    fetchChannelsAndSettings();
  }, [refreshTrigger]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Live Feed", href: "/dashboard/feed", icon: MessageSquare },
    { name: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle },
    { name: "Videos", href: "/dashboard/videos", icon: Play },
    { name: "Rule Builder", href: "/dashboard/rules", icon: Sliders },
    { name: "Automations", href: "/dashboard/automations", icon: Zap },
    { name: "Platforms", href: "/dashboard/channels", icon: Globe },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { name: "FAQ Knowledge Base", href: "/dashboard/faqs", icon: Brain },
    { name: "AI Insights", href: "/dashboard/ai", icon: Bot },
    { name: "Intelligence", href: "/dashboard/intelligence", icon: Telescope },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // Mobile drawer shows full labels; desktop/tablet adapts to collapsed state
  const isCompact = !sidebarOpen && sidebarCollapsed;
  const isDesktopCompact = sidebarCollapsed;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-xs md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* App Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${sidebarOpen
            ? "translate-x-0 w-[280px] max-w-[85vw] shadow-2xl"
            : sidebarCollapsed
              ? "-translate-x-full md:translate-x-0 md:w-[72px]"
              : "-translate-x-full md:translate-x-0 md:w-[72px] lg:w-[260px]"
          }
        `}
      >
        {/* Glass background */}
        <div className="absolute inset-0 sidebar-premium rounded-none border-r border-surface-200/60" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Workspace Switcher Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-surface-200/60 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                onClick={isDesktopCompact && !sidebarOpen ? toggleSidebarCollapsed : undefined}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white font-brand text-sm font-bold shadow-glow-navy ${
                  isDesktopCompact && !sidebarOpen ? "cursor-pointer hover:scale-105 transition-transform" : ""
                }`}
                title={workspaceName}
              >
                {(workspaceName || "M").charAt(0).toUpperCase()}
              </button>
              <div className={`flex flex-col truncate ${sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"}`}>
                <span className="font-display text-sm font-bold text-ink-800 tracking-tight truncate">
                  {workspaceName}
                </span>
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
                  Workspace
                </span>
              </div>
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleSidebarCollapsed}
              className={`hidden ${isDesktopCompact ? "lg:hidden" : "lg:flex"} h-8 w-8 items-center justify-center rounded-xl text-ink-400 hover:bg-surface-100 hover:text-ink-800 transition-colors cursor-pointer focus-ring`}
              aria-label="Toggle Sidebar"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl text-ink-400 hover:bg-surface-100 hover:text-ink-800 transition"
              aria-label="Close Menu"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Center Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Channels Switcher */}
            <div className={`py-3 border-b border-surface-200/60 ${sidebarOpen ? "px-3" : isDesktopCompact ? "px-2" : "px-2 lg:px-3"}`}>
              <div className={`px-2 mb-2 ${sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">
                  Channels
                </span>
              </div>
              <div className="space-y-0.5">
                {channels.map((ch) => {
                  const isSelected = ch.id === activeChannelId;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        showToast(`Switched to ${ch.name}`, "info");
                        if (sidebarOpen) setSidebarOpen(false);
                      }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-xl py-2 px-2 text-left transition-all duration-200 cursor-pointer spring-press
                        ${!sidebarOpen && isDesktopCompact ? "justify-center" : ""}
                        ${isSelected
                          ? "bg-surface-200/70 text-ink-800 shadow-xs"
                          : "text-ink-600 hover:bg-surface-100/60 hover:text-ink-800"
                        }
                      `}
                      title={ch.name}
                    >
                      <div className="relative shrink-0" suppressHydrationWarning>
                        <img
                          src={ch.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name || "Channel")}&background=0038FF&color=fff&bold=true`}
                          alt={ch.name}
                          suppressHydrationWarning
                          className="h-7 w-7 rounded-lg object-cover ring-1 ring-surface-300/40"
                        />
                        {ch.status === "quota_error" ? (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-coral-500 ring-2 ring-surface-0" />
                        ) : (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-mint-500 ring-2 ring-surface-0 badge-pulse" />
                        )}
                      </div>
                      <div className={`flex-1 overflow-hidden ${sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"}`}>
                        <span className="truncate text-xs font-semibold text-ink-800 block">
                          {ch.name}
                        </span>
                        <span className="truncate text-[10px] text-ink-400 block">
                          {ch.handle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <nav className={`space-y-1 py-3 ${sidebarOpen ? "px-3" : isDesktopCompact ? "px-2" : "px-2 lg:px-3"}`}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    onClick={() => {
                      if (sidebarOpen) setSidebarOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring spring-press
                      ${!sidebarOpen && isDesktopCompact ? "justify-center px-0" : "gap-3 px-3"}
                      ${isActive
                        ? "text-navy-600 bg-navy-500/10 font-semibold"
                        : "text-ink-500 hover:text-ink-800 hover:bg-surface-100/60"
                      }
                    `}
                    title={item.name}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-gradient-brand rounded-r-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-200
                      ${isActive ? "text-navy-500" : "text-ink-400 group-hover:text-ink-600"}
                    `} />
                    <span className={`truncate transition-colors duration-200
                      ${sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"}
                    `}>
                      {item.name}
                    </span>

                    {isActive && (sidebarOpen || !isDesktopCompact) && (
                      <div className={`absolute right-3 ${sidebarOpen ? "block" : "hidden lg:block"}`}>
                        <Sparkles className="h-3 w-3 text-navy-400/60" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Profile */}
          <div className="border-t border-surface-200/60 p-3.5 shrink-0" suppressHydrationWarning>
            <div className="flex items-center justify-between" suppressHydrationWarning>
              <div className="flex items-center gap-2.5 overflow-hidden" suppressHydrationWarning>
                <img
                  src={
                    userSession?.email
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userSession.name || "Creator")}&background=0038FF&color=fff&bold=true`
                      : `https://ui-avatars.com/api/?name=Creator&background=0038FF&color=fff&bold=true`
                  }
                  alt={userSession?.name || "Creator"}
                  suppressHydrationWarning
                  className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-surface-200/80"
                />
                <div className={`flex flex-col truncate ${sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"}`} suppressHydrationWarning>
                  <span className="text-xs font-bold text-ink-800 block truncate" suppressHydrationWarning>
                    {userSession?.name || "Creator"}
                  </span>
                  <span className="text-[10px] text-ink-400 block truncate" suppressHydrationWarning>
                    {userSession?.email || "No Email"}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch (e) {
                    console.error("Logout failed:", e);
                  }
                  router.push("/login");
                }}
                className={`rounded-xl p-2 text-ink-400 hover:bg-coral-50 hover:text-coral-500 transition-all duration-200 focus-ring ${
                  sidebarOpen ? "block" : isDesktopCompact ? "hidden" : "hidden lg:block"
                }`}
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
