"use client";

/**
 * ============================================================================
 *  QuickReply — Platforms Hub
 *  src/app/dashboard/platforms/page.tsx
 *
 *  Unified Omnichannel Platform Suite & Real-Time Diagnostics
 *  Complies 100% with QuickReply Light Enterprise Theme & Design Tokens
 * ============================================================================
 */

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram,
  MessageCircle,
  Linkedin,
  Send,
  Youtube,
  Twitter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Shield,
  ArrowRight,
  Sparkles,
  Zap,
  Bot,
  Layers,
  Check,
  X as CloseIcon,
  Loader2,
  Info,
  Clock,
  Radio,
  Plus,
  Lock,
  Activity,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface InstagramStatusData {
  connected: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
  account?: {
    id: string;
    username: string;
    name: string;
    profilePictureUrl: string;
    accountType: string;
    followersCount: number;
    mediaCount: number;
    connectedAt: string;
  } | null;
  tokenHealth?: {
    isValid: boolean;
    daysRemaining: number;
    expiresAt: string | null;
    status: "healthy" | "expiring_soon" | "expired";
  } | null;
  webhookHealth?: {
    status: string;
    lastWebhookAt?: string;
  };
  capabilities?: Array<{
    name: string;
    status: string;
    description: string;
  }>;
  summary?: {
    total: number;
    available: number;
    requiresPermission: number;
    healthScore: number;
  };
  lastSyncedAt?: string | null;
}

interface TelegramStatusData {
  connected: boolean;
  status: string;
  connection?: {
    id: string;
    botUsername?: string;
    botName?: string;
    type?: string;
    webhookStatus?: string;
  } | null;
}

interface WhatsAppStatusData {
  connected: boolean;
  status: string;
  connection?: {
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
  } | null;
}

function PlatformsDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Multi-Channel Live Diagnostic States
  const [instagramData, setInstagramData] = useState<InstagramStatusData | null>(null);
  const [telegramData, setTelegramData] = useState<TelegramStatusData | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<WhatsAppStatusData | null>(null);
  const [channelsList, setChannelsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramTokenInput, setTelegramTokenInput] = useState("");
  const [connectingTelegram, setConnectingTelegram] = useState(false);

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Check URL query parameters on load (e.g. from OAuth return)
  useEffect(() => {
    const connectedParam = searchParams.get("connected");
    const errorParam = searchParams.get("error");
    const accountParam = searchParams.get("account");

    if (connectedParam === "instagram") {
      setNotification({
        type: "success",
        message: `Instagram account @${accountParam || "Professional"} connected successfully!`,
      });
      setShowInstagramModal(false);
      router.replace("/dashboard/platforms");
    } else if (errorParam) {
      setNotification({
        type: "error",
        message: decodeURIComponent(errorParam),
      });
      router.replace("/dashboard/platforms");
    }
  }, [searchParams, router]);

  // Comprehensive Multi-Channel Status Fetch
  const fetchAllStatuses = useCallback(async () => {
    try {
      setRefreshing(true);
      const [igRes, tgRes, waRes, chanRes] = await Promise.allSettled([
        fetch("/api/integrations/instagram/status"),
        fetch("/api/telegram/status"),
        fetch("/api/whatsapp/status"),
        fetch("/api/channels"),
      ]);

      if (igRes.status === "fulfilled" && igRes.value.ok) {
        const data = await igRes.value.json();
        setInstagramData(data);
      }
      if (tgRes.status === "fulfilled" && tgRes.value.ok) {
        const data = await tgRes.value.json();
        setTelegramData(data);
      }
      if (waRes.status === "fulfilled" && waRes.value.ok) {
        const data = await waRes.value.json();
        setWhatsAppData(data);
      }
      if (chanRes.status === "fulfilled" && chanRes.value.ok) {
        const data = await chanRes.value.json();
        setChannelsList(Array.isArray(data) ? data : data.channels || []);
      }
    } catch (err) {
      console.warn("Failed to fetch platform diagnostics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStatuses();
  }, [fetchAllStatuses]);

  // Handle Telegram Connect
  const handleConnectTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramTokenInput.trim()) return;

    try {
      setConnectingTelegram(true);
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: telegramTokenInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: "success",
          message: `Telegram Bot @${data.connection?.botUsername || "Bot"} connected successfully!`,
        });
        setShowTelegramModal(false);
        setTelegramTokenInput("");
        await fetchAllStatuses();
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to connect Telegram bot. Please check your token from @BotFather.",
        });
      }
    } catch {
      setNotification({
        type: "error",
        message: "Failed to verify token with Telegram API.",
      });
    } finally {
      setConnectingTelegram(false);
    }
  };

  // Handle Disconnect Instagram
  const handleDisconnectInstagram = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch("/api/integrations/instagram/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        setNotification({
          type: "success",
          message: "Instagram account disconnected and credentials wiped.",
        });
        setShowDisconnectConfirm(false);
        await fetchAllStatuses();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: err.error || "Failed to disconnect account.",
        });
      }
    } catch {
      setNotification({
        type: "error",
        message: "Network error during disconnect.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const isInstagramConnected = instagramData?.connected === true && instagramData?.status === "CONNECTED";
  const isTelegramConnected = telegramData?.connected === true;
  const isWhatsAppConnected = whatsAppData?.connected === true;
  const youtubeChannel = channelsList.find((c) => c.platform === "youtube");

  return (
    <div className="min-h-screen bg-[#F5F6F0] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-black/5 text-[#161616] shadow-2xs">
              Omnichannel Operations
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Meta Graph API v19.0+ &amp; Multi-Platform Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161616] tracking-tight mt-2 uppercase">
            Connected Platforms
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1 max-w-xl">
            Official OAuth integrations with zero manual tokens. All connections operate 24/7 with continuous server-side webhook ingestion and instant AI deflection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllStatuses}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-black/10 text-xs font-bold text-[#161616] shadow-2xs flex items-center gap-2 transition-all cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync Status"}</span>
          </button>
        </div>
      </div>

      {/* ── TOP STATS OVERVIEW BAR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Supported Ecosystems</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">6 Dedicated Suites</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Full Multi-Platform Ready
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Automation Engines</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">24/7 Continuous</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" /> Sub-Second Webhook Polling
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Architecture</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">OAuth 2.0 PKCE</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Encrypted Credentials At Rest
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Knowledge Grounding</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">Transcript &amp; FAQ RAG</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Zero Hallucination Guarantee
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6-PLATFORM GRID WITH EQUAL VISUAL DENSITY & CONSISTENT HEIGHTS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. INSTAGRAM PROFESSIONAL CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-500/10 via-rose-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            {/* Top Row: Icon + Badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-md shadow-pink-500/20">
                <Instagram className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                Meta Graph API v19.0
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">Instagram Professional</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                24/7 AI DMs, comment-to-DM triggers, reel and post scheduling, lead scoring, and automated catalog pricing.
              </p>
            </div>

            {/* Connection Status Indicator */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isInstagramConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  }`}
                />
                <span className="text-xs font-bold text-[#161616]">
                  {isInstagramConnected ? "Connected" : instagramData?.status === "REAUTH_REQUIRED" ? "Reauth Required" : "Ready / Disconnected"}
                </span>
              </div>

              {isInstagramConnected && instagramData?.account && (
                <div className="flex items-center gap-2">
                  {instagramData.account.profilePictureUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={instagramData.account.profilePictureUrl}
                      alt={instagramData.account.username}
                      className="w-5 h-5 rounded-full object-cover border border-white"
                    />
                  )}
                  <span className="text-xs font-mono font-bold text-slate-800">
                    @{instagramData.account.username}
                  </span>
                </div>
              )}
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">24/7 Auto DMs</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Comment-to-DM</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Container Publishing</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Lead Stage CRM</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-black/5 relative z-10">
            {isInstagramConnected ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/instagram"
                  className="flex-1 py-2.5 rounded-xl bg-[#161616] hover:bg-black text-white text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                  title="Disconnect Instagram Account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInstagramModal(true)}
                className="w-full py-3 rounded-xl bg-[#161616] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>Connect Instagram</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. WHATSAPP BUSINESS CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                Meta Cloud API v20.0
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">WhatsApp Business</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                24/7 AI chat automation via live multi-device WebSocket or Meta Embedded Signup Cloud API.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-[#161616]">
                  {isWhatsAppConnected && whatsAppData?.connection?.displayPhoneNumber
                    ? whatsAppData.connection.displayPhoneNumber
                    : "WhatsApp Platform Suite"}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active Hub
              </span>
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">24/7 AI Copilot</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Product Catalog RAG</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Human Handoff SLA</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Template Dispatch</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 relative z-10">
            <Link
              href="/dashboard/whatsapp"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open WhatsApp Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. LINKEDIN ENTERPRISE CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Linkedin className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                LinkedIn REST 202401
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">LinkedIn Operations</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Member thought leadership, Company Page broadcasting, AI Quality Gate &amp; engagement analytics.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-[#161616]">LinkedIn Platform Suite</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Company Page Posts</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">AI Quality Gate</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Virality Scoring</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">B2B Lead Pipeline</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 relative z-10">
            <Link
              href="/dashboard/linkedin"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open LinkedIn Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4. TELEGRAM BOT API CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                Bot API 7.0+
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">Telegram Autonomous Hub</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Telegram Business bots, group moderation, mini-apps, broadcast campaigns &amp; Star payments.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTelegramConnected ? "bg-emerald-500 animate-pulse" : "bg-sky-500"}`} />
                <span className="text-xs font-bold text-[#161616]">
                  {telegramData?.connection?.botUsername ? `@${telegramData.connection.botUsername}` : "Telegram Bot Hub"}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                {isTelegramConnected ? "Live Connected" : "Ready"}
              </span>
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Group &amp; DM Copilot</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Keyword Triggers</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Mini-App Hooks</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Broadcast Flows</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 relative z-10 flex items-center gap-2">
            <Link
              href="/dashboard/telegram"
              className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open Telegram Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setShowTelegramModal(true)}
              className="p-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-all cursor-pointer"
              title="Configure BotFather Token"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. YOUTUBE CREATOR SUITE CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 via-rose-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FF0000] text-white flex items-center justify-center shadow-md shadow-red-500/20">
                <Youtube className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                YouTube Data v3
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">YouTube Scout Suite</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Dedicated YouTube comment scout, video-specific rule builder, and transcript-grounded RAG system.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-[#161616]">
                  {youtubeChannel?.name || "DEZY Channel (@dezy-777)"}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Scout Active
              </span>
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">15s Live Poller</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Transcript RAG</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Auto-Heart &amp; Pin</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Link Click Tracker</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 relative z-10">
            <Link
              href="/dashboard/youtube"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open YouTube Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6. X (TWITTER) BROADCAST CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-500/10 via-zinc-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md shadow-black/20">
                <Twitter className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-black/5">
                X API v2
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#161616] tracking-tight">X (Twitter) Broadcast</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Post scheduling, thread composer, AI variant drafting &amp; unified engagement metrics.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="text-xs font-bold text-[#161616]">X Platform Hub</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            {/* Capabilities Matrix Preview (4 Points) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Thread Composer</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Variant Generator</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Mention Auto-Reply</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Queue Scheduler</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-black/5 relative z-10">
            <Link
              href="/dashboard/channels"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>View X Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* ── EXACT INSTAGRAM CONNECTION MODAL ── */}
      <AnimatePresence>
        {showInstagramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-black/10 shadow-2xl space-y-6 select-none"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between pb-2 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-md shadow-pink-500/20">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#161616]">Connect Instagram Professional</h3>
                    <p className="text-xs text-slate-500 font-medium">Official Meta integration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstagramModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Informative Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-[#DD2A7B]" />
                  <span className="font-bold text-xs text-[#161616]">Connect your Instagram account</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Securely authorize QuickReply through Meta. You don&apos;t need to enter API keys or access tokens.
                </p>
              </div>

              {/* Primary OAuth Action Button */}
              <div className="space-y-3">
                <a
                  href="/api/integrations/instagram/connect"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-pink-500/25 flex items-center justify-center gap-2.5 text-center cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Continue with Instagram</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-medium">
                  <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>You&apos;ll be redirected to Meta to securely authorize this connection.</span>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TELEGRAM BOT TOKEN MODAL ── */}
      <AnimatePresence>
        {showTelegramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-black/10 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-2 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#161616]">Connect Telegram Bot</h3>
                    <p className="text-xs text-slate-500 font-medium">Telegram Bot API 7.0+</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTelegramModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConnectTelegram} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Telegram Bot Token (from @BotFather)
                  </label>
                  <input
                    type="text"
                    value={telegramTokenInput}
                    onChange={(e) => setTelegramTokenInput(e.target.value)}
                    placeholder="8586329346:AAGbzY30wA2rBg9eL7_LGFMa2n6WUQhtIwc"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Open Telegram &rarr; search <strong>@BotFather</strong> &rarr; send <code>/newbot</code> or copy token.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTelegramModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connectingTelegram || !telegramTokenInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#229ED9] hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {connectingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Verify &amp; Connect</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DISCONNECT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showDisconnectConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-black/10 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#161616]">Disconnect Instagram?</h3>
                  <p className="text-xs text-slate-500">This will stop active automations and purge tokens</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to disconnect <strong>@{instagramData?.account?.username || "Instagram Account"}</strong>? All encrypted access tokens will be wiped and 24/7 background webhook replies will halt.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnectInstagram}
                  disabled={disconnecting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Disconnect</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlatformsDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Platforms...</div>}>
      <PlatformsDashboardContent />
    </Suspense>
  );
}
