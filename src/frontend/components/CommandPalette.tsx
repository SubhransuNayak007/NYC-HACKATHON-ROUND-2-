"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/frontend/store";
import {
  Search,
  X,
  Youtube,
  Sliders,
  FolderHeart,
  LayoutDashboard,
  Settings,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Plus,
  Flag,
  Package,
  MessageSquarePlus,
  GitBranch,
  Sun,
  type LucideIcon,
} from "lucide-react";

interface SearchItem {
  id: string;
  name: string;
  category: "Pages" | "Channels" | "Rules" | "Actions";
  url: string;
  icon: LucideIcon;
  action?: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const isOpen = useUIStore((state) => state.commandPaletteOpen);
  const setIsOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const setActiveChannelId = useUIStore((state) => state.setActiveChannelId);
  const showToast = useUIStore((state) => state.showToast);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadItems() {
      const pageItems: SearchItem[] = [
        { id: "p-dash", name: "Dashboard Overview", category: "Pages", url: "/dashboard", icon: LayoutDashboard },
        { id: "p-feed", name: "Live Comment Feed", category: "Pages", url: "/dashboard/feed", icon: MessageSquare },
        { id: "p-rules", name: "Rule Builder", category: "Pages", url: "/dashboard/rules", icon: Sliders },
        { id: "p-tpl", name: "Template Library", category: "Pages", url: "/dashboard/templates", icon: FolderHeart },
        { id: "p-analytics", name: "Analytics Charts", category: "Pages", url: "/dashboard/analytics", icon: TrendingUp },
        { id: "p-settings", name: "Workspace Settings", category: "Pages", url: "/dashboard/settings", icon: Settings },
      ];

      const actionItems: SearchItem[] = [
        { id: "a-new-rule", name: "Create new rule", category: "Actions", url: "/dashboard/rules/new", icon: Plus },
        { id: "a-review-queue", name: "View review queue", category: "Actions", url: "/dashboard/feed/review", icon: Flag },
        {
          id: "a-seed-demo",
          name: "Seed demo workspace",
          category: "Actions",
          url: "",
          icon: Package,
          action: async () => {
            try {
              const res = await fetch("/api/demo/seed", { method: "POST" });
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                showToast(data.message || "Demo workspace seeded successfully!", "success");
              } else {
                showToast("Failed to seed demo workspace", "error");
              }
            } catch {
              showToast("Network error seeding demo workspace", "error");
            }
          },
        },
        {
          id: "a-inject-demo",
          name: "Inject demo comments",
          category: "Actions",
          url: "",
          icon: MessageSquarePlus,
          action: async () => {
            try {
              const res = await fetch("/api/demo/inject", { method: "POST" });
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                showToast(data.message || "Demo comments injected!", "success");
              } else {
                showToast("Failed to inject demo comments", "error");
              }
            } catch {
              showToast("Network error injecting demo comments", "error");
            }
          },
        },
        { id: "a-pipeline-traces", name: "View pipeline traces", category: "Actions", url: "/dashboard/feed", icon: GitBranch },
        {
          id: "a-golden-hour",
          name: "Toggle golden-hour mode",
          category: "Actions",
          url: "",
          icon: Sun,
          action: async () => {
            try {
              const res = await fetch("/api/settings");
              let current = false;
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                current = !!data.workspace?.settings?.goldenHourEnabled;
              }
              const putRes = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings: { goldenHourEnabled: !current } }),
              });
              if (putRes.ok) {
                showToast(`Golden-hour mode ${!current ? "enabled" : "disabled"}`, "success");
              } else {
                showToast("Failed to toggle golden-hour mode", "error");
              }
            } catch {
              showToast("Network error toggling golden-hour mode", "error");
            }
          },
        },
      ];

      try {
        const [channelsRes, rulesRes] = await Promise.all([
          fetch("/api/channels"),
          fetch("/api/rules"),
        ]);

        let channelItems: SearchItem[] = [];
        if (channelsRes.ok) {
          const channels = await channelsRes.json();
          channelItems = (channels as { id: string; name: string }[]).map((c) => ({
            id: `c-${c.id}`,
            name: `Switch to ${c.name}`,
            category: "Channels",
            url: "/dashboard",
            icon: Youtube,
            action: () => {
              setActiveChannelId(c.id);
              showToast(`Switched to ${c.name}`, "success");
            },
          }));
        }

        let ruleItems: SearchItem[] = [];
        if (rulesRes.ok) {
          const rules = await rulesRes.json();
          ruleItems = (rules as { id: string; name: string }[]).map((r) => ({
            id: `r-${r.id}`,
            name: `Edit: ${r.name}`,
            category: "Rules",
            url: `/dashboard/rules/${r.id}`,
            icon: Sliders,
          }));
        }

        setItems([...pageItems, ...actionItems, ...channelItems, ...ruleItems]);
      } catch (err) {
        console.error("Error loading command palette items:", err);
        setItems([...pageItems, ...actionItems]);
      }
    }

    if (isOpen) {
      loadItems();
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, refreshTrigger, setActiveChannelId, showToast]);

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false);
    if (item.action) item.action();
    if (item.url) router.push(item.url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-navy-900/20 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: -16, filter: 'blur(4px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl glass-strong shadow-elevated-lg focus-within:ring-2 focus-within:ring-navy-500/10"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input */}
            <div className="flex h-14 items-center gap-3 border-b border-surface-200/60 px-5">
              <div className="h-8 w-8 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                <Search className="h-4 w-4 text-white" />
              </div>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search rules, channels, pages..."
                className="w-full h-full text-sm outline-none placeholder:text-ink-400 text-ink-800 font-medium"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto p-2 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <Search className="h-5 w-5 text-ink-400" />
                  </div>
                  <p className="text-sm text-ink-500 font-medium">No results for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-ink-400 mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-150 spring-press
                          ${isSelected
                            ? "bg-navy-500/8 text-navy-700"
                            : "text-ink-600 hover:bg-surface-100/60"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                            ${isSelected ? "bg-navy-500/10" : "bg-surface-100"}
                          `}>
                            <item.icon className={`h-4 w-4 ${isSelected ? "text-navy-500" : "text-ink-400"}`} />
                          </div>
                          <span className="truncate font-semibold">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider
                            ${item.category === "Pages" ? "bg-surface-100 text-ink-500" : ""}
                            ${item.category === "Channels" ? "bg-mint-50 text-mint-600" : ""}
                            ${item.category === "Rules" ? "bg-volt-50 text-volt-700" : ""}
                            ${item.category === "Actions" ? "bg-purple-50 text-purple-600" : ""}
                          `}>
                            {item.category}
                          </span>
                          {isSelected && <ArrowRight className="h-3 w-3 shrink-0 text-navy-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex h-10 items-center justify-between border-t border-surface-200/60 bg-surface-50/50 px-4 text-[10px] text-ink-400">
              <div className="flex items-center gap-2">
                <span>Navigate</span>
                <kbd className="rounded-md border border-surface-200 bg-surface-0 px-1.5 py-0.5 font-mono font-bold shadow-sm">↑↓</kbd>
                <span>Select</span>
                <kbd className="rounded-md border border-surface-200 bg-surface-0 px-1.5 py-0.5 font-mono font-bold shadow-sm">↵</kbd>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Close</span>
                <kbd className="rounded-md border border-surface-200 bg-surface-0 px-1.5 py-0.5 font-mono font-bold shadow-sm">esc</kbd>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
