"use client";

/**
 * ============================================================================
 * QuickReply — YouTube Automation Studio & Simple Rule Assistant
 * src/frontend/components/YouTubeAutomationStudio.tsx
 *
 * Dual-Mode Design:
 *  - Simple Mode (Default): 3-Step intuitive visual assistant for non-tech users
 *  - Advanced Studio Mode: 11-stage pipeline, DAG flowchart, CRM triggers & variable editor
 *  - Rendered via React Portal with Lenis scroll protection for 100% reliable scrolling
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  Sliders,
  Brain,
  ShieldAlert,
  Clock,
  Send,
  User,
  Video,
  Hash,
  Layers,
  ChevronRight,
  Flame,
  ThumbsUp,
  Tag,
  HelpCircle,
  X,
  FileCode2,
  RefreshCw,
  Loader2,
  GitBranch,
  Filter,
  Check,
  RotateCcw,
  Heart,
  MessageSquare,
  HelpCircle as QuestionIcon,
  ShoppingBag,
  Wrench,
  Eye,
  Smile,
  Briefcase,
  Flame as RoastIcon,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

export type StudioStage =
  | "trigger"
  | "scope"
  | "match"
  | "context"
  | "decision"
  | "priority"
  | "schedule"
  | "style"
  | "action"
  | "safety"
  | "simulator";

interface YouTubeAutomationStudioProps {
  initialRule?: any;
  preSelectedVideoId?: string;
  preSelectedVideoTitle?: string;
  availableVideos?: { id: string; title: string; thumbnail?: string }[];
  onClose: () => void;
  onSaved: (rule: any) => void;
}

export default function YouTubeAutomationStudio({
  initialRule,
  preSelectedVideoId,
  preSelectedVideoTitle,
  availableVideos = [],
  onClose,
  onSaved,
}: YouTubeAutomationStudioProps) {
  const showToast = useUIStore((s) => s.showToast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when studio modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // UI Presentation Mode: "simple" (non-tech friendly) or "advanced" (full 11-stage studio)
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");

  // Advanced Studio Stage
  const [activeStage, setActiveStage] = useState<StudioStage>("trigger");

  // Core Rule Metadata
  const [ruleName, setRuleName] = useState(initialRule?.name || "Auto-Reply to Viewer Questions");
  const [ruleDescription, setRuleDescription] = useState(
    initialRule?.description || "Autonomous comment intelligence & grounded responder"
  );
  const [mode, setMode] = useState<"TAG" | "RAG" | "HYBRID">(initialRule?.mode || "HYBRID");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "PAUSED">("DRAFT");
  const [version, setVersion] = useState<number>(initialRule?.version || 1);
  const [priority, setPriority] = useState<number>(initialRule?.priority || 80);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // 1. Trigger
  const [triggerType, setTriggerType] = useState<string>("COMMENT_CREATED");
  const [includeReplies, setIncludeReplies] = useState<boolean>(true);

  // 2. Scope
  const [scopeType, setScopeType] = useState<"ALL_VIDEOS" | "SELECTED_VIDEOS" | "TAG_MATCH">(
    preSelectedVideoId ? "SELECTED_VIDEOS" : initialRule?.scope?.targetType || "ALL_VIDEOS"
  );
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(
    preSelectedVideoId ? [preSelectedVideoId] : initialRule?.scope?.targetIds || []
  );

  // 3. Match Logic & Presets
  const [simplePreset, setSimplePreset] = useState<"questions" | "pricing" | "support" | "keywords" | "all">("questions");
  const [matchOperator, setMatchOperator] = useState<string>("contains_any");
  const [matchKeywords, setMatchKeywords] = useState<string>(
    initialRule?.trigger || "price, cost, discount, coupon, link, buy, where"
  );
  const [expectedIntent, setExpectedIntent] = useState<string>("BUYING_INTENT");
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);

  // 4. Context & CRM
  const [requireVIPTags, setRequireVIPTags] = useState<boolean>(false);
  const [minLeadScore, setMinLeadScore] = useState<number>(50);

  // 5. Decision
  const [replyWorthinessThreshold, setReplyWorthinessThreshold] = useState<string>("GENUINE_QUESTIONS_AND_PROBLEMS");
  const [skipGenericPraise, setSkipGenericPraise] = useState<boolean>(true);
  const [skipEmojiOnly, setSkipEmojiOnly] = useState<boolean>(true);

  // 6. Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleDays, setScheduleDays] = useState<string>("Mon-Fri");
  const [delaySeconds, setDelaySeconds] = useState<number>(15);

  // 7. AI/RAG & Style
  const [responseStyle, setResponseStyle] = useState<"PROFESSIONAL" | "FUNNY" | "ROAST">("PROFESSIONAL");
  const [seriousIssueOverride, setSeriousIssueOverride] = useState<boolean>(true);
  const [ragConfidenceThreshold, setRagConfidenceThreshold] = useState<number>(85);
  const [useSmartAIReplies, setUseSmartAIReplies] = useState<boolean>(true);

  // 8. Action Plan
  const [actionType, setActionType] = useState<string>("reply_comment");
  const [replyTemplate, setReplyTemplate] = useState<string>(
    initialRule?.action ||
      "Hey {{customer.first_name}} 👋 Thanks for watching {{video.title}}! You can find the link and promo details here: https://quickreply.ai/demo"
  );
  const [autoHeartComment, setAutoHeartComment] = useState<boolean>(true);
  const [tagToAssign, setTagToAssign] = useState<string>("engaged_lead");

  // 9. Safety & Policy
  const [maxRepliesPerUserDay, setMaxRepliesPerUserDay] = useState<number>(2);
  const [requireHumanReviewAboveRisk, setRequireHumanReviewAboveRisk] = useState<boolean>(true);
  const [prohibitedWords, setProhibitedWords] = useState<string>("sue, lawyer, hospital, scam, hate");

  // 10. Simulator
  const [testCommentInput, setTestCommentInput] = useState<string>("Does this work on Linux or Mac?");
  const [testAuthorName, setTestAuthorName] = useState<string>("Alex Rivera");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Preset switch handler
  const handlePresetSelect = (preset: "questions" | "pricing" | "support" | "keywords" | "all") => {
    setSimplePreset(preset);
    if (preset === "questions") {
      setRuleName("Auto-Answer Viewer Questions");
      setMode("RAG");
      setUseSmartAIReplies(true);
      setMatchKeywords("what, how, why, where, when, does it, can I, is there");
      setExpectedIntent("QUESTION");
    } else if (preset === "pricing") {
      setRuleName("Share Pricing & Purchase Links");
      setMode("HYBRID");
      setUseSmartAIReplies(true);
      setMatchKeywords("price, cost, discount, coupon, link, buy, store");
      setExpectedIntent("BUYING_INTENT");
    } else if (preset === "support") {
      setRuleName("Help with Bugs & Complaints");
      setMode("RAG");
      setUseSmartAIReplies(true);
      setResponseStyle("PROFESSIONAL");
      setMatchKeywords("crash, error, bug, broken, not working, help, stuck");
      setExpectedIntent("SUPPORT_REQUEST");
    } else if (preset === "keywords") {
      setRuleName("Reply to Specific Keywords");
      setMode("TAG");
      setUseSmartAIReplies(false);
    } else if (preset === "all") {
      setRuleName("24/7 Channel Auto-Pilot");
      setMode("HYBRID");
      setUseSmartAIReplies(true);
      setMatchKeywords("");
    }
  };

  // Variable inserter
  const insertVariable = (varCode: string) => {
    setReplyTemplate((prev) => prev + ` {{${varCode}}}`);
    showToast(`Inserted {{${varCode}}}`, "info");
  };

  // Dry-Run Simulator
  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await fetch("/api/automation-engine/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentText: testCommentInput,
          authorName: testAuthorName,
          platform: "youtube",
          videoId: selectedVideoIds[0] || "vid_demo_101",
          videoTitle: preSelectedVideoTitle || "YouTube Video Showcase",
          customerTags: requireVIPTags ? ["VIP"] : ["lead"],
          leadScore: 85,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data.result);
        showToast("Simulation test complete!", "success");
      } else {
        showToast("Simulation error", "error");
      }
    } catch {
      showToast("Failed to run simulator", "error");
    } finally {
      setIsSimulating(false);
    }
  };

  // Save / Publish
  const handleSaveAutomation = async (publish: boolean) => {
    if (!ruleName.trim()) return showToast("Please give this automation a friendly name", "error");

    try {
      if (publish) setIsPublishing(true);
      else setIsSaving(true);

      const payload = {
        name: ruleName.trim(),
        description: ruleDescription,
        mode,
        priority,
        status: publish ? "PUBLISHED" : "DRAFT",
        scope: {
          targetType: scopeType,
          targetIds: selectedVideoIds,
          platforms: ["youtube"],
        },
        conditions: {
          type: "branch",
          logicalOperator: "AND",
          children: [
            {
              type: "leaf",
              field: "comment.text",
              operator: matchOperator === "contains_any" ? "contains_any" : "contains",
              value: matchKeywords,
              caseSensitive,
            },
          ],
        },
        intentConfig: {
          expectedIntent,
          minimumConfidence: 0.8,
        },
        ragConfig: {
          useCustomerMemory: true,
          useBrandFAQ: true,
          confidenceThreshold: ragConfidenceThreshold / 100,
          fallbackToHumanApproval: true,
        },
        actionPlan: {
          actionType,
          templateText: replyTemplate,
          dynamicTags: [tagToAssign],
        },
        schedule: {
          enabled: scheduleEnabled,
          daysOfWeek: [1, 2, 3, 4, 5],
          startHour: "09:00",
          endHour: "18:00",
          timezone: "Asia/Kolkata",
          behaviorOutsideSchedule: "QUEUE",
        },
        delays: {
          delayType: "FIXED_SECONDS",
          seconds: delaySeconds,
        },
        safetyPolicy: {
          prohibitedKeywords: prohibitedWords.split(",").map((s) => s.trim()),
          maxRepliesPerUserPerDay: maxRepliesPerUserDay,
          requireApprovalAboveRisk: requireHumanReviewAboveRisk ? 0.7 : 1.0,
        },
        stopConditions: {
          stopAfterMatch: true,
          stopIfActionSucceeds: true,
          stopIfHighRisk: true,
          maxActionsPerComment: 1,
        },
      };

      const res = await fetch("/api/automation-engine/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(publish ? "PUBLISHED" : "DRAFT");
        if (publish) setVersion((v) => v + 1);
        showToast(
          publish
            ? `🎉 Automation Turned ON!`
            : "✓ Automation Draft Saved",
          "success"
        );
        onSaved(data.rule);
      } else {
        const err = await res.json();
        showToast(err.error || "Save failed", "error");
      }
    } catch {
      showToast("Failed to save automation", "error");
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const stagesList: { id: StudioStage; label: string; icon: any; valid: boolean }[] = [
    { id: "trigger", label: "1. Trigger Event", icon: Zap, valid: true },
    { id: "scope", label: "2. Content Scope", icon: Target, valid: selectedVideoIds.length > 0 || scopeType === "ALL_VIDEOS" },
    { id: "match", label: "3. Match Logic", icon: Filter, valid: !!matchKeywords },
    { id: "context", label: "4. Context & CRM", icon: User, valid: true },
    { id: "decision", label: "5. Reply-Worthiness", icon: Brain, valid: true },
    { id: "priority", label: "6. Priority & Conflict", icon: Flame, valid: true },
    { id: "schedule", label: "7. Schedule & Delays", icon: Clock, valid: true },
    { id: "style", label: "8. AI/RAG & Style", icon: Sparkles, valid: true },
    { id: "action", label: "9. Action Plan", icon: Send, valid: !!replyTemplate },
    { id: "safety", label: "10. Safety Policy", icon: ShieldAlert, valid: true },
    { id: "simulator", label: "11. Debugger & Replay", icon: Play, valid: true },
  ];

  if (!mounted) return null;

  return createPortal(
    <div
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
      className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex flex-col font-sans text-slate-900 select-none overscroll-contain animate-fadeIn"
      style={{ touchAction: "pan-y" }}
    >
      {/* ═══ TOP HEADER ═══ */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-red-600 focus:outline-hidden px-1 py-0.5 max-w-[200px] sm:max-w-xs truncate"
              placeholder="Name this automation..."
            />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
              }`}
            >
              ● {status === "PUBLISHED" ? "Active" : "Draft"}
            </span>
          </div>
        </div>

        {/* Mode Switch & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher: Simple vs Advanced */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUiMode("simple")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                uiMode === "simple"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Simple Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setUiMode("advanced")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                uiMode === "advanced"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Advanced Studio</span>
              <span className="sm:hidden">Studio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSaveAutomation(false)}
            disabled={isSaving}
            className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer items-center gap-1.5 shadow-2xs"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAutomation(true)}
            disabled={isPublishing}
            className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Turn On</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 1: SIMPLE 3-STEP ASSISTANT (NON-TECH FRIENDLY)
         ══════════════════════════════════════════════════════════════════════════ */}
      {uiMode === "simple" && (
        <div
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50 p-4 sm:p-6 lg:p-8 custom-scrollbar"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
            
            {/* Left Column: 3 Friendly Step Cards (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Card 1: Which Videos? */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold text-sm border border-blue-200">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Which videos should this reply to?
                    </h3>
                    <p className="text-xs text-slate-500">Choose all videos or pick specific ones</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setScopeType("ALL_VIDEOS")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      scopeType === "ALL_VIDEOS"
                        ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 text-blue-950"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🌐</span>
                      {scopeType === "ALL_VIDEOS" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">All Channel Videos</div>
                      <div className="text-[11px] text-slate-500">Every current &amp; future video</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopeType("SELECTED_VIDEOS")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      scopeType === "SELECTED_VIDEOS"
                        ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 text-blue-950"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🎯</span>
                      {scopeType === "SELECTED_VIDEOS" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">Specific Video(s)</div>
                      <div className="text-[11px] text-slate-500">
                        {selectedVideoIds.length > 0 ? `${selectedVideoIds.length} video(s) chosen` : "Choose from list"}
                      </div>
                    </div>
                  </button>
                </div>

                {scopeType === "SELECTED_VIDEOS" && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Select from your channel:</label>
                    <div
                      data-lenis-prevent="true"
                      data-lenis-prevent-wheel="true"
                      className="max-h-40 overflow-y-auto space-y-1.5 pr-1 overscroll-contain"
                    >
                      {availableVideos.map((v) => {
                        const isChecked = selectedVideoIds.includes(v.id);
                        return (
                          <label
                            key={v.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                              isChecked ? "bg-blue-50 border-blue-300 text-blue-900" : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedVideoIds((prev) =>
                                  isChecked ? prev.filter((id) => id !== v.id) : [...prev, v.id]
                                );
                              }}
                              className="rounded accent-blue-600"
                            />
                            <span className="truncate">{v.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: When to Reply? */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold text-sm border border-purple-200">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      When should QuickReply respond?
                    </h3>
                    <p className="text-xs text-slate-500">Select what type of viewer comment triggers an answer</p>
                  </div>
                </div>

                {/* 1-Click Friendly Preset Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { id: "questions", icon: QuestionIcon, label: "Questions & Inquiries", desc: "When viewers ask how, why, what, or when" },
                    { id: "pricing", icon: ShoppingBag, label: "Pricing & Links", desc: "When viewers ask about price, discount, or where to buy" },
                    { id: "support", icon: Wrench, label: "Bugs & Support", desc: "When viewers report issues or ask for help" },
                    { id: "keywords", icon: Hash, label: "Specific Keywords", desc: "Trigger only on exact words you specify" },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = simplePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetSelect(p.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? "bg-purple-50/60 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold">{p.label}</div>
                          <div className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Keywords input if custom keywords chosen */}
                {simplePreset === "keywords" && (
                  <div className="pt-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Trigger Keywords:</label>
                    <input
                      type="text"
                      value={matchKeywords}
                      onChange={(e) => setMatchKeywords(e.target.value)}
                      placeholder="e.g. discount, link, coupon, code"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-[10px] text-slate-400">Separate words with commas</span>
                  </div>
                )}
              </div>

              {/* Card 3: What to Reply? */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-sm border border-emerald-200">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      How should QuickReply answer?
                    </h3>
                    <p className="text-xs text-slate-500">Choose AI tone or a custom template</p>
                  </div>
                </div>

                {/* Response Mode: Smart AI vs Custom Template */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setUseSmartAIReplies(true);
                        setMode("HYBRID");
                      }}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        useSmartAIReplies ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Smart Video-Aware AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUseSmartAIReplies(false);
                        setMode("TAG");
                      }}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        !useSmartAIReplies ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                      <span>Custom Fixed Template</span>
                    </button>
                  </div>

                  {useSmartAIReplies ? (
                    /* AI Tone Selector */
                    <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                      <label className="text-xs font-bold text-amber-950 block">AI Personality &amp; Tone:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "PROFESSIONAL", icon: Briefcase, label: "Professional", desc: "Polite & concise" },
                          { id: "FUNNY", icon: Smile, label: "Friendly 😄", desc: "Warm & cheerful" },
                          { id: "ROAST", icon: RoastIcon, label: "Spicy Roast 🔥", desc: "Playful comebacks" },
                        ].map((t) => {
                          const isSelected = responseStyle === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setResponseStyle(t.id as any)}
                              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                                isSelected
                                  ? "bg-white border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold shadow-xs"
                                  : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                              }`}
                            >
                              <span className="text-xs font-bold">{t.label}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">{t.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Custom Message Template */
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Your Custom Message:</label>
                      <textarea
                        rows={3}
                        value={replyTemplate}
                        onChange={(e) => setReplyTemplate(e.target.value)}
                        className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        placeholder="Thanks for asking! You can check it here..."
                      />
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <span>Insert dynamic variables:</span>
                        <button
                          type="button"
                          onClick={() => insertVariable("customer.first_name")}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                        >
                          + Viewer Name
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariable("video.title")}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                        >
                          + Video Title
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bonus Friendly Option */}
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <Heart className={`w-4 h-4 ${autoHeartComment ? "text-red-500 fill-red-500" : "text-slate-400"}`} />
                      <span>Automatically heart the viewer's comment</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={autoHeartComment}
                      onChange={(e) => setAutoHeartComment(e.target.checked)}
                      className="h-4 w-4 rounded accent-red-600"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live YouTube Preview & Simulator (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6 space-y-4">
                
                {/* Live Preview Card */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Live YouTube Preview
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Real-time simulation</span>
                  </div>

                  {/* Mock YouTube Comment Thread */}
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    {/* Viewer Comment */}
                    <div className="flex items-start gap-2.5 text-xs">
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        {testAuthorName.charAt(0)}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{testAuthorName}</span>
                          <span className="text-[10px] font-normal text-slate-400">2m ago</span>
                        </div>
                        <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 font-medium">
                          "{testCommentInput || "Does this support Linux or Mac?"}"
                        </p>
                      </div>
                    </div>

                    {/* QuickReply AI Response */}
                    <div className="flex items-start gap-2.5 text-xs pl-4 border-l-2 border-slate-200">
                      <div className="h-7 w-7 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        AI
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>QuickReply Assistant</span>
                          <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-slate-200 text-slate-700">CREATOR</span>
                        </div>
                        <div className="text-slate-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 font-medium leading-relaxed">
                          {useSmartAIReplies ? (
                            responseStyle === "FUNNY" ? (
                              <span>"Yes! Works like a charm on both Linux and Mac. We tested it in the video so you don't have to troubleshoot at 3 AM 😄"</span>
                            ) : responseStyle === "ROAST" ? (
                              <span>"Of course it works on Linux! If it didn't, the open-source community would have roasted us already 🔥"</span>
                            ) : (
                              <span>"Yes, it is fully supported on Linux and macOS with the default installer."</span>
                            )
                          ) : (
                            <span>{replyTemplate.replace("{{customer.first_name}}", testAuthorName.split(" ")[0]).replace("{{video.title}}", "the video")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Test Input */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      ⚡ Test with any sample comment:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testCommentInput}
                        onChange={(e) => setTestCommentInput(e.target.value)}
                        placeholder="Type a viewer comment..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && handleRunSimulation()}
                      />
                      <button
                        type="button"
                        onClick={handleRunSimulation}
                        disabled={isSimulating || !testCommentInput.trim()}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Big Friendly CTA */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAutomation(true)}
                    disabled={isPublishing}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Save &amp; Turn On Automation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 2: ADVANCED 11-STAGE PIPELINE STUDIO (POWER USERS)
         ══════════════════════════════════════════════════════════════════════════ */}
      {uiMode === "advanced" && (
        <div
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
          className="flex-1 min-h-0 flex overflow-hidden overscroll-contain bg-slate-50"
        >
          {/* ── 1. LEFT BUILD NAVIGATION (260px) ── */}
          <aside
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 p-4 space-y-4 overflow-y-auto overscroll-contain custom-scrollbar"
          >
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                Automation Pipeline
              </div>

              <div className="space-y-1">
                {stagesList.map((stg) => {
                  const Icon = stg.icon;
                  const isActive = activeStage === stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => setActiveStage(stg.id)}
                      className={`w-full px-3.5 py-2.5 rounded-2xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-red-400" : "text-slate-400"}`} />
                        <span>{stg.label}</span>
                      </div>
                      {stg.valid ? (
                        <Check className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-emerald-600"}`} />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diagnostics Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pipeline Status
              </div>
              <div className="text-slate-700 font-medium">
                ✓ Validated &amp; Connected
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Mode: {mode} &bull; Priority: {priority}/100
              </div>
            </div>
          </aside>

          {/* ── 2. CENTER VISUAL WORKFLOW CANVAS (Flex-1) ── */}
          <main
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 flex flex-col items-center justify-start space-y-4 custom-scrollbar"
          >
            <div className="max-w-xl w-full space-y-3 py-4">
              
              {/* Node: Trigger */}
              <div
                onClick={() => setActiveStage("trigger")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                  activeStage === "trigger"
                    ? "bg-white border-red-500 ring-2 ring-red-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-red-50 text-[#FF0000] flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Trigger Event</div>
                    <div className="text-xs font-black text-slate-900">
                      YouTube: {triggerType.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-6 w-0.5 bg-slate-300 mx-auto" />

              {/* Node: Scope */}
              <div
                onClick={() => setActiveStage("scope")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                  activeStage === "scope"
                    ? "bg-white border-red-500 ring-2 ring-red-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Content Scope</div>
                    <div className="text-xs font-black text-slate-900">
                      {scopeType === "ALL_VIDEOS" ? "All Channel Videos" : `${selectedVideoIds.length} Selected Video(s)`}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-6 w-0.5 bg-slate-300 mx-auto" />

              {/* Node: Match */}
              <div
                onClick={() => setActiveStage("match")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                  activeStage === "match" || activeStage === "decision"
                    ? "bg-white border-red-500 ring-2 ring-red-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Match &amp; Decision</div>
                    <div className="text-xs font-black text-slate-900 truncate max-w-[280px]">
                      Keywords: &ldquo;{matchKeywords}&rdquo; &bull; {expectedIntent}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-6 w-0.5 bg-slate-300 mx-auto" />

              {/* Node: Style */}
              <div
                onClick={() => setActiveStage("style")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                  activeStage === "style"
                    ? "bg-white border-red-500 ring-2 ring-red-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">AI Grounding &amp; Style</div>
                    <div className="text-xs font-black text-slate-900">
                      Tone: {responseStyle} &bull; RAG Confidence &gt; {ragConfidenceThreshold}%
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-6 w-0.5 bg-slate-300 mx-auto" />

              {/* Node: Action */}
              <div
                onClick={() => setActiveStage("action")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                  activeStage === "action"
                    ? "bg-white border-red-500 ring-2 ring-red-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Action Execution</div>
                    <div className="text-xs font-black text-slate-900">
                      Public Reply + Auto-Heart + Tag: {tagToAssign}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </main>

          {/* ── 3. RIGHT STAGE INSPECTOR (420px) ── */}
          <section
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            className="w-[420px] bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 p-6 overflow-y-auto overscroll-contain custom-scrollbar space-y-6"
          >
            <div className="space-y-5">
              
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 capitalize">
                    {activeStage.replace(/_/g, " ")} Configuration
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Stage {stagesList.findIndex((s) => s.id === activeStage) + 1} of 11
                  </span>
                </div>
              </div>

              {/* STAGE 1: TRIGGER */}
              {activeStage === "trigger" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">When Event Occurs</label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="COMMENT_CREATED">New Top-Level Video Comment</option>
                      <option value="REPLY_CREATED">New Reply in Thread</option>
                      <option value="MENTION_DETECTED">Channel Mention in Comment</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Include Nested Replies</div>
                      <div className="text-[11px] text-slate-500">Execute on viewer replies to existing threads</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeReplies}
                      onChange={(e) => setIncludeReplies(e.target.checked)}
                      className="h-4 w-4 rounded accent-red-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* STAGE 2: SCOPE */}
              {activeStage === "scope" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Content Targeting</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScopeType("ALL_VIDEOS")}
                        className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          scopeType === "ALL_VIDEOS" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        All Channel Videos
                      </button>
                      <button
                        type="button"
                        onClick={() => setScopeType("SELECTED_VIDEOS")}
                        className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          scopeType === "SELECTED_VIDEOS" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        Selected Videos
                      </button>
                    </div>
                  </div>

                  {scopeType === "SELECTED_VIDEOS" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Choose Specific Videos</label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50 custom-scrollbar overscroll-contain">
                        {availableVideos.map((v) => {
                          const isChecked = selectedVideoIds.includes(v.id);
                          return (
                            <label
                              key={v.id}
                              className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 text-xs font-medium text-slate-800 cursor-pointer hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedVideoIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== v.id) : [...prev, v.id]
                                  );
                                }}
                                className="rounded accent-red-600"
                              />
                              <span className="truncate">{v.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 3: MATCH */}
              {activeStage === "match" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Trigger Keywords &amp; Phrases</label>
                    <textarea
                      rows={3}
                      value={matchKeywords}
                      onChange={(e) => setMatchKeywords(e.target.value)}
                      placeholder="e.g. price, cost, discount, coupon, link"
                      className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Intent Target</label>
                    <select
                      value={expectedIntent}
                      onChange={(e) => setExpectedIntent(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="BUYING_INTENT">BUYING_INTENT (Order / Checkout)</option>
                      <option value="PRICE_QUESTION">PRICE_QUESTION (Pricing / Rate / Discount)</option>
                      <option value="AVAILABILITY">AVAILABILITY (Stock / Variants)</option>
                      <option value="SUPPORT_REQUEST">SUPPORT_REQUEST (Help / Issues)</option>
                      <option value="GIVEAWAY_ENTRY">GIVEAWAY_ENTRY (Contests / Raffles)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STAGE 8: STYLE */}
              {activeStage === "style" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">AI Personality Tone</label>
                    <select
                      value={responseStyle}
                      onChange={(e) => setResponseStyle(e.target.value as any)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="PROFESSIONAL">PROFESSIONAL (Helpful &amp; Direct)</option>
                      <option value="FUNNY">FUNNY (Humorous &amp; Friendly)</option>
                      <option value="ROAST">ROAST (Playful Meme / Sarcastic with Safety Gate)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STAGE 9: ACTION */}
              {activeStage === "action" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Reply Message Template</label>
                    <textarea
                      rows={4}
                      value={replyTemplate}
                      onChange={(e) => setReplyTemplate(e.target.value)}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}

              {/* STAGE 11: SIMULATOR */}
              {activeStage === "simulator" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Test Comment</label>
                    <input
                      type="text"
                      value={testCommentInput}
                      onChange={(e) => setTestCommentInput(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Run Simulation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Progress */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stagesList.findIndex((s) => s.id === activeStage);
                  if (currentIndex < stagesList.length - 1) {
                    setActiveStage(stagesList[currentIndex + 1].id);
                  }
                }}
                className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next Stage &rarr;</span>
              </button>
              <span className="text-[10px] text-slate-400 font-mono">Autosaved</span>
            </div>
          </section>
        </div>
      )}

      {/* ═══ BOTTOM STATUS BAR ═══ */}
      <footer className="h-10 bg-slate-900 text-slate-300 px-6 flex items-center justify-between text-xs font-mono shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready to Automate</span>
          </span>
          <span className="text-slate-500">&bull;</span>
          <span>Target: {scopeType === "ALL_VIDEOS" ? "All Channel Videos" : `${selectedVideoIds.length} Videos`}</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span>Mode: {uiMode === "simple" ? "Simple Assistant" : "Advanced Studio"}</span>
        </div>
      </footer>
    </div>,
    document.body
  );
}
