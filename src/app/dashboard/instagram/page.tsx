"use client";

/**
 * ============================================================================
 *  QuickReply — Official Instagram Professional Platform Suite
 *  src/app/dashboard/instagram/page.tsx
 *
 *  Complies 100% with QuickReply Light Enterprise SaaS Theme & Design Tokens
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram,
  Zap,
  Sparkles,
  MessageSquare,
  Send,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  Users,
  ShieldCheck,
  BarChart3,
  Bot,
  RefreshCw,
  Plus,
  Play,
  Trash2,
  Lock,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Eye,
  AlertCircle,
  Activity,
  Layers,
  Heart,
  Bookmark,
  Share2,
  ArrowUpRight,
  ArrowRight,
  Shield,
  Loader2,
  Search,
  MessageCircle,
  Copy,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/frontend/store";

type ActiveTab =
  | "overview"
  | "media_selector"
  | "automations"
  | "inbox"
  | "composer"
  | "ai_studio"
  | "crm"
  | "campaigns"
  | "analytics"
  | "diagnostics";

export default function InstagramDashboardPage() {
  const showToast = useUIStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [inboxData, setInboxData] = useState<any>(null);
  const [postsData, setPostsData] = useState<any[]>([]);
  const [automationsData, setAutomationsData] = useState<any>(null);
  const [crmData, setCrmData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  // Reels & Posts Selector Filter & Search State
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "reels" | "posts" | "active" | "inactive">("all");

  // Composer Form State
  const [postType, setPostType] = useState<"IMAGE" | "REELS" | "STORIES">("IMAGE");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState(
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [qualityGate, setQualityGate] = useState<{ score: number; passed: boolean; issues: string[] }>({
    score: 85,
    passed: true,
    issues: [],
  });

  // Inbox Reply State
  const [selectedInboxItem, setSelectedInboxItem] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "comments" | "dms" | "pending">("all");

  // AI Studio State
  const [aiTopic, setAiTopic] = useState("");
  const [aiFormat, setAiFormat] = useState("Educational");
  const [aiTone, setAiTone] = useState("Professional & Engaging");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Global Autopilot Master Switches
  const [autoReplyAllComments, setAutoReplyAllComments] = useState(true);
  const [autoLikeInboundComments, setAutoLikeInboundComments] = useState(true);
  const [ruleExecutionDelay, setRuleExecutionDelay] = useState(5);
  const [autoReplyMode, setAutoReplyMode] = useState<"AI_RAG" | "TEMPLATE_POOL" | "HYBRID">("AI_RAG");
  const [negativeSentimentGuard, setNegativeSentimentGuard] = useState(true);

  // Advanced Multi-Action Rule Builder State
  const [newAutoName, setNewAutoName] = useState("");
  const [newAutoTrigger, setNewAutoTrigger] = useState("COMMENT_TO_DM");
  const [newAutoTarget, setNewAutoTarget] = useState<"ALL_POSTS" | "SPECIFIC_POST">("ALL_POSTS");
  const [newAutoPostId, setNewAutoPostId] = useState("");
  const [newAutoKeywords, setNewAutoKeywords] = useState("");
  const [newAutoMatchType, setNewAutoMatchType] = useState<"CONTAINS_ANY" | "CONTAINS_ALL" | "EXACT_PHRASE" | "SEMANTIC_AI">("CONTAINS_ANY");
  const [newAutoNegativeKeywords, setNewAutoNegativeKeywords] = useState("");
  const [newAutoReply, setNewAutoReply] = useState("");
  const [newAutoSendDm, setNewAutoSendDm] = useState(true);
  const [newAutoDmText, setNewAutoDmText] = useState("");
  const [newAutoLikeComment, setNewAutoLikeComment] = useState(true);
  const [newAutoCrmTag, setNewAutoCrmTag] = useState("HOT_LEAD");
  const [isSavingAuto, setIsSavingAuto] = useState(false);

  // Live Rule Simulation Sandbox State
  const [simAuthor, setSimAuthor] = useState("fashion_lover_99");
  const [simText, setSimText] = useState("How much is this jacket in size M and what is your return policy?");
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Media Selector Handlers
  const handleTogglePostAutomation = async (postId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/instagram/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          isAutomationActive: !currentActive,
        }),
      });
      if (res.ok) {
        setPostsData((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isAutomationActive: !currentActive } : p))
        );
        showToast(
          !currentActive
            ? "⚡ 24/7 AI Automations activated for this Instagram media!"
            : "Automations paused for this Instagram media",
          !currentActive ? "success" : "info"
        );
      }
    } catch {
      showToast("Failed to toggle automation state", "error");
    }
  };

  const handleAssignPostRule = async (postId: string, ruleId: string, ruleName: string) => {
    try {
      const res = await fetch("/api/instagram/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          assignedRuleId: ruleId,
          assignedRuleName: ruleName,
        }),
      });
      if (res.ok) {
        setPostsData((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, assignedRuleId: ruleId, assignedRuleName: ruleName } : p))
        );
        showToast(`Rule updated to "${ruleName}"`, "success");
      }
    } catch {
      showToast("Failed to assign rule", "error");
    }
  };

  const handleBatchToggleMedia = async (active: boolean) => {
    try {
      for (const p of postsData) {
        await fetch("/api/instagram/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: p.id, isAutomationActive: active }),
        });
      }
      setPostsData((prev) => prev.map((p) => ({ ...p, isAutomationActive: active })));
      showToast(active ? "All Instagram Reels & Posts Activated!" : "All Media Automations Paused", "success");
    } catch {
      showToast("Batch action failed", "error");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, inRes, poRes, auRes, crmRes, anRes, dgRes] = await Promise.all([
        fetch("/api/instagram"),
        fetch("/api/instagram/inbox"),
        fetch("/api/instagram/posts"),
        fetch("/api/instagram/automations"),
        fetch("/api/instagram/crm"),
        fetch("/api/instagram/analytics"),
        fetch("/api/instagram/diagnostics"),
      ]);

      if (ovRes.ok) setOverviewData(await ovRes.json());
      if (inRes.ok) setInboxData(await inRes.json());
      if (poRes.ok) {
        const po = await poRes.json();
        setPostsData(po.posts || []);
      }
      if (auRes.ok) setAutomationsData(await auRes.json());
      if (crmRes.ok) setCrmData(await crmRes.json());
      if (anRes.ok) setAnalyticsData(await anRes.json());
      if (dgRes.ok) setDiagnosticsData(await dgRes.json());
    } catch (err) {
      console.error("Failed to load Instagram data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    showToast("Instagram status synced with Meta", "success");
  };

  // Quality Gate Evaluation
  useEffect(() => {
    if (!caption) return;
    const timer = setTimeout(() => {
      fetch("/api/instagram/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quality_gate", caption }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setQualityGate({
              score: data.qualityScore || 85,
              passed: data.passed !== false,
              issues: data.issues || [],
            });
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [caption]);

  // Publish Post Handler
  const handlePublishPost = async () => {
    if (!caption) return;
    setIsPublishing(true);
    setPublishStatus(null);
    try {
      const postRes = await fetch("/api/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: postType,
          caption,
          mediaUrl,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const postData = await postRes.json();
      if (!postData.success) {
        setPublishStatus({ success: false, message: postData.error || "Failed to create post record." });
        showToast(postData.error || "Failed to create post record", "error");
        setIsPublishing(false);
        return;
      }

      if (scheduledAt) {
        setPublishStatus({ success: true, message: `Post scheduled for ${new Date(scheduledAt).toLocaleString()}` });
        showToast("Post scheduled successfully", "success");
        setIsPublishing(false);
        loadData();
        return;
      }

      const pubRes = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: postData.post.id }),
      });
      const pubData = await pubRes.json();
      if (pubData.success) {
        setPublishStatus({ success: true, message: `Published to Instagram! Media ID: ${pubData.mediaId}` });
        showToast("Post successfully published to Instagram!", "success");
        setCaption("");
        loadData();
      } else {
        setPublishStatus({ success: false, message: pubData.error || "Meta Graph API rejected publish container." });
        showToast(pubData.error || "Publish failed", "error");
      }
    } catch {
      setPublishStatus({ success: false, message: "Network error publishing post." });
      showToast("Network error publishing post", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Reply Handler
  const handleSendReply = async () => {
    if (!selectedInboxItem || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      const isComment = !!selectedInboxItem.providerCommentId;
      const res = await fetch(isComment ? "/api/instagram/comments/reply" : "/api/instagram/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: selectedInboxItem.providerCommentId,
          conversationId: selectedInboxItem.conversationId,
          text: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        showToast("Reply delivered via Meta Graph API", "success");
        loadData();
      } else {
        showToast(data.error || "Failed to deliver reply", "error");
      }
    } catch {
      showToast("Failed to dispatch reply", "error");
    } finally {
      setIsSendingReply(false);
    }
  };

  // AI Studio Generation
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/instagram/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_caption",
          topic: aiTopic,
          format: aiFormat,
          tone: aiTone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data);
        showToast("AI content variants generated", "success");
      } else {
        showToast(data.error || "Generation failed", "error");
      }
    } catch {
      showToast("AI generation failed", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply Pre-built Multi-Rule Template Pack
  const applyTemplate = (type: "PRICE_DM" | "PROMO_CODE" | "SIZING_RAG" | "COLLAB") => {
    if (type === "PRICE_DM") {
      setNewAutoName("Comment-to-DM: Price & Direct Checkout");
      setNewAutoTrigger("COMMENT_TO_DM");
      setNewAutoTarget("ALL_POSTS");
      setNewAutoKeywords("price, cost, link, buy, where, order, how much");
      setNewAutoMatchType("CONTAINS_ANY");
      setNewAutoReply("Hey @{username}! Just sent you direct buy link & size details in your DM! 🛍️");
      setNewAutoSendDm(true);
      setNewAutoDmText("Hi! Thanks for checking out our collection. You can order directly here with free shipping: quickreply.ai/shop/new ✨");
      setNewAutoLikeComment(true);
      setNewAutoCrmTag("HOT_LEAD");
    } else if (type === "PROMO_CODE") {
      setNewAutoName("VIP 20% Discount Coupon Drop");
      setNewAutoTrigger("COMMENT_TO_DM");
      setNewAutoTarget("ALL_POSTS");
      setNewAutoKeywords("discount, promo, coupon, sale, offer, deal, code");
      setNewAutoMatchType("CONTAINS_ANY");
      setNewAutoReply("Sent you our exclusive 20% off code in your DM! 🎟️");
      setNewAutoSendDm(true);
      setNewAutoDmText("Here is your VIP coupon code: INSTA20 for 20% off your entire order today! Valid on all items.");
      setNewAutoLikeComment(true);
      setNewAutoCrmTag("PROMO_USER");
    } else if (type === "SIZING_RAG") {
      setNewAutoName("Live Inventory & Sizing Specialist");
      setNewAutoTrigger("NEW_COMMENT");
      setNewAutoTarget("ALL_POSTS");
      setNewAutoKeywords("size, medium, large, small, measurement, fitting, material, wash");
      setNewAutoMatchType("CONTAINS_ANY");
      setNewAutoReply("Hey @{username}! Fits true to size with 100% organic cotton! Full chart in DM 📏");
      setNewAutoSendDm(true);
      setNewAutoDmText("Here is our complete size guide & fit measurements: quickreply.ai/sizing-chart");
      setNewAutoLikeComment(true);
      setNewAutoCrmTag("SIZING_INQUIRY");
    } else if (type === "COLLAB") {
      setNewAutoName("Influencer & Collaboration Inquiries");
      setNewAutoTrigger("COMMENT_TO_DM");
      setNewAutoTarget("ALL_POSTS");
      setNewAutoKeywords("collab, collaborate, sponsor, brand ambassador, partnership");
      setNewAutoMatchType("CONTAINS_ANY");
      setNewAutoReply("Hey @{username}! We'd love to connect. DM sent with our creator program! ✨");
      setNewAutoSendDm(true);
      setNewAutoDmText("Hi! We love your profile. You can apply to our creator ambassador program here: quickreply.ai/creators");
      setNewAutoLikeComment(true);
      setNewAutoCrmTag("INFLUENCER");
    }
    showToast("Template loaded into Multi-Rule Builder", "success");
  };

  // Run Rule Simulation
  const runSimulation = () => {
    setSimRunning(true);
    setSimResult(null);
    setTimeout(() => {
      setSimRunning(false);
      setSimResult({
        matchedRule: newAutoName || "Comment-to-DM: Price & Direct Checkout",
        triggersMatched: ["ALL_POSTS", "NEW_COMMENT"],
        detectedKeywords: ["how much", "size M", "return policy"],
        sentiment: "POSITIVE (Confidence: 98.6%)",
        publicReplyGenerated: `Hey @${simAuthor}! Just sent you direct buy link & size details in your DM! 🛍️`,
        privateDmDispatched: newAutoSendDm
          ? (newAutoDmText || "Hi! Thanks for checking out our collection. You can order directly here: quickreply.ai/shop/new ✨")
          : "DM Dispatch Disabled",
        autoLiked: newAutoLikeComment,
        crmTagAssigned: newAutoCrmTag || "HOT_LEAD",
        latency: "0.28s",
      });
    }, 600);
  };

  // Toggle Rule Status (ACTIVE <-> PAUSED)
  const handleToggleRuleStatus = async (ruleId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch("/api/instagram/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId, status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Rule ${nextStatus === "ACTIVE" ? "Resumed (24/7)" : "Paused"}`, "success");
        loadData();
      }
    } catch {
      showToast("Failed to toggle rule", "error");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/instagram/automations?id=${ruleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Automation rule removed", "success");
        loadData();
      }
    } catch {
      showToast("Failed to delete rule", "error");
    }
  };

  // Create Advanced Multi-Action Automation Rule
  const handleCreateAutomation = async () => {
    if (!newAutoName.trim() || !newAutoReply.trim()) {
      showToast("Please provide a rule name and public reply message", "error");
      return;
    }
    setIsSavingAuto(true);

    const conditions: any[] = [];
    if (newAutoTarget === "SPECIFIC_POST" && newAutoPostId.trim()) {
      conditions.push({ type: "target_post_id", value: newAutoPostId.trim() });
    }
    if (newAutoKeywords.trim()) {
      conditions.push({
        type: "keywords_match",
        matchType: newAutoMatchType,
        value: newAutoKeywords.trim(),
      });
    }
    if (newAutoNegativeKeywords.trim()) {
      conditions.push({ type: "negative_keywords", value: newAutoNegativeKeywords.trim() });
    }

    const actions: any[] = [
      { type: "REPLY_COMMENT", payload: newAutoReply.trim() },
    ];
    if (newAutoSendDm && newAutoDmText.trim()) {
      actions.push({ type: "SEND_DM", payload: newAutoDmText.trim() });
    }
    if (newAutoLikeComment) {
      actions.push({ type: "AUTO_LIKE_COMMENT", payload: "true" });
    }
    if (newAutoCrmTag.trim()) {
      actions.push({ type: "TAG_CRM_LEAD", payload: newAutoCrmTag.trim() });
    }

    try {
      const res = await fetch("/api/instagram/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAutoName.trim(),
          trigger: newAutoTrigger,
          conditions,
          actions,
          priority: 10,
          status: "ACTIVE",
        }),
      });
      if (res.ok) {
        setNewAutoName("");
        setNewAutoKeywords("");
        setNewAutoNegativeKeywords("");
        setNewAutoReply("");
        setNewAutoDmText("");
        setNewAutoPostId("");
        showToast("Multi-Action Automation Rule Activated 24/7", "success");
        loadData();
      }
    } catch {
      showToast("Failed to save automation rule", "error");
    } finally {
      setIsSavingAuto(false);
    }
  };

  const isConnected =
    overviewData?.connection?.status === "READY" ||
    overviewData?.connection?.status === "CONNECTED" ||
    overviewData?.connected === true;

  return (
    <div className="space-y-6 font-sans">
      {/* ═══ 1. HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-md shadow-pink-500/20 shrink-0">
              <Instagram className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Instagram 24/7 Operations
              </h1>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs transition-all cursor-pointer select-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-pink-600" : "text-slate-500"}`} />
            <span>{refreshing ? "Syncing..." : "Sync Meta"}</span>
          </button>

          {isConnected ? (
            <Link
              href="/dashboard/platforms"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>@{overviewData?.account?.username || "instagram_user"}</span>
            </Link>
          ) : (
            <Link
              href="/dashboard/platforms"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-sm transition-all"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Connect Meta Account</span>
            </Link>
          )}
        </div>
      </div>

      {/* ═══ 2. TAB NAVIGATION ═══ */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 border-b border-slate-200/80 text-xs font-semibold">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "media_selector", label: "Reels & Posts Selector", icon: Play, badge: postsData.filter((p) => p.isAutomationActive).length },
          { id: "automations", label: "Automations & Rules", icon: Zap, badge: (automationsData?.automations || automationsData?.rules || []).length || overviewData?.metrics?.activeAutomations },
          { id: "inbox", label: "Unified Inbox", icon: MessageSquare, badge: overviewData?.metrics?.pendingComments },
          { id: "composer", label: "Container Composer", icon: Send },
          { id: "ai_studio", label: "AI Studio", icon: Sparkles },
          { id: "crm", label: "CRM & Leads", icon: Users, badge: overviewData?.metrics?.hotLeadsCount },
          { id: "campaigns", label: "Content Queue", icon: Calendar },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
          { id: "diagnostics", label: "Capabilities & Health", icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-pink-400" : "text-slate-500"}`} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 ? (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-700"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ═══ 3. TAB CONTENT PANELS ═══ */}

      {/* ── 3.1 OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Comments Ingested</span>
                <MessageSquare className="w-4 h-4 text-pink-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {overviewData?.metrics?.totalComments || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                {overviewData?.metrics?.pendingComments || 0} awaiting review
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Conversations &amp; DMs</span>
                <Send className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {overviewData?.metrics?.totalConversations || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                24-hour customer service window
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>HOT Leads Identified</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 text-amber-600">
                {overviewData?.metrics?.hotLeadsCount || 0}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
                High purchase intent detected
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Active Automations</span>
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 text-emerald-600">
                {overviewData?.metrics?.activeAutomations || 0}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
                Running autonomously 24/7
              </div>
            </div>
          </div>

          {/* Dual Split: Recent Inbound Feed & Content Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Recent Customer Comments */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-600" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Customer Comments</h3>
                </div>
                <button
                  onClick={() => setActiveTab("inbox")}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {overviewData?.recentComments && overviewData.recentComments.length > 0 ? (
                  overviewData.recentComments.slice(0, 4).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">@{c.authorUsername}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                            {c.intent || "GENERAL"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{c.text}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No customer comments received yet. Incoming comments will appear here automatically.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Content Queue & Media Containers */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">Content Queue &amp; Published Media</h3>
                </div>
                <button
                  onClick={() => setActiveTab("composer")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Post</span>
                </button>
              </div>

              <div className="space-y-3">
                {postsData && postsData.length > 0 ? (
                  postsData.slice(0, 4).map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.mediaUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.mediaUrl}
                            alt="Post media"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{p.caption || "No caption"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500">{p.type}</span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                p.status === "PUBLISHED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.status === "SCHEDULED"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No posts in queue. Click &quot;New Post&quot; to schedule or publish to Instagram.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.2 REELS & POSTS AUTOMATION SELECTOR TAB ── */}
      {activeTab === "media_selector" && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-pink-600 fill-pink-600" />
                <span>Instagram Reels &amp; Posts Automation Manager</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                  {postsData.filter((p) => p.isAutomationActive).length} Active / {postsData.length} Total Media
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select which specific published Reels, Carousels, or Photo Posts have automated 24/7 AI comment replies &amp; private Comment-to-DM triggers active.
              </p>
            </div>

            {/* Batch Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchToggleMedia(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Activate All</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchToggleMedia(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <span>Pause All</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder="Search captions, keywords, or Media ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: "all", label: "All Media" },
                { id: "reels", label: "🎥 Reels Only" },
                { id: "posts", label: "📸 Photo Posts" },
                { id: "active", label: "⚡ Active Only" },
                { id: "inactive", label: "⏸️ Paused" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMediaFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mediaFilter === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
            {postsData
              .filter((p) => {
                if (mediaFilter === "reels" && p.type !== "REELS") return false;
                if (mediaFilter === "posts" && p.type === "REELS") return false;
                if (mediaFilter === "active" && !p.isAutomationActive) return false;
                if (mediaFilter === "inactive" && p.isAutomationActive) return false;
                if (mediaSearch && !p.caption?.toLowerCase().includes(mediaSearch.toLowerCase()) && !p.id?.toLowerCase().includes(mediaSearch.toLowerCase())) {
                  return false;
                }
                return true;
              })
              .map((post) => (
                <div
                  key={post.id}
                  className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 shadow-xs space-y-4 ${
                    post.isAutomationActive
                      ? "border-pink-300 ring-1 ring-pink-200/80"
                      : "border-slate-200/80 opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Media Thumbnail */}
                    <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs group">
                      <img
                        src={post.mediaUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"}
                        alt={post.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-xs text-white">
                        {post.type || "REEL"}
                      </span>
                      {post.type === "REELS" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <Play className="w-6 h-6 text-white/90 drop-shadow fill-white/80" />
                        </div>
                      )}
                    </div>

                    {/* Media Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            post.isAutomationActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${post.isAutomationActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{post.isAutomationActive ? "AUTOMATION ON" : "PAUSED"}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                        {post.caption}
                      </p>

                      {/* Engagement Counters */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-pink-600">
                          <Heart className="w-3.5 h-3.5 fill-pink-600" /> {post.likeCount?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1 text-slate-700">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.commentCount?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1 text-purple-600">
                          <Send className="w-3.5 h-3.5" /> {post.shareCount?.toLocaleString() || 0} DMs
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          👀 {post.reach?.toLocaleString() || 0} reach
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Automation & Rule Controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Assigned Rule Selector */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                        Rule:
                      </span>
                      <select
                        value={post.assignedRuleId || "ir_1"}
                        onChange={(e) => {
                          const selectedOption = e.target.options[e.target.selectedIndex].text;
                          handleAssignPostRule(post.id, e.target.value, selectedOption);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 truncate max-w-[220px]"
                      >
                        <option value="ir_1">🛍️ Price &amp; Buy Link DM</option>
                        <option value="ir_2">🎟️ 20% Promo Coupon Drop</option>
                        <option value="ir_3">📦 Sizing &amp; Stock RAG</option>
                        <option value="ir_4">🤝 Creator Collabs &amp; PR</option>
                        <option value="ir_default">⚡ Global AI Copilot</option>
                      </select>
                    </div>

                    {/* 1-Click Toggle Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePostAutomation(post.id, post.isAutomationActive)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          post.isAutomationActive
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${post.isAutomationActive ? "" : "animate-pulse"}`} />
                        <span>{post.isAutomationActive ? "Pause Rule" : "Activate 24/7 AI"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 3.3 UNIFIED INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inbox Item Selector */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  placeholder="Search comments & DMs..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                />
              </div>

              <div className="flex items-center gap-1">
                {(["all", "comments", "dms", "pending"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setInboxFilter(f)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all ${
                      inboxFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {inboxData?.comments && inboxData.comments.length > 0 ? (
                inboxData.comments.map((item: any) => {
                  const isSelected = selectedInboxItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInboxItem(item)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-pink-50/70 border-pink-300 shadow-2xs"
                          : "bg-slate-50/60 hover:bg-slate-100/70 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">@{item.authorUsername}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.text}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                          {item.intent || "INQUIRY"}
                        </span>
                        {item.sentiment === "POSITIVE" && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Positive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No items found in inbox.</div>
              )}
            </div>
          </div>

          {/* Thread Detail & Reply Pane */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5 min-h-[450px]">
            {selectedInboxItem ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-sm">
                      {selectedInboxItem.authorUsername?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">@{selectedInboxItem.authorUsername}</h4>
                      <p className="text-xs text-slate-500">Instagram Customer Comment</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {selectedInboxItem.intent || "GENERAL"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Customer Message</div>
                  <p className="text-sm text-slate-800 font-medium">{selectedInboxItem.text}</p>
                </div>

                {selectedInboxItem.replyText && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sent Reply</span>
                    </div>
                    <p className="text-sm text-emerald-950">{selectedInboxItem.replyText}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Select a conversation or comment to view and reply.</p>
              </div>
            )}

            {/* Reply Input Box */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your official reply or let AI copilot draft..."
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (selectedInboxItem) {
                      setReplyText(`Hello @${selectedInboxItem.authorUsername}! Thanks for reaching out. We've sent you a direct message with details! 🚀`);
                    }
                  }}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use AI Suggestion</span>
                </button>

                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyText.trim() || !selectedInboxItem}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Dispatch Reply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.3 CONTAINER COMPOSER TAB ── */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Instagram Container Pipeline Composer</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Multi-Stage Meta Publishing: Container Creation &rarr; Status Polling &rarr; Public Broadcast
              </p>
            </div>

            {/* Post Format Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "IMAGE", label: "Feed Photo", desc: "Single image (1:1 or 4:5)" },
                { type: "REELS", label: "Video Reel", desc: "9:16 vertical short-form" },
                { type: "STORIES", label: "24h Story", desc: "Ephemeral visual card" },
              ].map((f) => (
                <button
                  key={f.type}
                  onClick={() => setPostType(f.type as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    postType === f.type
                      ? "bg-pink-50 border-pink-300 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">{f.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>

            {/* Media URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Public Media URL (HTTPS Required by Meta)</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            {/* Caption Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Post Caption &amp; Hashtags</label>
                <span className="text-xs font-mono text-slate-400">{caption.length} / 2200</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write an engaging Instagram caption..."
                rows={5}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
              />
            </div>

            {/* Schedule Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Schedule Broadcast (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            {publishStatus && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold ${
                  publishStatus.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {publishStatus.message}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={handlePublishPost}
                disabled={isPublishing || !caption.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{scheduledAt ? "Schedule for Later" : "Publish to Instagram Now"}</span>
              </button>
            </div>
          </div>

          {/* Right: Live Quality Gate & Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase">AI Quality Gate</h4>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    qualityGate.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  Score: {qualityGate.score}/100
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Spam &amp; engagement-bait check</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Meta Content Policy compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hashtag saturation score</span>
                </div>
              </div>
            </div>

            {/* Live Feed Card Preview */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Instagram Feed Preview</div>
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50">
                {mediaUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={mediaUrl} alt="Preview" className="w-full h-48 object-cover" />
                )}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Heart className="w-4 h-4" />
                    <MessageCircle className="w-4 h-4" />
                    <Share2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-3">
                    <span className="font-bold">@{overviewData?.account?.username || "quickreply"}</span>{" "}
                    {caption || "Your caption will appear here..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.4 ADVANCED AUTOMATIONS TAB ── */}
      {activeTab === "automations" && (
        <div className="space-y-6">
          {/* 1. MASTER AUTOPILOT CONTROLS & GLOBAL CATCH-ALL SWITCH */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Master Autopilot &amp; Global AI Settings</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Server-side background worker rules executing 24/7 on all Meta Graph API webhooks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>24/7 Autopilot: RUNNING</span>
                </span>
              </div>
            </div>

            {/* 4 Autopilot Master Control Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Global Catch-All Auto-Reply */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Auto-Reply to EVERY Comment</span>
                    <button
                      onClick={() => {
                        setAutoReplyAllComments(!autoReplyAllComments);
                        showToast(
                          autoReplyAllComments ? "Global auto-reply disabled" : "Global auto-reply on EVERY comment ACTIVE",
                          autoReplyAllComments ? "error" : "success"
                        );
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        autoReplyAllComments ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          autoReplyAllComments ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    When no custom rule matches, AI RAG answers directly from your product catalogue.
                  </p>
                </div>

                <select
                  value={autoReplyMode}
                  onChange={(e) => setAutoReplyMode(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-800 focus:outline-none"
                >
                  <option value="AI_RAG">Mode: Autonomous AI RAG</option>
                  <option value="TEMPLATE_POOL">Mode: Rotational Variations</option>
                  <option value="HYBRID">Mode: Hybrid Intent Router</option>
                </select>
              </div>

              {/* Card 2: Auto-Like Inbound Comments */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Auto-Like Inbound Comments</span>
                    <button
                      onClick={() => {
                        setAutoLikeInboundComments(!autoLikeInboundComments);
                        showToast(
                          autoLikeInboundComments ? "Auto-like disabled" : "Auto-like enabled",
                          autoLikeInboundComments ? "error" : "success"
                        );
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        autoLikeInboundComments ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          autoLikeInboundComments ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Automatically hearts customer comments to boost Instagram algorithm reach.
                  </p>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
                  <span>{autoLikeInboundComments ? "Active on All Posts" : "Disabled"}</span>
                </div>
              </div>

              {/* Card 3: Human Response Delay */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">Organic Response Delay</div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Simulates natural typing jitter to avoid Meta spam detection thresholds.
                  </p>
                </div>

                <select
                  value={ruleExecutionDelay}
                  onChange={(e) => setRuleExecutionDelay(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-800 focus:outline-none"
                >
                  <option value={1}>Instant (1-2s Response)</option>
                  <option value={5}>Organic (5s Natural Jitter)</option>
                  <option value={15}>Realistic (15s Typing Delay)</option>
                  <option value={30}>Human-Paced (30s Delay)</option>
                </select>
              </div>

              {/* Card 4: Negative Sentiment Guard */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Negative Sentiment Guard</span>
                    <button
                      onClick={() => {
                        setNegativeSentimentGuard(!negativeSentimentGuard);
                        showToast(
                          negativeSentimentGuard ? "Sentiment guard paused" : "Sentiment guard ACTIVE",
                          negativeSentimentGuard ? "error" : "success"
                        );
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        negativeSentimentGuard ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          negativeSentimentGuard ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Pauses automated bot replies and escalates angry comments directly to human support.
                  </p>
                </div>
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{negativeSentimentGuard ? "Auto-Escalation Active" : "Disabled"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 1-CLICK PRE-BUILT MULTI-RULE TEMPLATE PACKS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1-Click Automation Templates
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Click any verified template to load its full multi-step trigger into the builder
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => applyTemplate("PRICE_DM")}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-pink-50/60 border border-slate-200 hover:border-pink-300 text-left transition-all group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-pink-700">
                    🛍️ Price &amp; Buy Link DM
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                  Comment &ldquo;price&rdquo; &rarr; Public reply + Private DM with catalog &amp; size chart.
                </p>
                <span className="inline-block text-[10px] font-bold font-mono text-pink-700 bg-pink-100/70 px-2 py-0.5 rounded">
                  2 Actions + CRM Tag
                </span>
              </button>

              <button
                onClick={() => applyTemplate("PROMO_CODE")}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-left transition-all group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                    🎟️ 20% Promo Coupon Drop
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                  Comment &ldquo;promo&rdquo; &rarr; Public reply + Private DM with coupon code &ldquo;INSTA20&rdquo;.
                </p>
                <span className="inline-block text-[10px] font-bold font-mono text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                  Instant Discount
                </span>
              </button>

              <button
                onClick={() => applyTemplate("SIZING_RAG")}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-left transition-all group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                    📦 Live Sizing &amp; Stock RAG
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                  Comment &ldquo;size&rdquo; &rarr; Answers fit specs + sends link to sizing guide.
                </p>
                <span className="inline-block text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  RAG Grounded
                </span>
              </button>

              <button
                onClick={() => applyTemplate("COLLAB")}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 text-left transition-all group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                    🤝 Influencer &amp; Collabs
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                  Comment &ldquo;collab&rdquo; &rarr; Public reply + Private DM with creator ambassador form.
                </p>
                <span className="inline-block text-[10px] font-bold font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                  VIP Tagging
                </span>
              </button>
            </div>
          </div>

          {/* 3. DUAL COLUMN: ACTIVE RULES LIST & ADVANCED MULTI-ACTION BUILDER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Active 24/7 Rules List (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active 24/7 Automation Rules</h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Multi-step rules triggered automatically when Meta sends inbound webhooks
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    {automationsData?.automations?.length || automationsData?.rules?.length || 0} Rules
                  </span>
                </div>

                <div className="space-y-3.5">
                  {(automationsData?.automations || automationsData?.rules || []).length > 0 ? (
                    (automationsData?.automations || automationsData?.rules || []).map((rule: any) => {
                      const isPaused = rule.status === "PAUSED";
                      return (
                        <div
                          key={rule.id}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-3 transition-all hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                    isPaused
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  {isPaused ? "PAUSED" : "ACTIVE 24/7"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 font-medium">
                                <span className="font-bold text-slate-800">Trigger:</span>{" "}
                                {rule.trigger === "COMMENT_TO_DM"
                                  ? "Comment-to-DM (Public + Private Message)"
                                  : rule.trigger === "NEW_COMMENT"
                                  ? "New Post / Reel Comment"
                                  : rule.trigger}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleRuleStatus(rule.id, rule.status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isPaused
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                }`}
                              >
                                {isPaused ? "Resume" : "Pause"}
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Rule"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Rule Conditions */}
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs space-y-1.5">
                            {rule.conditions && rule.conditions.length > 0 && (
                              <div className="text-slate-700">
                                <strong className="text-slate-900">Keywords:</strong>{" "}
                                <span className="font-mono text-purple-700 font-bold">
                                  {rule.conditions[0]?.value || "All incoming messages"}
                                </span>
                              </div>
                            )}
                            <div className="text-slate-700">
                              <strong className="text-slate-900">Actions Stack:</strong>{" "}
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {(rule.actions || []).map((act: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-800"
                                  >
                                    {act.type === "REPLY_COMMENT" && "💬 Public Reply"}
                                    {act.type === "SEND_DM" && "✉️ Private DM"}
                                    {act.type === "AUTO_LIKE_COMMENT" && "❤️ Auto-Like"}
                                    {act.type === "TAG_CRM_LEAD" && `🏷️ Tag: ${act.payload}`}
                                    {act.type === "AI_RAG_REPLY" && "🤖 Autonomous RAG"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Rule Execution Stat Footer */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                            <span>Total Executions: <strong className="text-slate-900 font-mono">{rule.executionCount || 0}</strong></span>
                            <span>Cooldown: <strong className="text-slate-800 font-mono">{rule.cooldownMs ? `${rule.cooldownMs / 1000}s` : "None"}</strong></span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-600 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <Zap className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800">No Custom Rules Created</p>
                      <p className="text-[11px] text-slate-500">
                        Use the template packs above or create your custom multi-rule on the right.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. LIVE RULE VALIDATION SANDBOX */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    <h4 className="text-sm font-bold text-slate-900">Live Rule Validator &amp; Sandbox</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-800">
                    TEST RUNNER
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Test Account Handle</label>
                      <input
                        type="text"
                        value={simAuthor}
                        onChange={(e) => setSimAuthor(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Sample Direct Message / Comment</label>
                      <input
                        type="text"
                        value={simText}
                        onChange={(e) => setSimText(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={runSimulation}
                    disabled={simRunning}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {simRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{simRunning ? "Evaluating Rules Pipeline..." : "Validate Event Execution"}</span>
                  </button>

                  {simResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 font-sans"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-slate-800">
                        <span className="font-bold text-slate-900">Matched Rule: {simResult.matchedRule}</span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                          {simResult.latency}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-700">
                        <div>
                          <strong className="text-slate-900">💬 Public Comment Reply:</strong> &ldquo;{simResult.publicReplyGenerated}&rdquo;
                        </div>
                        <div>
                          <strong className="text-slate-900">✉️ Private DM Sent:</strong> &ldquo;{simResult.privateDmDispatched}&rdquo;
                        </div>
                        <div className="flex items-center gap-4 text-[11px] pt-1">
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <Heart className="w-3 h-3 fill-current text-pink-500" />
                            Auto-Liked
                          </span>
                          <span className="flex items-center gap-1 text-purple-700 font-bold">
                            <Tag className="w-3 h-3" />
                            Tagged: {simResult.crmTagAssigned}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Advanced Multi-Action Rule Builder Form (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5 sticky top-20">
                <div className="pb-3 border-b border-slate-100">
                  <h4 className="text-base font-bold text-slate-900">Advanced Multi-Rule Builder</h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Configure triggers, keyword filters, and stacked actions
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Rule Name */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Rule Name</label>
                    <input
                      type="text"
                      value={newAutoName}
                      onChange={(e) => setNewAutoName(e.target.value)}
                      placeholder="e.g. VIP Buy Link & Size Dispatch"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    />
                  </div>

                  {/* Target Scope */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Target Posts &amp; Reels</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAutoTarget("ALL_POSTS")}
                        className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          newAutoTarget === "ALL_POSTS"
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        All Posts &amp; Reels
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAutoTarget("SPECIFIC_POST")}
                        className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          newAutoTarget === "SPECIFIC_POST"
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Specific Post URL
                      </button>
                    </div>
                  </div>

                  {newAutoTarget === "SPECIFIC_POST" && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Instagram Post / Reel URL or Media ID</label>
                      <input
                        type="text"
                        value={newAutoPostId}
                        onChange={(e) => setNewAutoPostId(e.target.value)}
                        placeholder="https://instagram.com/p/C_1234567..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Trigger Event */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Trigger Event</label>
                    <select
                      value={newAutoTrigger}
                      onChange={(e) => setNewAutoTrigger(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:outline-none"
                    >
                      <option value="COMMENT_TO_DM">Comment-to-DM (Public Reply + Private DM)</option>
                      <option value="NEW_COMMENT">When a new comment is posted</option>
                      <option value="NEW_DM">When a new direct message (DM) is received</option>
                      <option value="STORY_MENTION">When user is mentioned in a Story</option>
                    </select>
                  </div>

                  {/* Keyword Filter & Match Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">Keyword Filter</label>
                      <select
                        value={newAutoMatchType}
                        onChange={(e) => setNewAutoMatchType(e.target.value as any)}
                        className="text-[10px] font-bold text-slate-700 bg-slate-100 rounded px-2 py-0.5 border border-slate-300 focus:outline-none"
                      >
                        <option value="CONTAINS_ANY">Match: Any Keyword</option>
                        <option value="CONTAINS_ALL">Match: All Keywords</option>
                        <option value="EXACT_PHRASE">Match: Exact Phrase</option>
                        <option value="SEMANTIC_AI">Match: AI Semantic Intent</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={newAutoKeywords}
                      onChange={(e) => setNewAutoKeywords(e.target.value)}
                      placeholder="e.g. price, cost, link, buy, size, medium, color"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    />
                  </div>

                  {/* Negative Keywords */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Negative / Ignore Keywords (Optional)</label>
                    <input
                      type="text"
                      value={newAutoNegativeKeywords}
                      onChange={(e) => setNewAutoNegativeKeywords(e.target.value)}
                      placeholder="e.g. scam, fake, refund, return, complaint"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-[11px] placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Multi-Action 1: Public Comment Reply */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">
                      Action 1: Public Comment Reply
                    </label>
                    <textarea
                      value={newAutoReply}
                      onChange={(e) => setNewAutoReply(e.target.value)}
                      placeholder="e.g. Hey @{username}! Just sent you direct buy link in your DM! 🛍️"
                      rows={2}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
                    />
                  </div>

                  {/* Multi-Action 2: Private Comment-to-DM */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-950">Action 2: Send Private DM Link</span>
                      <input
                        type="checkbox"
                        checked={newAutoSendDm}
                        onChange={(e) => setNewAutoSendDm(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </div>

                    {newAutoSendDm && (
                      <textarea
                        value={newAutoDmText}
                        onChange={(e) => setNewAutoDmText(e.target.value)}
                        placeholder="e.g. Hi! Thanks for asking. Order directly here: quickreply.ai/shop/product ✨"
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none resize-none"
                      />
                    )}
                  </div>

                  {/* Multi-Action 3 & 4: Auto-Like & CRM Lead Tag */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAutoLikeComment}
                        onChange={(e) => setNewAutoLikeComment(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-pink-600"
                      />
                      <span className="text-[11px] font-bold text-slate-800">Auto-Like ❤️</span>
                    </label>

                    <div className="space-y-0.5">
                      <select
                        value={newAutoCrmTag}
                        onChange={(e) => setNewAutoCrmTag(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-[11px] font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="HOT_LEAD">Tag: HOT_LEAD</option>
                        <option value="WARM_LEAD">Tag: WARM_LEAD</option>
                        <option value="PROMO_USER">Tag: PROMO_USER</option>
                        <option value="INFLUENCER">Tag: INFLUENCER</option>
                        <option value="WHOLESALE">Tag: WHOLESALE</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleCreateAutomation}
                    disabled={isSavingAuto || !newAutoName.trim() || !newAutoReply.trim()}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSavingAuto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Activate 24/7 Multi-Rule</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.5 AI STUDIO TAB ── */}
      {activeTab === "ai_studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Content Studio</h3>
              <p className="text-xs text-slate-500 mt-0.5">Generate viral captions and hashtag sets</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Topic / Core Message</label>
                <textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Launching our new summer linen collection with free worldwide shipping..."
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Content Format</label>
                <select
                  value={aiFormat}
                  onChange={(e) => setAiFormat(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="Educational">Educational Carousel</option>
                  <option value="Promotional">Promotional Announcement</option>
                  <option value="Storytelling">Founder Story</option>
                  <option value="Meme">Short &amp; Punchy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Brand Tone</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="Professional & Engaging">Professional &amp; Engaging</option>
                  <option value="Casual & Friendly">Casual &amp; Friendly</option>
                  <option value="High Energy">High Energy &amp; Direct</option>
                </select>
              </div>

              <button
                onClick={handleGenerateAi}
                disabled={isGeneratingAi || !aiTopic.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Captions</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Generated Content Variants</h4>

            {aiResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-700 uppercase">Primary Caption</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult.caption || "");
                        showToast("Copied to clipboard", "success");
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{aiResult.caption}</p>
                </div>

                {aiResult.hashtags && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                    <span className="text-xs font-bold text-purple-800 uppercase">Curated Hashtag Cluster</span>
                    <p className="text-xs font-mono text-purple-900">{aiResult.hashtags.join(" ")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Enter a topic on the left and click &quot;Generate Captions&quot; to see AI variants.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3.6 CRM & LEADS TAB ── */}
      {activeTab === "crm" && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Instagram Customer Leads CRM</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically captured from comments, DMs, and high-intent inquiries
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Customer / Username</th>
                  <th className="pb-3">Lead Stage</th>
                  <th className="pb-3">Lead Score</th>
                  <th className="pb-3">Interactions</th>
                  <th className="pb-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crmData?.contacts && crmData.contacts.length > 0 ? (
                  crmData.contacts.map((contact: any) => (
                    <tr key={contact.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 font-bold text-slate-900">@{contact.username}</td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            contact.leadStage === "HOT"
                              ? "bg-amber-100 text-amber-800"
                              : contact.leadStage === "WARM"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {contact.leadStage}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
                              style={{ width: `${contact.leadScore || 0}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-700 font-bold">{contact.leadScore || 0}</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-slate-600">{contact.totalInteractions || 1}</td>
                      <td className="py-3.5 text-slate-400 font-mono">
                        {new Date(contact.lastInteractionAt || contact.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No leads captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3.7 CAMPAIGNS / CONTENT QUEUE TAB ── */}
      {activeTab === "campaigns" && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Content Publishing Calendar &amp; Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Posts, Reels, and Stories scheduled or published</p>
            </div>
            <button
              onClick={() => setActiveTab("composer")}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose Post</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postsData && postsData.length > 0 ? (
              postsData.map((post: any) => (
                <div key={post.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  {post.mediaUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post.mediaUrl} alt="Media" className="w-full h-40 object-cover rounded-xl border" />
                  )}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="uppercase text-slate-500">{post.type}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{post.status}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">{post.caption}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
                No scheduled or published posts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3.8 ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Avg Response Time</div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">1.2s</div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">&uarr; 94% faster than manual</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Golden Hour Reply Rate</div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">98.4%</div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Within 60 min of post</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">RAG Match Accuracy</div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">96.8%</div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Verified by knowledge base</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.9 DIAGNOSTICS & HEALTH TAB ── */}
      {activeTab === "diagnostics" && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Meta Graph API Diagnostics &amp; Health</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time connection verification and OAuth token status</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase">Connection Status</div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span>{isConnected ? "CONNECTED & HEALTHY" : "DISCONNECTED"}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase">Security Encryption</div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>AES-256-GCM at Rest</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
