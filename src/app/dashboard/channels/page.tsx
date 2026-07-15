"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/frontend/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle,
  Send,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Shield,
  Plus,
  Info,
  Copy,
  Globe,
  Key,
  Radio,
  Check,
  X as CloseIcon,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  ArrowRight,
  Sliders,
  Cpu,
  Bot,
} from "lucide-react";
import Link from "next/link";

// ---------- Types ----------
interface SocialAccount {
  platform: "youtube" | "instagram" | "twitter" | "linkedin" | "whatsapp" | "telegram";
  id: string;
  name: string;
  username: string;
  avatar?: string;
  followers?: string;
  connectedAt: string;
  isActive: boolean;
  status?: string;
  lastSyncAt?: string;
  dailyReplies?: number;
  totalReplies?: number;
  error?: string;
  webhookVerifyToken?: string;
  xPlan?: string;
  telegramBotUsername?: string;
}

interface ConnectedData {
  accounts: SocialAccount[];
  youtube: { connected: boolean; channels: number };
}

interface Channel {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  status: "active" | "quota_error";
  subscribers: string;
}

interface PlatformDef {
  key: "whatsapp" | "instagram" | "telegram" | "linkedin" | "twitter" | "youtube";
  label: string;
  badge: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  description: string;
  connectUrl: string;
  docsUrl: string;
  isInternalRoute?: boolean;
  isCustomModal?: boolean;
  capabilities: { label: string; supported: boolean }[];
  notice?: string;
}

// ---------- Platform Config ----------
const PLATFORMS: PlatformDef[] = [
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    badge: "WebSockets & Cloud API",
    icon: MessageCircle,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-100",
    description: "24/7 AI chat automation via live multi-device WebSocket or Meta Cloud API.",
    connectUrl: "/dashboard/whatsapp",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    isInternalRoute: true,
    capabilities: [
      { label: "Realtime Sockets", supported: true },
      { label: "Inbound DMs", supported: true },
      { label: "AI Auto-Reply", supported: true },
      { label: "Media Attachments", supported: true },
    ],
    notice: "Scan authentic QR code with your phone camera to pair device in seconds.",
  },
  {
    key: "instagram",
    label: "Instagram Professional",
    badge: "Meta Graph API v19.0",
    icon: Instagram,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-50 border-pink-100",
    description: "Official Meta Graph API for automated DMs, feed reels, comments & private replies.",
    connectUrl: "/api/auth/instagram",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    capabilities: [
      { label: "DMs (24h Window)", supported: true },
      { label: "Post Comments", supported: true },
      { label: "Private Replies", supported: true },
      { label: "Media Publishing", supported: true },
    ],
    notice: "Requires Instagram Professional (Business or Creator) account authorized via Meta.",
  },
  {
    key: "telegram",
    label: "Telegram Bot",
    badge: "Official Bot API",
    icon: Send,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-50 border-sky-100",
    description: "Direct official Telegram Bot API with instant webhooks, interactive buttons & commands.",
    connectUrl: "#telegram_modal",
    docsUrl: "https://core.telegram.org/bots/api",
    isCustomModal: true,
    capabilities: [
      { label: "Direct Messages", supported: true },
      { label: "Channel Broadcasts", supported: true },
      { label: "Interactive Keyboards", supported: true },
      { label: "Commands (/start, /help)", supported: true },
    ],
    notice: "Zero aggregator fee. Connect via Bot Token obtained from @BotFather in 30 seconds.",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    badge: "Versioned REST API",
    icon: Linkedin,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-100",
    description: "Official Community & Posts REST API for Member & Company Page posts, comments & analytics.",
    connectUrl: "/api/auth/linkedin",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/integrations",
    capabilities: [
      { label: "Member & Page Posts", supported: true },
      { label: "Post Comments", supported: true },
      { label: "Media Asset Upload", supported: true },
      { label: "Personal DMs", supported: false },
    ],
    notice: "Organic posting & comments supported. Personal DM automation is restricted by LinkedIn.",
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    badge: "Official API v2",
    icon: Twitter,
    iconColor: "text-slate-800",
    iconBg: "bg-slate-100 border-slate-200",
    description: "Official X API v2 with OAuth 2.0 PKCE, tweet publishing, threads & mention replies.",
    connectUrl: "/api/auth/twitter",
    docsUrl: "https://developer.twitter.com/en/docs/twitter-api",
    capabilities: [
      { label: "Tweet Publishing", supported: true },
      { label: "Thread Chaining", supported: true },
      { label: "Mentions Stream", supported: true },
      { label: "Plan-Aware Access", supported: true },
    ],
    notice: "Direct X API v2 integration. Operations available depend on your developer plan (Free/Basic/Pro).",
  },
  {
    key: "youtube",
    label: "YouTube Channel",
    badge: "Data API v3",
    icon: Youtube,
    iconColor: "text-red-600",
    iconBg: "bg-red-50 border-red-100",
    description: "Automated AI comment moderation & keyword reply engine via Google OAuth.",
    connectUrl: "/api/auth/google",
    docsUrl: "https://developers.google.com/youtube/v3",
    capabilities: [
      { label: "Comment Polling", supported: true },
      { label: "AI Auto-Replies", supported: true },
      { label: "Keyword Rules", supported: true },
      { label: "Direct Messages", supported: false },
    ],
    notice: "Connects via Google OAuth 2.0 with YouTube Data API v3 scope.",
  },
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [socialData, setSocialData] = useState<ConnectedData>({
    accounts: [],
    youtube: { connected: false, channels: 0 },
  });
  const [fetchingSocial, setFetchingSocial] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"accounts" | "composer" | "capabilities">("accounts");

  // Telegram Modal State
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramTokenInput, setTelegramTokenInput] = useState("");
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Diagnostics Modal State
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagPlatform, setDiagPlatform] = useState<string>("");

  // Composer State
  const [canonicalIntent, setCanonicalIntent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["telegram", "linkedin", "twitter", "instagram"]);
  const [generatedVariants, setGeneratedVariants] = useState<Record<string, string>>({});
  const [variantGenerating, setVariantGenerating] = useState(false);
  const [composerPublishing, setComposerPublishing] = useState(false);
  const [composerResult, setComposerResult] = useState<any>(null);
  const [scheduleTime, setScheduleTime] = useState("");

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  }, []);

  const fetchSocialAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/social/connected");
      if (res.ok) {
        const data = await res.json();
        setSocialData(data);
      }
    } catch (err) {
      console.error("Failed to fetch social accounts:", err);
    } finally {
      setFetchingSocial(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchSocialAccounts();
  }, [fetchChannels, fetchSocialAccounts]);

  const handleConnectTelegram = async () => {
    if (!telegramTokenInput.trim()) {
      setTelegramError("Please enter a valid Telegram Bot token.");
      return;
    }

    setTelegramConnecting(true);
    setTelegramError(null);

    try {
      const res = await fetch("/api/social/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramTokenInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowTelegramModal(false);
        setTelegramTokenInput("");
        await fetchSocialAccounts();
      } else {
        setTelegramError(data.userFacingExplanation || data.error || "Failed to verify Telegram Bot token.");
      }
    } catch (err: any) {
      setTelegramError(err.message || "Network error connecting Telegram Bot.");
    } finally {
      setTelegramConnecting(false);
    }
  };

  const handleDisconnect = async (platform: string, accountId: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) return;

    try {
      const res = await fetch("/api/social/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accountId }),
      });
      if (res.ok) {
        await fetchSocialAccounts();
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleRunDiagnostics = async (platform: string, accountId?: string) => {
    setDiagPlatform(platform);
    setShowDiagModal(true);
    setDiagLoading(true);
    setDiagResult(null);

    try {
      const res = await fetch("/api/social/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accountId }),
      });
      const data = await res.json();
      setDiagResult(data.diagnostics);
    } catch (err: any) {
      setDiagResult({
        platform,
        connected: false,
        status: "error",
        details: err.message,
      });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (!canonicalIntent.trim()) return;
    setVariantGenerating(true);

    try {
      const res = await fetch("/api/social/composer/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: canonicalIntent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedVariants(data.variants || {});
      }
    } catch (err) {
      console.error("Failed to generate variants:", err);
    } finally {
      setVariantGenerating(false);
    }
  };

  const handlePublishComposer = async () => {
    if (!canonicalIntent.trim() || selectedPlatforms.length === 0) return;
    setComposerPublishing(true);
    setComposerResult(null);

    try {
      const platformPayloads = selectedPlatforms.map((p) => {
        const acct = socialData.accounts.find((a) => a.platform === p);
        return {
          platform: p,
          content: generatedVariants[p] || canonicalIntent,
          accountId: acct?.id || "unconnected",
        };
      });

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalIntent,
          platforms: platformPayloads,
          scheduledAt: scheduleTime || undefined,
        }),
      });

      const data = await res.json();
      setComposerResult(data);
    } catch (err: any) {
      setComposerResult({ success: false, error: err.message });
    } finally {
      setComposerPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 pt-2">
      {/* ── HEADER BANNER ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Native Multi-Channel Social Hub
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Direct Official APIs
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200/60">
                <Cpu className="w-3 h-3" />
                ₹0 Aggregator Fee
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Direct official integrations with Meta, Telegram, LinkedIn, X, and YouTube
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "accounts"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            Connected Channels
          </button>
          <button
            onClick={() => setActiveTab("composer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "composer"
                ? "bg-violet-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Multi-Platform Composer
          </button>
        </div>
      </div>

      {/* ── COST & ACCESS STATUS NOTICE ── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-violet-600 shrink-0" />
          <span>
            <strong>Official API Architecture:</strong> No third-party social aggregators. All actions connect directly to official endpoints.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 shrink-0">
          <span>Our Integration Fee: <strong className="text-emerald-700">₹0</strong></span>
          <span>Aggregator Fee: <strong className="text-slate-700">None</strong></span>
        </div>
      </div>

      {/* ── TAB 1: CONNECTED CHANNELS & PLATFORM CARDS ── */}
      {activeTab === "accounts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const connectedAccount =
              platform.key === "youtube"
                ? channels.length > 0
                  ? { id: channels[0].id, name: channels[0].name, username: channels[0].handle, followers: `${channels[0].subscribers} Subs` }
                  : null
                : socialData.accounts.find((a) => a.platform === platform.key && a.isActive);

            const isConnected = !!connectedAccount;

            return (
              <div
                key={platform.key}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5 hover:border-slate-300 transition-all"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${platform.iconBg} border flex items-center justify-center ${platform.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                      {platform.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{platform.label}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{platform.description}</p>
                  </div>

                  {/* Connection Status Indicator */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="text-xs font-bold text-slate-700">
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>

                    {isConnected && connectedAccount && (
                      <span className="text-xs font-semibold text-slate-500 truncate max-w-[140px]">
                        {connectedAccount.username || connectedAccount.name}
                      </span>
                    )}
                  </div>

                  {/* Capabilities List */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    {platform.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-600">
                        {cap.supported ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <CloseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className={cap.supported ? "font-medium" : "text-slate-400"}>{cap.label}</span>
                      </div>
                    ))}
                  </div>

                  {platform.notice && (
                    <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-xl">
                      {platform.notice}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => handleRunDiagnostics(platform.key, connectedAccount?.id)}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Test Connection
                      </button>
                      <button
                        onClick={() => handleDisconnect(platform.key, connectedAccount?.id || "")}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                        title="Disconnect Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : platform.isCustomModal ? (
                    <button
                      onClick={() => setShowTelegramModal(true)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Connect Bot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : platform.isInternalRoute ? (
                    <Link
                      href={platform.connectUrl}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center block transition-all shadow-xs"
                    >
                      Connect Channel
                    </Link>
                  ) : (
                    <a
                      href={platform.connectUrl}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center block transition-all shadow-xs"
                    >
                      Connect Account
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: MULTI-PLATFORM COMPOSER ── */}
      {activeTab === "composer" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Unified Multi-Platform Composer</h2>
            <p className="text-xs text-slate-500">
              Input canonical content once — AI adapts tailored variants for Instagram, LinkedIn, X, and Telegram.
            </p>
          </div>

          {/* Canonical Intent Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Canonical Post Concept / Intent</label>
            <textarea
              rows={3}
              value={canonicalIntent}
              onChange={(e) => setCanonicalIntent(e.target.value)}
              placeholder="e.g. Announcing our new 24/7 AI Business Automation layer. Helps businesses resolve inquiries in real time..."
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium"
            />
            <div className="flex justify-end">
              <button
                onClick={handleGenerateVariants}
                disabled={variantGenerating || !canonicalIntent.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                {variantGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Platform Variants
              </button>
            </div>
          </div>

          {/* Generated Variants Preview */}
          {Object.keys(generatedVariants).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {["telegram", "linkedin", "twitter", "instagram"].map((pKey) => {
                const variantText = generatedVariants[pKey] || "";
                const isSelected = selectedPlatforms.includes(pKey);

                return (
                  <div
                    key={pKey}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== pKey));
                      } else {
                        setSelectedPlatforms([...selectedPlatforms, pKey]);
                      }
                    }}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-violet-50/50 border-violet-400 ring-2 ring-violet-500/10"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">{pKey}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {isSelected ? "Selected" : "Deselected"}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={variantText}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        setGeneratedVariants({ ...generatedVariants, [pKey]: e.target.value });
                      }}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Schedule Picker & Publish Button */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Clock className="w-4 h-4 text-slate-400" />
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
              />
              {scheduleTime && (
                <button onClick={() => setScheduleTime("")} className="text-xs text-slate-400 hover:text-slate-600">
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={handlePublishComposer}
              disabled={composerPublishing || !canonicalIntent.trim() || selectedPlatforms.length === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              {composerPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : scheduleTime ? (
                <>
                  <Calendar className="w-4 h-4 text-violet-400" />
                  <span>Schedule to {selectedPlatforms.length} Platforms</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Publish to {selectedPlatforms.length} Platforms</span>
                </>
              )}
            </button>
          </div>

          {/* Publication Feedback Results */}
          {composerResult && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold ${composerResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
              {composerResult.success ? (
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Multi-platform execution initiated (Status: {composerResult.status})
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {composerResult.platformResults?.map((r: any, i: number) => (
                      <li key={i}>
                        • <strong>{r.platform}:</strong> {r.success ? "Success" : `Failed (${r.error})`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>Error: {composerResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TELEGRAM BOT CONNECT MODAL ── */}
      <AnimatePresence>
        {showTelegramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Connect Telegram Bot</h3>
                    <p className="text-xs text-slate-500">Official Telegram Bot API Integration</p>
                  </div>
                </div>
                <button onClick={() => setShowTelegramModal(false)} className="text-slate-400 hover:text-slate-600">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800">Quick 30-Second Setup:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open Telegram and message <strong>@BotFather</strong></li>
                  <li>Send <code>/newbot</code> and follow the naming instructions</li>
                  <li>Copy the HTTP API Bot Token and paste it below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Bot Token</label>
                <input
                  type="password"
                  value={telegramTokenInput}
                  onChange={(e) => setTelegramTokenInput(e.target.value)}
                  placeholder="e.g. 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {telegramError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {telegramError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowTelegramModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectTelegram}
                  disabled={telegramConnecting || !telegramTokenInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  {telegramConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Verify & Connect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DIAGNOSTICS MODAL ── */}
      <AnimatePresence>
        {showDiagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 capitalize">{diagPlatform} Diagnostics</h3>
                    <p className="text-xs text-slate-500">Live API Health & Permission Check</p>
                  </div>
                </div>
                <button onClick={() => setShowDiagModal(false)} className="text-slate-400 hover:text-slate-600">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {diagLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                  <span className="text-xs font-semibold">Testing API connectivity & token validity...</span>
                </div>
              ) : diagResult ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border text-xs font-semibold ${diagResult.connected ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                    <div className="font-bold flex items-center gap-1.5">
                      {diagResult.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      Status: {diagResult.status?.toUpperCase()}
                    </div>
                    <p className="mt-1 text-slate-700 font-medium">{diagResult.details}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500">Token Valid:</span>
                      <span className={`font-bold ${diagResult.tokenValid ? "text-emerald-600" : "text-slate-400"}`}>
                        {diagResult.tokenValid ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500">API Reachable:</span>
                      <span className={`font-bold ${diagResult.apiReachable ? "text-emerald-600" : "text-slate-400"}`}>
                        {diagResult.apiReachable ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowDiagModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
