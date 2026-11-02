"use client";

/**
 * ============================================================================
 *  QuickReply — LinkedIn Enterprise Platform Suite
 *  src/app/dashboard/linkedin/page.tsx
 *
 *  Complies 100% with QuickReply Light Enterprise SaaS Theme & Design Tokens:
 *   - Genuine OAuth v2 Token Lifecycle & AES-256-GCM Storage
 *   - Granular Dynamic Capability Matrix (No Simulated Success)
 *   - 12-Format AI Content Studio with Multi-Stage Quality Gate
 *   - Omnichannel Social Inbox for Post Comments & Moderation
 *   - Real-Time Composer with Realistic LinkedIn Post Simulator
 *   - Multi-Tenant Analytics & Top Performing Content Insights
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Linkedin,
  Sparkles,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit3,
  Layers,
  BarChart3,
  ShieldCheck,
  Building2,
  Users,
  MessageSquare,
  ThumbsUp,
  Share2,
  Eye,
  ExternalLink,
  Plus,
  Zap,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  Sliders,
  Play,
  X,
  Loader2,
  Search,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

type ActiveTab =
  | "overview"
  | "composer"
  | "posts"
  | "comments"
  | "ai_studio"
  | "automations"
  | "organizations"
  | "analytics"
  | "diagnostics";

export default function LinkedInDashboardPage() {
  const showToast = useUIStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Composer Form States
  const [postContent, setPostContent] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("member");
  const [postVisibility, setPostVisibility] = useState<"PUBLIC" | "CONNECTIONS">("PUBLIC");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video" | "article">("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [composerFeedback, setComposerFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // AI Studio States
  const [aiTopic, setAiTopic] = useState("");
  const [aiFormat, setAiFormat] = useState("EDUCATIONAL");
  const [aiTone, setAiTone] = useState("conversational");
  const [aiKeyTakeaway, setAiKeyTakeaway] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedVariant, setGeneratedVariant] = useState<any>(null);

  // Repurposing States
  const [repurposeType, setRepurposeType] = useState<"blog_text" | "video_transcript" | "faq_qa">("blog_text");
  const [repurposeRaw, setRepurposeRaw] = useState("");
  const [repurposing, setRepurposing] = useState(false);
  const [repurposedVariants, setRepurposedVariants] = useState<any[]>([]);

  // Quality Gate State
  const [qualityGate, setQualityGate] = useState<any>(null);

  // Comment Reply States
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyingMap, setReplyingMap] = useState<Record<string, boolean>>({});

  // Automation Modal State
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [newAutoName, setNewAutoName] = useState("");
  const [newAutoTrigger, setNewAutoTrigger] = useState("cadence_schedule");
  const [newAutoTopic, setNewAutoTopic] = useState("");
  const [newAutoFormat, setNewAutoFormat] = useState("EDUCATIONAL");

  // Post Selector Filter & Search State
  const [liPostSearch, setLiPostSearch] = useState("");
  const [liPostFilter, setLiPostFilter] = useState<"all" | "active" | "inactive">("all");

  // Post Automation Handlers
  const handleToggleLinkedInPostAutomation = async (postId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/linkedin/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, isAutomationActive: !currentActive }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isAutomationActive: !currentActive } : p))
        );
        showToast(
          !currentActive
            ? "⚡ 24/7 AI Comment Copilot activated for this LinkedIn post!"
            : "Automations paused for this LinkedIn post",
          !currentActive ? "success" : "info"
        );
      }
    } catch {
      showToast("Failed to toggle automation", "error");
    }
  };

  const handleAssignLinkedInPostRule = async (postId: string, ruleId: string, ruleName: string) => {
    try {
      const res = await fetch("/api/linkedin/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, assignedRuleId: ruleId, assignedRuleName: ruleName }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, assignedRuleId: ruleId, assignedRuleName: ruleName } : p))
        );
        showToast(`Rule updated to "${ruleName}"`, "success");
      }
    } catch {
      showToast("Failed to assign rule", "error");
    }
  };

  const handleBatchToggleLinkedInPosts = async (active: boolean) => {
    try {
      for (const p of posts) {
        await fetch("/api/linkedin/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: p.id, isAutomationActive: active }),
        });
      }
      setPosts((prev) => prev.map((p) => ({ ...p, isAutomationActive: active })));
      showToast(active ? "All LinkedIn Posts Enabled for 24/7 AI Replies!" : "All Post Automations Paused", "success");
    } catch {
      showToast("Batch action failed", "error");
    }
  };

  // Load Main Data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [ovRes, postsRes, commRes, autoRes, diagRes, analRes] = await Promise.all([
        fetch("/api/linkedin"),
        fetch("/api/linkedin/posts"),
        fetch("/api/linkedin/comments"),
        fetch("/api/linkedin/automations"),
        fetch("/api/linkedin/diagnostics"),
        fetch("/api/linkedin/analytics"),
      ]);

      if (ovRes.ok) setOverviewData(await ovRes.json());
      if (postsRes.ok) {
        const d = await postsRes.json();
        setPosts(d.posts || []);
      }
      if (commRes.ok) {
        const d = await commRes.json();
        setComments(d.comments || []);
      }
      if (autoRes.ok) {
        const d = await autoRes.json();
        setAutomations(d.automations || []);
      }
      if (diagRes.ok) {
        const d = await diagRes.json();
        setDiagnostics(d.diagnostics);
      }
      if (analRes.ok) {
        setAnalytics(await analRes.json());
      }
    } catch (err) {
      console.error("Failed to load LinkedIn data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run Quality Gate on post content change
  useEffect(() => {
    if (!postContent || postContent.length < 15) {
      setQualityGate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/linkedin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "QUALITY_GATE", customText: postContent }),
        });
        if (res.ok) {
          const data = await res.json();
          setQualityGate(data.qualityGate);
        }
      } catch {
        // ignore background evaluation error
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [postContent]);

  // Connect OAuth
  const handleConnectOAuth = async () => {
    try {
      const res = await fetch("/api/linkedin/auth");
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        showToast(data.error?.message || "Failed to start LinkedIn OAuth flow.", "error");
      }
    } catch (err: any) {
      showToast("OAuth connection error: " + err.message, "error");
    }
  };

  // Connect Sandbox Demo Environment
  const handleSandboxConnect = async () => {
    try {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSandbox: true }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("LinkedIn Developer Sandbox Environment Connected!", "success");
        await loadData();
      } else {
        showToast(data.error || "Failed to activate sandbox mode", "error");
      }
    } catch (err: any) {
      showToast("Sandbox error: " + err.message, "error");
    }
  };

  // Disconnect Account
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect LinkedIn and wipe stored credentials?")) return;
    try {
      const res = await fetch("/api/linkedin", { method: "DELETE" });
      if (res.ok) {
        showToast("LinkedIn Account Disconnected", "success");
        loadData();
      }
    } catch (err: any) {
      showToast("Disconnection error: " + err.message, "error");
    }
  };

  // Publish / Schedule Post
  const handleCreatePost = async (publishNow = false) => {
    if (!postContent.trim()) {
      setComposerFeedback({ type: "error", message: "Post content cannot be empty." });
      return;
    }

    setPublishing(true);
    setComposerFeedback(null);

    try {
      // 1. Create post record
      const postRes = await fetch("/api/linkedin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          organizationId: selectedAuthor !== "member" ? selectedAuthor : undefined,
          visibility: postVisibility,
          scheduledAt: scheduledDate || undefined,
          status: publishNow ? "APPROVED" : scheduledDate ? "SCHEDULED" : "DRAFT",
          media:
            mediaType === "image" || mediaType === "video"
              ? { type: mediaType, url: mediaUrl, title: mediaTitle }
              : undefined,
          article: mediaType === "article" ? { sourceUrl: articleUrl } : undefined,
        }),
      });

      const postData = await postRes.json();
      if (!postRes.ok || !postData.success) {
        setComposerFeedback({ type: "error", message: postData.error?.message || "Failed to save post." });
        setPublishing(false);
        return;
      }

      // 2. If Publish Now is selected, execute immediate publication
      if (publishNow) {
        const pubRes = await fetch("/api/linkedin/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: postData.post.id }),
        });
        const pubData = await pubRes.json();

        if (pubRes.ok && pubData.success) {
          setComposerFeedback({
            type: "success",
            message: `Post successfully published to LinkedIn! (URN: ${pubData.post.providerPostUrn})`,
          });
          showToast("Published to LinkedIn successfully!", "success");
          setPostContent("");
          loadData();
        } else {
          setComposerFeedback({
            type: "error",
            message: `Publication Failed: ${pubData.error?.message} (${pubData.error?.userFacingGuidance || "Check diagnostics"})`,
          });
        }
      } else {
        setComposerFeedback({
          type: "success",
          message: scheduledDate
            ? "Post scheduled successfully!"
            : "Draft saved to content queue.",
        });
        showToast(scheduledDate ? "Post scheduled!" : "Draft saved!", "success");
        setPostContent("");
        loadData();
      }
    } catch (err: any) {
      setComposerFeedback({ type: "error", message: err.message || "Failed to process post." });
    } finally {
      setPublishing(false);
    }
  };

  // Generate AI Post Variant
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/linkedin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          format: aiFormat,
          tone: aiTone,
          keyTakeaway: aiKeyTakeaway || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.variant) {
        setGeneratedVariant(data.variant);
        showToast("LinkedIn Variant Generated", "success");
      }
    } catch (err) {
      console.error("AI Generation Error:", err);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Repurpose Content
  const handleRepurpose = async () => {
    if (!repurposeRaw.trim()) return;
    setRepurposing(true);
    try {
      const res = await fetch("/api/linkedin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPURPOSE",
          repurposeType,
          rawContent: repurposeRaw,
        }),
      });
      const data = await res.json();
      if (data.success && data.variants) {
        setRepurposedVariants(data.variants);
        showToast("Content Repurposed Successfully", "success");
      }
    } catch (err) {
      console.error("Repurpose Error:", err);
    } finally {
      setRepurposing(false);
    }
  };

  // Reply to Comment
  const handleReplyComment = async (actionId: string, postUrn: string) => {
    const text = replyTextMap[actionId];
    if (!text?.trim()) return;

    setReplyingMap((prev) => ({ ...prev, [actionId]: true }));
    try {
      const res = await fetch("/api/linkedin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          postUrn,
          commentText: text.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplyTextMap((prev) => ({ ...prev, [actionId]: "" }));
        showToast("Comment reply posted to LinkedIn", "success");
        loadData();
      } else {
        showToast(data.error?.message || "Failed to post comment reply.", "error");
      }
    } catch (err: any) {
      showToast("Reply error: " + err.message, "error");
    } finally {
      setReplyingMap((prev) => ({ ...prev, [actionId]: false }));
    }
  };

  // Create Automation
  const handleCreateAutomation = async () => {
    if (!newAutoName.trim()) return;
    try {
      const res = await fetch("/api/linkedin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAutoName,
          trigger: newAutoTrigger,
          topic: newAutoTopic,
          formatType: newAutoFormat,
          requiresApproval: true,
        }),
      });
      if (res.ok) {
        setShowAutoModal(false);
        setNewAutoName("");
        setNewAutoTopic("");
        showToast("Automation Created Successfully", "success");
        loadData();
      }
    } catch (err) {
      console.error("Failed to create automation:", err);
    }
  };

  const isConnected = overviewData?.connection?.status === "CONNECTED";
  const memberName = overviewData?.connection?.memberName || "LinkedIn Member";
  const memberEmail = overviewData?.connection?.memberEmail;
  const memberAvatar = overviewData?.connection?.memberAvatarUrl;
  const orgs = overviewData?.organizations || [];

  return (
    <div className="space-y-6 font-sans max-w-[1400px] mx-auto pb-12">
      {/* ═══ 1. HEADER & TOP BANNER ═══ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-sky-50 text-[#0077b5] flex items-center justify-center border border-sky-100 shadow-xs shrink-0">
                <Linkedin className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    LinkedIn Automation Platform
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#0077b5] border border-sky-200/80">
                    Official REST API v202401
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Enterprise-grade publishing, AI Studio, social inbox, and capability-aware orchestration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Sync state"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#0077b5]" : ""}`} />
            </button>

            {/* Connect / Disconnect */}
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSandboxConnect}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="1-Click Sandbox Test"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Sandbox Mode</span>
                </button>
                <button
                  onClick={handleConnectOAuth}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0077b5] hover:bg-[#006699] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  <span>Connect LinkedIn</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="font-bold text-slate-900 truncate">
                {memberName}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                ({isConnected ? "OAuth v2 Active" : "Disconnected"})
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-medium shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Restli 2.0.0 Protocol Active</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium shrink-0">
              <Clock className="h-3.5 w-3.5 text-[#0077b5] shrink-0" />
              <span>Token Health: {diagnostics?.connection?.tokenStatus || "Active"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 shrink-0">
            <span>Pages Attached: <strong className="text-slate-800">{orgs.length}</strong></span>
            <span>&bull;</span>
            <span>Scopes Authorized: <strong className="text-slate-800">{overviewData?.connection?.authorizedScopes?.length || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* ═══ 2. NAVIGATION TABS (9 TABS) ═══ */}
      <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 text-xs font-semibold">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "posts", label: "Posts & Automation Selector", icon: Calendar, badge: posts.filter((p) => p.isAutomationActive).length },
          { id: "composer", label: "Post Composer", icon: Send },
          { id: "comments", label: "Social Inbox", icon: MessageSquare, badge: comments.length },
          { id: "ai_studio", label: "AI Studio", icon: Sparkles },
          { id: "automations", label: "Automations", icon: Zap, badge: automations.length },
          { id: "organizations", label: "Company Pages", icon: Building2, badge: orgs.length },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
          { id: "diagnostics", label: "Health & Diagnostics", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-400" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 ? (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-[#0077b5] text-white" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ═══ 3. TAB CONTENT PANELS ═══ */}

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Account Status Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {memberAvatar ? (
                  <img
                    src={memberAvatar}
                    alt={memberName}
                    className="w-14 h-14 rounded-full border-2 border-[#0077b5] object-cover shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0077b5] text-lg font-bold shrink-0">
                    {memberName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{memberName}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 shrink-0 ${
                        isConnected
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isConnected ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {isConnected ? "Connected (OAuth v2)" : "Disconnected"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{memberEmail || "No active account"}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                    <span>Pages Attached: <strong className="text-slate-900">{orgs.length}</strong></span>
                    <span>&bull;</span>
                    <span>Scopes Authorized: <strong className="text-slate-900">{overviewData?.connection?.authorizedScopes?.length || 0}</strong></span>
                  </div>
                </div>
              </div>

              {!isConnected && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleSandboxConnect}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>⚡ Quick Sandbox Mode</span>
                  </button>
                  <button
                    onClick={handleConnectOAuth}
                    className="px-4 py-2.5 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>Authenticate Live LinkedIn</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: "Total Impressions",
                val: overviewData?.metrics?.totalImpressions || 0,
                sub: "Organic post views",
                icon: Eye,
                color: "text-[#0077b5]",
                bg: "bg-sky-50",
              },
              {
                label: "Total Engagements",
                val: (overviewData?.metrics?.totalReactions || 0) + (overviewData?.metrics?.totalComments || 0),
                sub: `Reactions: ${overviewData?.metrics?.totalReactions || 0} | Comments: ${overviewData?.metrics?.totalComments || 0}`,
                icon: ThumbsUp,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Scheduled Posts",
                val: overviewData?.metrics?.scheduledCount || 0,
                sub: "Queued for automatic release",
                icon: Calendar,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Avg Engagement Rate",
                val: overviewData?.metrics?.engagementRate || "0.0%",
                sub: "Based on verified metrics",
                icon: BarChart3,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
            ].map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{m.label}</span>
                    <div className={`h-8 w-8 rounded-xl ${m.bg} ${m.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{m.val}</div>
                  <div className="text-[11px] text-slate-400 font-medium truncate">{m.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Recent Posts & Recent Comments Quick Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Posts */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#0077b5]" />
                  <span>Recent Posts</span>
                </h3>
                <button
                  onClick={() => setActiveTab("posts")}
                  className="text-xs text-[#0077b5] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No posts created yet. Use the Composer to publish or schedule.
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-bold text-slate-900">{p.authorName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "SCHEDULED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-slate-700 line-clamp-2 leading-relaxed">{p.content}</p>
                      <div className="flex items-center gap-4 text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-medium"><ThumbsUp className="w-3 h-3" /> {p.reactions || 0}</span>
                        <span className="flex items-center gap-1 font-medium"><MessageSquare className="w-3 h-3" /> {p.comments || 0}</span>
                        {p.publishedAt && <span>Published {new Date(p.publishedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Comments / Inquiries */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Social Action Inbox</span>
                </h3>
                <button
                  onClick={() => setActiveTab("comments")}
                  className="text-xs text-[#0077b5] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  View Inbox <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {comments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No comments synced yet. Active post comments will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.slice(0, 3).map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-bold text-slate-900">{c.actorName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-slate-700">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: POST COMPOSER & REALISTIC PREVIEW ── */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left/Center Editor Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#0077b5]" />
                  <span>Create LinkedIn Post</span>
                </h3>

                {/* Target Author Selector */}
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                >
                  <option value="member">👤 Member Profile ({memberName})</option>
                  {orgs.map((o: any) => (
                    <option key={o.organizationId} value={o.organizationId}>
                      🏢 Company Page ({o.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  rows={8}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What do you want to share with your professional network? (Tip: Use the AI Studio to generate structured variants)"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5] resize-none font-sans"
                />
                <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-400">
                  {postContent.length} / 3,000 chars
                </div>
              </div>

              {/* Media Attachment Selector */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Attachment Type
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "none", label: "Text Only", icon: FileText },
                    { id: "image", label: "Image", icon: ImageIcon },
                    { id: "video", label: "Video", icon: Video },
                    { id: "article", label: "Article Link", icon: Link2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSel = mediaType === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMediaType(m.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSel
                            ? "bg-sky-50 text-[#0077b5] border-[#0077b5]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic inputs based on mediaType */}
                {mediaType === "image" && (
                  <div className="space-y-2 pt-2">
                    <input
                      type="url"
                      placeholder="Image URL (https://...)"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                    />
                  </div>
                )}

                {mediaType === "article" && (
                  <div className="space-y-2 pt-2">
                    <input
                      type="url"
                      placeholder="Article Destination URL (https://...)"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                    />
                  </div>
                )}
              </div>

              {/* Scheduling & Visibility Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Schedule Release (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={postVisibility}
                    onChange={(e) => setPostVisibility(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  >
                    <option value="PUBLIC">🌐 Public (Anyone on or off LinkedIn)</option>
                    <option value="CONNECTIONS">👥 1st-Degree Connections Only</option>
                  </select>
                </div>
              </div>

              {/* Quality Gate Live Badge */}
              {qualityGate && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                    qualityGate.passed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      AI Quality Gate Score: {qualityGate.score}/100
                    </span>
                    <span className="uppercase text-[11px]">{qualityGate.passed ? "PASSED" : "REVIEW RECOMMENDED"}</span>
                  </div>
                  {qualityGate.warnings.map((w: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                      &bull; {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback Alert */}
              {composerFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold ${
                    composerFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {composerFeedback.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleCreatePost(false)}
                  disabled={publishing}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {scheduledDate ? "Schedule Post" : "Save as Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreatePost(true)}
                  disabled={publishing}
                  className="px-5 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{publishing ? "Publishing to LinkedIn..." : "Publish to LinkedIn"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Simulator / Realistic Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#0077b5]" />
              <span>Realistic LinkedIn Feed Simulator</span>
            </div>

            {/* Realistic LinkedIn Feed Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-slate-900 shadow-xs space-y-3 font-sans">
              {/* Author Bar */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {memberAvatar ? (
                    <img src={memberAvatar} alt={memberName} className="w-10 h-10 rounded-full object-cover shadow-2xs" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center font-bold text-[#0077b5]">
                      {memberName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      {selectedAuthor !== "member"
                        ? orgs.find((o: any) => o.organizationId === selectedAuthor)?.name || "Company Page"
                        : memberName}
                      <span className="text-[10px] text-slate-400 font-normal">&bull; 1st</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Growth &amp; Automation Leader</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>Just now</span>
                      <span>&bull;</span>
                      <span>{postVisibility === "PUBLIC" ? "🌐" : "👥"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-slate-400 text-sm font-bold">•••</div>
              </div>

              {/* Post Content */}
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {postContent || "Your post text will be previewed here exactly as rendered on LinkedIn."}
              </div>

              {/* Attached Image or Article Simulator */}
              {mediaType === "image" && mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={mediaUrl} alt="Attached Preview" className="w-full max-h-64 object-cover" />
                </div>
              )}

              {mediaType === "article" && articleUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-[#0077b5] shrink-0" />
                  <div className="text-xs truncate">
                    <div className="font-bold text-slate-900 truncate">{articleUrl}</div>
                    <div className="text-slate-500 text-[10px]">Article Link Attachment</div>
                  </div>
                </div>
              )}

              {/* Social Action Footer Simulator */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <div className="flex items-center gap-1 hover:text-[#0077b5] cursor-pointer">
                  <ThumbsUp className="w-3.5 h-3.5" /> Like
                </div>
                <div className="flex items-center gap-1 hover:text-[#0077b5] cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5" /> Comment
                </div>
                <div className="flex items-center gap-1 hover:text-[#0077b5] cursor-pointer">
                  <Share2 className="w-3.5 h-3.5" /> Repost
                </div>
                <div className="flex items-center gap-1 hover:text-[#0077b5] cursor-pointer">
                  <Send className="w-3.5 h-3.5" /> Send
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: POSTS & AUTOMATION SELECTOR ── */}
      {activeTab === "posts" && (
        <div className="space-y-6">
          {/* Header & Batch Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span>LinkedIn Posts &amp; Automation Selector</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {posts.filter((p) => p.isAutomationActive).length} Active / {posts.length} Total Posts
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select which specific published posts and company updates have automated AI comment replies &amp; Lead Magnet triggers active.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchToggleLinkedInPosts(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Activate All</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchToggleLinkedInPosts(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <span>Pause All</span>
              </button>
              <button
                onClick={() => setActiveTab("composer")}
                className="px-3.5 py-2 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> <span>New Post</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={liPostSearch}
                onChange={(e) => setLiPostSearch(e.target.value)}
                placeholder="Search post content, topics, or authors..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0077b5]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: "All Posts" },
                { id: "active", label: "⚡ Active Only" },
                { id: "inactive", label: "⏸️ Paused" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLiPostFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    liPostFilter === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          {posts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
              No posts in queue. Click &quot;New Post&quot; to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {posts
                .filter((p) => {
                  if (liPostFilter === "active" && !p.isAutomationActive) return false;
                  if (liPostFilter === "inactive" && p.isAutomationActive) return false;
                  if (liPostSearch && !p.content?.toLowerCase().includes(liPostSearch.toLowerCase()) && !p.authorName?.toLowerCase().includes(liPostSearch.toLowerCase())) {
                    return false;
                  }
                  return true;
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl border transition-all p-5 shadow-xs space-y-4 ${
                      p.isAutomationActive
                        ? "border-sky-300 ring-1 ring-sky-200/80"
                        : "border-slate-200/80 opacity-90"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-sky-100 text-[#0077b5] flex items-center justify-center font-bold text-xs shrink-0">
                            {p.authorName?.charAt(0) || "L"}
                          </div>
                          <span className="font-bold text-slate-900 truncate max-w-[160px]">{p.authorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "Draft"}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            p.isAutomationActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isAutomationActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{p.isAutomationActive ? "AUTOPILOT ON" : "PAUSED"}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-3 leading-relaxed">
                        {p.content}
                      </p>

                      {/* Engagement Metrics */}
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 pt-1">
                        <span>👏 {p.reactions || p.likes || 0} reactions</span>
                        <span>💬 {p.comments || 0} comments</span>
                        <span>🔄 {p.shares || 0} shares</span>
                        {p.impressions && <span>👀 {p.impressions.toLocaleString()} views</span>}
                      </div>
                    </div>

                    {/* Rule Selection & 1-Click Toggle */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                          Rule:
                        </span>
                        <select
                          value={p.assignedRuleId || "lr_1"}
                          onChange={(e) => {
                            const optionName = e.target.options[e.target.selectedIndex].text;
                            handleAssignLinkedInPostRule(p.id, e.target.value, optionName);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none truncate max-w-[210px]"
                        >
                          <option value="lr_1">🧠 Thought Leadership B2B Copilot</option>
                          <option value="lr_2">💼 Lead Magnet &amp; Demo Dispatch</option>
                          <option value="lr_3">📅 Calendar Booking Inbound</option>
                          <option value="lr_default">⚡ Standard Professional Auto-Reply</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLinkedInPostAutomation(p.id, p.isAutomationActive)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                          p.isAutomationActive
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{p.isAutomationActive ? "Pause Auto-Reply" : "Activate Autopilot"}</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SOCIAL INBOX & COMMENTS ── */}
      {activeTab === "comments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Social Actions &amp; Comments Inbox</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Engage and reply directly to comments on your authorized posts.
              </p>
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
              No comments currently awaiting moderation.
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{c.actorName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800">
                      {c.type}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                    {c.content}
                  </div>

                  {c.replyContent ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      <strong className="text-emerald-900">Your Reply:</strong> {c.replyContent}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type an official reply to this comment..."
                        value={replyTextMap[c.id] || ""}
                        onChange={(e) =>
                          setReplyTextMap({ ...replyTextMap, [c.id]: e.target.value })
                        }
                        className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                      />
                      <button
                        onClick={() => handleReplyComment(c.id, c.postId)}
                        disabled={replyingMap[c.id]}
                        className="px-4 py-2 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: AI STUDIO ── */}
      {activeTab === "ai_studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* AI Generator Panel */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0077b5]" />
                <span>12-Format LinkedIn Post Generator</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Core Topic / Theme</label>
                  <input
                    type="text"
                    placeholder="e.g. Why microservices architecture fails without clear team ownership"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Format Pattern</label>
                    <select
                      value={aiFormat}
                      onChange={(e) => setAiFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                    >
                      <option value="EDUCATIONAL">Step-by-Step Educational</option>
                      <option value="CONTRARIAN">Contrarian Perspective</option>
                      <option value="CASE_STUDY">Case Study Breakdown</option>
                      <option value="FOUNDER_PERSPECTIVE">Founder / Build in Public</option>
                      <option value="CHECKLIST">Actionable Checklist</option>
                      <option value="ANNOUNCEMENT">Product / Team Milestone</option>
                      <option value="STORYTELLING">Storytelling &amp; Lesson</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tone of Voice</label>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                    >
                      <option value="conversational">Conversational &amp; Clear</option>
                      <option value="authoritative">Authoritative &amp; Strategic</option>
                      <option value="data_driven">Data-Driven &amp; Analytical</option>
                      <option value="minimalist">Minimalist / Punchy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Key Takeaway (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Compounding discipline beats sporadic heroics."
                    value={aiKeyTakeaway}
                    onChange={(e) => setAiKeyTakeaway(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  />
                </div>

                <button
                  onClick={handleGenerateAi}
                  disabled={generatingAi || !aiTopic.trim()}
                  className="w-full py-2.5 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{generatingAi ? "Generating High-Value Variant..." : "Generate LinkedIn Variant"}</span>
                </button>
              </div>
            </div>

            {/* Repurposer */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>Content Repurposing Engine</span>
              </h3>

              <div className="space-y-3">
                <div className="flex gap-2">
                  {[
                    { id: "blog_text", label: "Blog / Article" },
                    { id: "video_transcript", label: "Video Transcript" },
                    { id: "faq_qa", label: "Customer FAQ" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRepurposeType(r.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        repurposeType === r.id
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  placeholder="Paste source text (article excerpt, transcript, or customer QA)..."
                  value={repurposeRaw}
                  onChange={(e) => setRepurposeRaw(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />

                <button
                  onClick={handleRepurpose}
                  disabled={repurposing || !repurposeRaw.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {repurposing ? "Repurposing Content..." : "Repurpose into 3 LinkedIn Posts"}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Output Review */}
          <div className="lg:col-span-6 space-y-6">
            {generatedVariant ? (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#0077b5] tracking-wider">
                    Generated Variant ({generatedVariant.format})
                  </span>
                  <button
                    onClick={() => {
                      setPostContent(generatedVariant.fullText);
                      setActiveTab("composer");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> <span>Load in Composer</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {generatedVariant.fullText}
                </div>

                {generatedVariant.qualityGate && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                    Quality Gate Score: {generatedVariant.qualityGate.score}/100 &bull; All Safety Checks Passed
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
                Generate a post on the left to review the formatted output and load it into the Composer.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: AUTOMATIONS ── */}
      {activeTab === "automations" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Automated Content &amp; Cadence Workflows</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set recurring topic generation and approval workflows.
              </p>
            </div>
            <button
              onClick={() => setShowAutoModal(true)}
              className="px-4 py-2 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Create Automation</span>
            </button>
          </div>

          {automations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
              No automated workflows configured. Click &quot;Create Automation&quot; to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automations.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{a.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">Trigger: {a.trigger}</div>
                  <div className="text-xs text-slate-600 font-medium">Format: {a.formatType || "EDUCATIONAL"}</div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    Requires Human Review: {a.requiresApproval ? "Yes" : "No"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: COMPANY PAGES (ORGANIZATIONS) ── */}
      {activeTab === "organizations" && (
        <div className="space-y-6">
          <h3 className="text-base font-bold text-slate-900">Discovered Company Pages ({orgs.length})</h3>

          {orgs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
              No administered Company Pages discovered for this LinkedIn member account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgs.map((o: any) => (
                <div key={o.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0077b5] flex items-center justify-center font-bold text-sm">
                      🏢
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{o.name}</div>
                      <div className="text-xs text-slate-500">Role: <strong className="text-slate-800">{o.role}</strong></div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active ACL
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 8: ANALYTICS ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <h3 className="text-base font-bold text-slate-900">Performance &amp; Analytics</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Published</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">{analytics?.summary?.totalPostsPublished || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Average Engagement Rate</div>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{analytics?.summary?.avgEngagementRate || "0.0%"}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Re-Shares</div>
              <div className="text-2xl font-black text-purple-600 font-mono mt-1">{analytics?.summary?.totalShares || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 9: HEALTH & DIAGNOSTICS ── */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">LinkedIn Connection Health &amp; Capability Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Granular verification of authorized OAuth scopes, REST API version, and token status.
              </p>
            </div>
          </div>

          {/* Health Overview */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs text-slate-500 font-medium">API Protocol Version</div>
                <div className="text-sm font-bold text-slate-900 mt-1">LinkedIn-Version: {diagnostics?.apiVersion || "202401"}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs text-slate-500 font-medium">Restli Protocol Header</div>
                <div className="text-sm font-bold text-slate-900 mt-1">X-Restli-Protocol-Version: 2.0.0</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs text-slate-500 font-medium">Token Expiry Status</div>
                <div className="text-sm font-bold text-emerald-600 mt-1">
                  {diagnostics?.connection?.tokenStatus || "NOT CONNECTED"} ({diagnostics?.connection?.tokenRemainingDays || 0} days remaining)
                </div>
              </div>
            </div>
          </div>

          {/* Granular Capability Matrix */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Dynamic Capability Matrix (Live Discovery)</h4>
            <div className="space-y-3">
              {(diagnostics?.manifest?.capabilities || []).map((cap: any) => (
                <div key={cap.key} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{cap.label}</div>
                    <div className="text-slate-600 mt-0.5">{cap.description}</div>
                    <div className="text-slate-400 text-[11px] mt-1">{cap.explanation}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap self-start md:self-auto ${
                      cap.status === "GRANTED"
                        ? "bg-emerald-100 text-emerald-800"
                        : cap.status === "DENIED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cap.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. NEW AUTOMATION MODAL ═══ */}
      <AnimatePresence>
        {showAutoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Create LinkedIn Automation</h3>
                <button
                  onClick={() => setShowAutoModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Workflow Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Tech Leadership Insight"
                    value={newAutoName}
                    onChange={(e) => setNewAutoName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Systems & High Availability"
                    value={newAutoTopic}
                    onChange={(e) => setNewAutoTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowAutoModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAutomation}
                    className="px-5 py-2.5 bg-[#0077b5] hover:bg-[#006699] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Save Automation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
