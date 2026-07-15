"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/frontend/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Loader2, RefreshCw, CheckCircle,
  Play, MessageSquare, Calendar, ToggleLeft, ToggleRight,
  Search, ChevronDown
} from "lucide-react";

// ---------- Types ----------
interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

interface Channel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: "active" | "quota_error";
  subscribers: string;
  automatedVideos?: string[];
}

// ---------- Animation Variants ----------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

// ---------- Video Card Component ----------
function VideoCard({
  video,
  isAutomated,
  onToggle,
  isSaving,
}: {
  video: Video;
  isAutomated: boolean;
  onToggle: () => void;
  isSaving: boolean;
}) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <motion.div
      variants={item}
      className={`card-premium glass-card rounded-2xl overflow-hidden transition-all hover:shadow-md ${
        isAutomated ? "border border-green-200 ring-1 ring-green-100" : "border border-slate-200"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <Play className="h-12 w-12 text-ink-400" />
          </div>
        )}

        {/* Status Badge */}
        {isAutomated && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            AUTO-REPLY ON
          </div>
        )}

        {/* Video Duration Overlay (mock) */}
        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          {formatDate(video.publishedAt)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-3 leading-snug">
          {video.title}
        </h3>

        <div className="flex items-center gap-3 text-[11px] text-ink-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(video.publishedAt)}
          </span>
        </div>

        {/* Toggle Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className={`h-4 w-4 ${isAutomated ? "text-green-600" : "text-ink-400"}`} />
            <span className="text-sm font-medium text-ink-700">Auto-Reply</span>
          </div>

          <button
            onClick={onToggle}
            disabled={isSaving}
            className="relative cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAutomated ? "Disable auto-reply" : "Enable auto-reply"}
          >
            {isSaving ? (
              <Loader2 className="h-6 w-6 text-ink-400 animate-spin" />
            ) : isAutomated ? (
              <ToggleRight className="h-7 w-7 text-green-600" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Main Page ----------
export default function VideosPage() {
  const showToast = useUIStore((s) => s.showToast);
  const activeChannelId = useUIStore((s) => s.activeChannelId);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [automatedVideos, setAutomatedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        // Auto-select active channel or first one
        if (activeChannelId && data.some((c: Channel) => c.id === activeChannelId)) {
          setSelectedChannelId(activeChannelId);
        } else if (data.length > 0) {
          setSelectedChannelId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  }, [activeChannelId]);

  // Fetch videos for selected channel
  const fetchVideos = useCallback(async (channelId: string) => {
    if (!channelId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/videos?channelId=${channelId}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      } else {
        showToast("Failed to load videos", "error");
        setVideos([]);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      showToast("Failed to load videos", "error");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load channels on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Load videos when channel changes
  useEffect(() => {
    if (selectedChannelId) {
      fetchVideos(selectedChannelId);
      // Set automated videos from channel data
      const channel = channels.find((c) => c.id === selectedChannelId);
      setAutomatedVideos(channel?.automatedVideos || []);
    }
  }, [selectedChannelId, channels, fetchVideos]);

  // Toggle auto-reply for a video
  const handleToggle = async (videoId: string) => {
    if (!selectedChannelId) return;

    setSaving(videoId);

    // Optimistic update
    const newAutomated = automatedVideos.includes(videoId)
      ? automatedVideos.filter((id) => id !== videoId)
      : [...automatedVideos, videoId];

    setAutomatedVideos(newAutomated);

    try {
      const res = await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannelId,
          automatedVideos: newAutomated,
        }),
      });

      if (res.ok) {
        // Sync the channel state so the toggle persists when switching back
        setChannels((prev) => prev.map((c) => c.id === selectedChannelId ? { ...c, automatedVideos: newAutomated } : c));
        const video = videos.find((v) => v.id === videoId);
        const isNowEnabled = newAutomated.includes(videoId);
        showToast(
          isNowEnabled
            ? `Auto-reply enabled for "${video?.title || "video"}"`
            : `Auto-reply disabled for "${video?.title || "video"}"`,
          "success"
        );
      } else {
        // Revert on failure
        setAutomatedVideos(automatedVideos);
        showToast("Failed to update video settings", "error");
      }
    } catch (err) {
      // Revert on error
      setAutomatedVideos(automatedVideos);
      showToast("Failed to update video settings", "error");
    } finally {
      setSaving(null);
    }
  };

  // Filter videos by search
  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const enabledCount = automatedVideos.length;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-800 md:text-2xl flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Video Selection
            </h1>
            <p className="text-xs text-ink-500 mt-1">
              Choose which videos to activate auto-reply on. Toggle on/off for each video.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="text-center bg-white glass-card border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
              <div className="text-lg font-bold text-green-600">{enabledCount}</div>
              <div className="text-[9px] text-ink-500 font-medium uppercase tracking-wide">Active</div>
            </div>
            <div className="text-center bg-white glass-card border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
              <div className="text-lg font-bold text-ink-700">{videos.length}</div>
              <div className="text-[9px] text-ink-500 font-medium uppercase tracking-wide">Total</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Channel Selector */}
      <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-ink-700 mb-1.5">Select Channel</label>
            <div className="relative">
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
              >
                {channels.length === 0 ? (
                  <option value="">No channels connected</option>
                ) : (
                  channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.handle}) — {ch.subscribers}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-ink-700 mb-1.5">Search Videos</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* Refresh */}
          <div className="flex items-end">
            <button
              onClick={() => fetchVideos(selectedChannelId)}
              disabled={loading || !selectedChannelId}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-ink-700 text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Channel Info Bar */}
        {selectedChannel && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
            {selectedChannel.avatar && (
              <img
                src={selectedChannel.avatar}
                alt={selectedChannel.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-800">{selectedChannel.name}</p>
              <p className="text-[11px] text-ink-500">
                {selectedChannel.handle} · {selectedChannel.subscribers} subscribers
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
              selectedChannel.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
              {selectedChannel.status}
            </span>
          </div>
        )}
      </motion.div>

      {/* Video Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-xs text-ink-400 font-medium">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading videos...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-white glass-card rounded-2xl border border-slate-200">
          <Youtube className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-ink-700">
            {searchQuery ? "No videos match your search" : "No videos found"}
          </h3>
          <p className="text-xs text-ink-500 mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Connect a YouTube channel to see its videos"}
          </p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isAutomated={automatedVideos.includes(video.id)}
                onToggle={() => handleToggle(video.id)}
                isSaving={saving === video.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="card-premium glass-card rounded-xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              How Video Auto-Reply Works
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              When auto-reply is toggled ON for a video, QuickReply will automatically respond to new comments
              based on your keyword rules. Toggle OFF to stop auto-replies on that video. Changes take effect immediately.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
