"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/frontend/store";
import { motion } from "framer-motion";
import {
  Sliders,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Play,
  Sparkles,
  Zap,
  Shield,
  Eye,
} from "lucide-react";

interface Condition {
  id: string;
  type: "contains" | "equals" | "starts_with" | "regex" | "reply_all";
  value: string;
}

interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  colorLabel: "red" | "blue" | "yellow" | "green";
  conditions: Condition[];
  operator: "AND" | "OR";
  delaySeconds: number;
  dailyLimit: number;
  templateId: string;
  customVariable1?: string;
  customVariable2?: string;
  customVariable3?: string;
  approvalMode?: "autonomous" | "review";
}

interface Template {
  id: string;
  name: string;
  emoji: string;
  body: string;
}

const colorMap: Record<string, string> = {
  red: "bg-coral-500",
  blue: "bg-navy-500",
  yellow: "bg-volt-500",
  green: "bg-mint-500",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function RulesListPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTestRuleId, setActiveTestRuleId] = useState<string | null>(null);
  const [testCommentText, setTestCommentText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [rulesRes, templatesRes] = await Promise.all([fetch("/api/rules"), fetch("/api/templates")]);
        if (rulesRes.ok) setRules(await rulesRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());
      } catch (err) { console.error("Error fetching data:", err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [refreshTrigger]);

  const handleToggleActive = async (ruleId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) { showToast("Rule status updated.", "success"); triggerRefresh(); }
    } catch (err) { console.error("Error toggling:", err); }
  };

  const handleToggleApprovalMode = async (ruleId: string, mode: "autonomous" | "review") => {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalMode: mode })
      });
      if (res.ok) { showToast("Approval mode updated.", "success"); triggerRefresh(); }
    } catch (err) { console.error("Error:", err); }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      if (res.ok) { showToast("Rule deleted.", "success"); triggerRefresh(); }
    } catch (err) { console.error("Error:", err); }
  };

  const handleReorder = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const reordered = [...rules];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    try {
      const res = await fetch("/api/rules/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleIds: reordered.map((r) => r.id) })
      });
      if (res.ok) { showToast("Priority updated.", "success"); triggerRefresh(); }
    } catch (err) { console.error("Reorder error:", err); }
  };

  const handleTestRule = (rule: Rule) => {
    if (!testCommentText.trim()) { setTestResult("Please type or paste a comment first."); return; }
    const matchesCondition = (text: string, type: string, value: string): boolean => {
      if (type === "reply_all") return true;
      const t = text.toLowerCase();
      const v = value.toLowerCase().trim();
      if (!v) return false;
      if (type === "contains") return t.includes(v);
      if (type === "equals") return t === v;
      if (type === "starts_with") return t.startsWith(v);
      if (type === "regex") { try { return new RegExp(value, "i").test(text); } catch { return false; } }
      return false;
    };
    const isMatch = rule.operator === "OR"
      ? rule.conditions.some((c) => matchesCondition(testCommentText, c.type, c.value))
      : rule.conditions.every((c) => matchesCondition(testCommentText, c.type, c.value));

    if (isMatch) {
      const template = templates.find((t) => t.id === rule.templateId);
      const body = template ? template.body : "Thank you for commenting!";
      const replyText = body
        .replace(/\{\{commenter_name\}\}/g, "Viewer")
        .replace(/\{\{video_title\}\}/g, "My Video")
        .replace(/\{\{channel_name\}\}/g, "My Channel")
        .replace(/\{\{reply_date\}\}/g, new Date().toLocaleDateString())
        .replace(/\{\{custom_variable_1\}\}/g, rule.customVariable1 || "")
        .replace(/\{\{custom_variable_2\}\}/g, rule.customVariable2 || "")
        .replace(/\{\{custom_variable_3\}\}/g, rule.customVariable3 || "");
      setTestResult(`✓ Matched: ${rule.name} → '${replyText}'`);
    } else {
      setTestResult("✗ No rule matched this comment");
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left max-w-4xl"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-volt-500/10 flex items-center justify-center">
            <Sliders className="h-4 w-4 text-volt-700" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
              Auto-Reply <span className="gradient-text">Rules</span>
            </h1>
            <p className="text-sm text-ink-500 mt-0.5">
              Rules are evaluated in priority order. Higher priority = evaluated first.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-volt-50 border border-volt-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-volt-800">
              <span>⚡ Evaluates in &lt;0.1ms before calling Enterprise RAG</span>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/rules/new"
          className="btn-primary inline-flex items-center gap-1.5 text-xs !rounded-xl shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Rule
        </Link>
      </motion.div>

      {/* Rules list */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-premium glass-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 shimmer rounded-lg" />
                  <div className="h-3 w-40 shimmer rounded-full" />
                  <div className="h-3 w-20 shimmer rounded-full ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <motion.div variants={item} className="card-premium glass-card p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
              <Sliders className="h-6 w-6 text-ink-400" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-700">No Rules Found</h4>
            <p className="text-xs text-ink-400 mt-1 mb-4 max-w-[280px] mx-auto">
              Create your first auto-reply keyword rule to get started.
            </p>
            <Link href="/dashboard/rules/new" className="btn-primary inline-flex items-center gap-1 text-xs !rounded-xl">
              <Plus className="h-3.5 w-3.5" /> Create First Rule
            </Link>
          </motion.div>
        ) : (
          rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              variants={item}
              className={`card-premium glass-card p-4${!rule.isActive ? "opacity-65" : ""}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Priority + Info */}
                <div className="flex items-start sm:items-center gap-3">
                  {/* Priority arrows */}
                  <div className="flex flex-col gap-0.5 items-center shrink-0 bg-surface-50 border border-surface-200/60 rounded-xl p-1.5">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, "up")}
                      className="rounded-lg p-0.5 text-ink-400 hover:bg-surface-200 hover:text-ink-700 disabled:opacity-20 transition-all cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] font-bold text-ink-600">P{rule.priority}</span>
                    <button
                      disabled={idx === rules.length - 1}
                      onClick={() => handleReorder(idx, "down")}
                      className="rounded-lg p-0.5 text-ink-400 hover:bg-surface-200 hover:text-ink-700 disabled:opacity-20 transition-all cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-left space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colorMap[rule.colorLabel] || "bg-ink-400"}`} />
                      <span className="font-display text-sm font-bold text-ink-800">{rule.name}</span>
                      {!rule.isActive && (
                        <span className="bg-surface-100 text-ink-400 text-[9px] font-bold px-1.5 py-0.5 rounded-lg uppercase">Inactive</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-ink-400 uppercase font-bold">Matches:</span>
                      {rule.conditions.map((c) => (
                        <span key={c.id} className="bg-surface-100 border border-surface-200/60 rounded-lg px-2 py-0.5 text-[10px] font-mono font-medium text-ink-600">
                          {c.type === "reply_all" ? "Every Comment" : c.type === "starts_with" ? `Starts: ${c.value}` : c.value}
                        </span>
                      ))}
                      {rule.conditions.length > 1 && (
                        <span className="text-[9px] font-bold text-navy-600 bg-navy-500/6 px-1.5 py-0.5 rounded-lg">{rule.operator}</span>
                      )}
                    </div>

                    <div className="text-[10px] text-ink-400 font-medium">
                      Delay: {Math.round(rule.delaySeconds / 60)} min · Daily Cap: {rule.dailyLimit} replies
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {/* Approval Mode */}
                  <div className="flex items-center gap-0.5 bg-surface-100 rounded-xl p-0.5 border border-surface-200/60 text-[10px]">
                    <button
                      onClick={() => handleToggleApprovalMode(rule.id, "autonomous")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        (rule.approvalMode || "autonomous") === "autonomous"
                          ? "bg-white text-navy-600 shadow-sm font-bold"
                          : "text-ink-400 hover:text-ink-600"
                      }`}
                    >
                      <Zap className="h-2.5 w-2.5" /> Auto
                    </button>
                    <button
                      onClick={() => handleToggleApprovalMode(rule.id, "review")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        (rule.approvalMode || "autonomous") === "review"
                          ? "bg-white text-volt-700 shadow-sm font-bold"
                          : "text-ink-400 hover:text-ink-600"
                      }`}
                    >
                      <Eye className="h-2.5 w-2.5" /> Review
                    </button>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-ink-400 uppercase">Active</span>
                    <button
                      onClick={() => handleToggleActive(rule.id, rule.isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        rule.isActive ? "bg-navy-500" : "bg-surface-200"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        rule.isActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Test */}
                  <button
                    onClick={() => {
                      if (activeTestRuleId === rule.id) { setActiveTestRuleId(null); setTestCommentText(""); setTestResult(null); }
                      else { setActiveTestRuleId(rule.id); setTestCommentText(""); setTestResult(null); }
                    }}
                    className={`rounded-xl p-2 transition-all border ${
                      activeTestRuleId === rule.id
                        ? "bg-navy-500/6 border-navy-200/40 text-navy-600"
                        : "border-surface-200/60 text-ink-400 hover:bg-surface-100"
                    }`}
                    title="Test this rule"
                  >
                    <Play className="h-4 w-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => router.push(`/dashboard/rules/${rule.id}`)}
                    className="rounded-xl p-2 text-ink-400 hover:bg-surface-100 hover:text-navy-500 transition-all border border-transparent"
                    title="Edit Rule"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-xl p-2 text-ink-400 hover:bg-coral-500/6 hover:text-coral-600 transition-all border border-transparent"
                    title="Delete Rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inline Test Panel */}
              {activeTestRuleId === rule.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="w-full mt-3 pt-3 border-t border-surface-200/60 space-y-3"
                >
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em]">
                      Paste a comment to test
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testCommentText}
                        onChange={(e) => setTestCommentText(e.target.value)}
                        placeholder="e.g. How much is the Pro workspace?"
                        className="input-glass flex-1 !rounded-xl !py-2"
                      />
                      <button
                        onClick={() => handleTestRule(rule)}
                        className="btn-primary !rounded-xl !text-xs !py-2 !px-4 shrink-0"
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`rounded-xl p-3 text-xs font-medium text-left ${
                      testResult.startsWith("✓")
                        ? "!bg-mint-50 !border !border-mint-200/60 !text-mint-700"
                        : "!bg-coral-50 !border !border-coral-200/60 !text-coral-700"
                    }`}>
                      {testResult}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
