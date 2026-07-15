"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/frontend/components/Sidebar";
import Header from "@/frontend/components/Header";
import CommandPalette from "@/frontend/components/CommandPalette";
import PageTransition from "@/frontend/components/ui/PageTransition";
import { useUIStore } from "@/frontend/store";
import { useAutoRefresh } from "@/frontend/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const toast = useUIStore((state) => state.toast);
  const hideToast = useUIStore((state) => state.hideToast);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const pathname = usePathname();

  // Auto-refresh JWT every 13 min (JWT expires in 15 min)
  useAutoRefresh();

  // Client-side 30-second polling heartbeat for auto-reply
  // Only runs on the feed page to avoid unnecessary API calls
  useEffect(() => {
    // Only poll when on the feed page
    if (pathname !== "/dashboard/feed") return;

    let pollTimer: ReturnType<typeof setInterval>;
    let isPolling = false;

    async function pollComments() {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await fetch("/api/youtube/poll");
        if (!res.ok) {
          const text = await res.text();
          console.warn("[ClientPoll] Poll failed:", text.slice(0, 100));
        }
      } catch (err) {
        // Silently ignore — polling is a best-effort fallback
      } finally {
        isPolling = false;
      }
    }

    // Initial delayed poll after dashboard loads
    const initialTimer = setTimeout(pollComments, 5_000);

    // Then poll every 30 seconds
    pollTimer = setInterval(pollComments, 30_000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [pathname]);

  useEffect(() => {
    // Check auth silently in background without blocking UI rendering
    async function checkAuth() {
      try {
        await fetch("/api/settings");
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }
    checkAuth();
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden overflow-x-hidden bg-surface-50 font-sans">
      {/* Animated background blobs */}
      <div className="blob-container">
        <div className="blob blob-navy w-[500px] h-[500px] -top-40 -left-40 animate-float" />
        <div className="blob blob-volt w-[400px] h-[400px] top-1/3 right-[-100px] animate-float-delayed" />
        <div className="blob blob-purple w-[350px] h-[350px] bottom-[-80px] left-1/3 animate-float-slow" />
      </div>

      {/* 1. App Navigation Sidebar */}
      <Sidebar />

      {/* 2. Main content area */}
      <div className={`flex flex-col flex-1 h-full min-w-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 ${
        sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[72px] lg:pl-[260px]"
      }`}>
        {/* Top Header */}
        <Header />

        {/* Scrollable Canvas area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar flex flex-col">
          <div className="max-w-[1400px] w-full mx-auto page-enter flex-1 flex flex-col">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* 3. Global Command Palette Modal */}
      <CommandPalette />

      {/* 4. Global Toast Notifications banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-elevated-lg max-w-sm text-sm font-semibold glass-strong
              ${toast.type === "success" ? "border-mint-400/30 text-mint-600" : ""}
              ${toast.type === "error" ? "border-coral-400/30 text-coral-600" : ""}
              ${toast.type === "warning" ? "border-volt-500/30 text-volt-700" : ""}
              ${toast.type === "info" ? "border-navy-500/20 text-navy-600" : ""}
            `}
          >
            {toast.type === "success" && (
              <div className="h-8 w-8 rounded-xl bg-mint-50 flex items-center justify-center">
                <CheckCircle className="h-4.5 w-4.5 text-mint-500 shrink-0" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="h-8 w-8 rounded-xl bg-coral-50 flex items-center justify-center">
                <AlertCircle className="h-4.5 w-4.5 text-coral-500 shrink-0" />
              </div>
            )}
            {toast.type === "warning" && (
              <div className="h-8 w-8 rounded-xl bg-volt-50 flex items-center justify-center">
                <Info className="h-4.5 w-4.5 text-volt-700 shrink-0" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="h-8 w-8 rounded-xl bg-navy-50 flex items-center justify-center">
                <Info className="h-4.5 w-4.5 text-navy-500 shrink-0" />
              </div>
            )}

            <span className="flex-1 text-left leading-snug">{toast.message}</span>

            <button
              onClick={hideToast}
              className="rounded-xl p-1 hover:bg-ink-200/50 text-ink-400 hover:text-ink-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
