"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/frontend/store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Info,
  ChevronRight,
  X,
  Play,
  BookOpen,
  Sparkles,
  Zap,
  Filter,
  FileText,
  Timer,
} from "lucide-react";

interface Condition {
  id: string;
  type: "contains" | "equals" | "starts_with" | "regex" | "reply_all";
  value: string;
}

interface RuleBuilderFormProps {
  ruleId?: string;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function RuleBuilderForm({ ruleId }: RuleBuilderFormProps) {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);

  const [ruleName, setRuleName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [colorLabel, setColorLabel] = useState<"red" | "blue" | "yellow" | "green">("blue");

  const [conditions, setConditions] = useState<Condition[]>([
    { id: "cond-init-1", type: "contains", value: "" },
  ]);
  const [operator, setOperator] = useState<"AND" | "OR">("OR");

  const [topLevelOnly, setTopLevelOnly] = useState(true);
  const [maxReplies, setMaxReplies] = useState(5);
  const [language, setLanguage] = useState("auto");

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [replyTextPreview, setReplyTextPreview] = useState("");
  const [customVar1, setCustomVar1] = useState("");
  const [customVar2, setCustomVar2] = useState("");
  const [customVar3, setCustomVar3] = useState("");

  const [delayMinutes, setDelayMinutes] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(50);

  const [testingDrawerOpen, setTestingDrawerOpen] = useState(false);
  const [testComments, setTestComments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});

  const replyTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const tplRes = await fetch("/api/templates");
        let tpls = [];
        if (tplRes.ok) {
          tpls = await tplRes.json();
          // If no templates exist, create a default one
          if (tpls.length === 0) {
            const createRes = await fetch("/api/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Default Reply",
                emoji: "💬",
                body: "Hi {{commenter_name}}, thanks for your comment on {{video_title}}! Let me help — please check your inbox for details.",
              }),
            });
            if (createRes.ok) {
              tpls = [await createRes.json()];
            }
          }
          setTemplates(tpls);
          if (tpls.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(tpls[0].id);
            setReplyTextPreview(tpls[0].body);
          }
        }

        if (ruleId) {
          const ruleRes = await fetch(`/api/rules/${ruleId}`);
          if (ruleRes.ok) {
            const r = await ruleRes.json();
            setRuleName(r.name);
            setIsActive(r.isActive);
            setColorLabel(r.colorLabel);
            setConditions(r.conditions);
            setOperator(r.operator);
            setTopLevelOnly(r.filters.topLevelOnly);
            setMaxReplies(r.filters.maxRepliesPerUser);
            setLanguage(r.filters.language);
            setSelectedTemplateId(r.templateId);
            setDelayMinutes(Math.round(r.delaySeconds / 60));
            setDailyLimit(r.dailyLimit);
            setCustomVar1(r.customVariable1);
            setCustomVar2(r.customVariable2);
            setCustomVar3(r.customVariable3);

            const tplDetailRes = await fetch(`/api/templates/${r.templateId}`);
            if (tplDetailRes.ok) {
              const td = await tplDetailRes.json();
              setReplyTextPreview(td.body);
            }
          }
        }
      } catch (err) {
        console.error("Error loading rule builder data:", err);
      }
    }
    loadData();
  }, [ruleId, selectedTemplateId]);

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const matched = templates.find((t) => t.id === tplId);
    if (matched) setReplyTextPreview(matched.body);
  };

  const addCondition = () => {
    setConditions([...conditions, { id: `cond-${Date.now()}`, type: "contains", value: "" }]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length === 1) return;
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateConditionValue = (id: string, val: string) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, value: val } : c)));
  };

  const updateConditionType = (id: string, type: Condition["type"]) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, type } : c)));
  };

  const insertVariable = (variable: string) => {
    const textarea = replyTextAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = replyTextPreview.substring(0, start) + variable + replyTextPreview.substring(end);
    setReplyTextPreview(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 10);
  };

  const runTestRule = async () => {
    setTestingDrawerOpen(true);
    try {
      const res = await fetch("/api/comments");
      if (res.ok) {
        const comments = await res.json();
        setTestComments(comments.slice(0, 10));
        const results: { [key: string]: boolean } = {};
        comments.slice(0, 10).forEach((comment: any) => {
          const textLower = comment.text.toLowerCase();
          const matches = conditions.map((cond) => {
            if (cond.type === "reply_all") return true;
            const condVal = cond.value.toLowerCase().trim();
            if (!condVal) return false;
            if (cond.type === "contains") return textLower.includes(condVal);
            if (cond.type === "equals") return textLower === condVal;
            if (cond.type === "starts_with") return textLower.startsWith(condVal);
            if (cond.type === "regex") {
              try {
                return new RegExp(cond.value, "i").test(comment.text);
              } catch {
                return false;
              }
            }
            return false;
          });
          if (matches.length === 0 || conditions.every(c => c.type !== "reply_all" && !c.value.trim())) {
            results[comment.id] = false;
          } else if (operator === "AND") {
            results[comment.id] = matches.every(m => m);
          } else {
            results[comment.id] = matches.some(m => m);
          }
        });
        setTestResults(results);
      }
    } catch (err) {
      console.error("Test rule error:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure we have a template — create one if none selected
      let finalTemplateId = selectedTemplateId;
      if (!finalTemplateId) {
        const createRes = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ruleName ? `${ruleName} Reply` : "Auto Reply",
            emoji: "💬",
            body: replyTextPreview || "Hi {{commenter_name}}, thanks for your comment!",
          }),
        });
        if (createRes.ok) {
          const newTpl = await createRes.json();
          finalTemplateId = newTpl.id;
          setSelectedTemplateId(newTpl.id);
        }
      } else {
        // Update existing template body
        await fetch(`/api/templates/${selectedTemplateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyTextPreview }),
        });
      }
      const payload = {
        name: ruleName || "Unnamed Rule",
        isActive,
        colorLabel,
        conditions: conditions.filter(c => c.type === "reply_all" || c.value.trim() !== ""),
        operator,
        filters: { topLevelOnly, maxRepliesPerUser: maxReplies, language },
        templateId: finalTemplateId,
        delaySeconds: delayMinutes * 60,
        dailyLimit,
        customVariable1: customVar1,
        customVariable2: customVar2,
        customVariable3: customVar3,
      };
      const endpoint = ruleId ? `/api/rules/${ruleId}` : "/api/rules";
      const method = ruleId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(ruleId ? "Rule updated!" : "Rule created!", "success");
        triggerRefresh();
        router.push("/dashboard/rules");
      } else {
        showToast("Error saving rule", "error");
      }
    } catch (err) {
      showToast("Network error saving rule", "error");
    }
  };

  const highlightKeywords = (text: string) => {
    let result: React.ReactNode[] = [text];
    conditions.forEach((cond) => {
      const val = cond.value.trim();
      if (!val || val.length > 100) return;
      const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let regex: RegExp;
      try { regex = new RegExp(`(${escapedVal})`, "gi"); } catch { return; }
      const newResult: React.ReactNode[] = [];
      result.forEach((node) => {
        if (typeof node !== "string") { newResult.push(node); return; }
        const parts = node.split(regex);
        parts.forEach((part, i) => {
          if (part.toLowerCase() === val.toLowerCase()) {
            newResult.push(<span key={`${i}-${part}`} className="bg-volt-100 font-bold px-0.5 rounded text-volt-800">{part}</span>);
          } else if (part !== "") {
            newResult.push(part);
          }
        });
      });
      result = newResult;
    });
    return result;
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, color }: { icon: any; title: string; subtitle: string; color: string }) => (
    <div className="flex items-center gap-3 border-b border-surface-200/60 pb-4 mb-5">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0
        ${color === "navy" ? "bg-navy-500/8" : ""}
        ${color === "volt" ? "bg-volt-500/10" : ""}
        ${color === "mint" ? "bg-mint-500/10" : ""}
        ${color === "purple" ? "bg-purple-500/10" : ""}
        ${color === "coral" ? "bg-coral-500/10" : ""}
      `}>
        <Icon className={`h-4 w-4
          ${color === "navy" ? "text-navy-500" : ""}
          ${color === "volt" ? "text-volt-700" : ""}
          ${color === "mint" ? "text-mint-600" : ""}
          ${color === "purple" ? "text-purple-600" : ""}
          ${color === "coral" ? "text-coral-500" : ""}
        `} />
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-ink-800">{title}</h3>
        <p className="text-[11px] text-ink-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Section 1: Rule Info */}
        <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="card-premium glass-card p-6">
          <SectionHeader icon={Sparkles} title="Rule Identity" subtitle="Name your rule and set its status." color="navy" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Rule Name</label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Price & Cost keywords"
                className="input-glass"
              />
            </div>

            <div className="flex items-center gap-8 shrink-0 pt-4 sm:pt-0">
              <div className="flex flex-col items-start gap-2">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Color</span>
                <div className="flex items-center gap-2 mt-1">
                  {(["blue", "red", "yellow", "green"] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorLabel(color)}
                      className={`h-7 w-7 rounded-xl border-2 transition-all duration-200 active:scale-90
                        ${color === "blue" ? "bg-navy-500" : ""}
                        ${color === "red" ? "bg-coral-500" : ""}
                        ${color === "yellow" ? "bg-volt-500" : ""}
                        ${color === "green" ? "bg-mint-500" : ""}
                        ${colorLabel === color
                          ? "border-ink-800 scale-110 shadow-md"
                          : "border-transparent hover:border-surface-300 hover:scale-105"
                        }
                      `}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Status</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-1
                    ${isActive ? "bg-navy-500" : "bg-surface-200"}
                  `}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out
                    ${isActive ? "translate-x-5" : "translate-x-0"}
                  `} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 2: Trigger Conditions */}
        <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="card-premium glass-card p-6">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-volt-500/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-volt-700" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink-800">Trigger Conditions</h3>
                <p className="text-[11px] text-ink-400 mt-0.5">Define keywords to match incoming comments.</p>
              </div>
            </div>

            <div className="inline-flex items-center rounded-xl bg-surface-100 p-0.5 border border-surface-200/80 text-xs">
              <button
                type="button"
                onClick={() => setOperator("OR")}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all duration-200
                  ${operator === "OR" ? "bg-surface-0 text-navy-600 shadow-sm" : "text-ink-400 hover:text-ink-700"}
                `}
              >
                OR
              </button>
              <button
                type="button"
                onClick={() => setOperator("AND")}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all duration-200
                  ${operator === "AND" ? "bg-surface-0 text-navy-600 shadow-sm" : "text-ink-400 hover:text-ink-700"}
                `}
              >
                AND
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {conditions.map((cond, index) => (
              <div key={cond.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-surface-50/80 border border-surface-200/40">
                <div className="text-xs font-bold text-ink-400 w-10">
                  {index === 0 ? "IF" : operator}
                </div>

                <select
                  value={cond.type}
                  onChange={(e) => updateConditionType(cond.id, e.target.value as any)}
                  className="input-glass !w-auto !py-2 !px-3 text-xs"
                >
                  <option value="contains">Keyword / Phrase</option>
                  <option value="equals">Exact match</option>
                  <option value="starts_with">Starts with</option>
                  <option value="regex">Regex pattern</option>
                  <option value="reply_all">Reply to every comment</option>
                </select>

                <div className="text-xs font-medium text-ink-500">
                  {cond.type === "contains" ? "contains" : cond.type === "starts_with" ? "starts with" : cond.type === "reply_all" ? "" : "equals"}
                </div>

                {cond.type !== "reply_all" && (
                  <input
                    type="text"
                    required
                    value={cond.value}
                    onChange={(e) => updateConditionValue(cond.id, e.target.value)}
                    placeholder="e.g. price"
                    className="input-glass flex-1 min-w-[150px] !py-2 text-xs font-mono"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  disabled={conditions.length === 1}
                  className="rounded-xl p-2 text-ink-400 hover:bg-coral-50 hover:text-coral-500 transition-all disabled:opacity-30"
                  title="Remove Condition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCondition}
            className="btn-glass inline-flex items-center gap-1.5 !rounded-xl mt-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Condition
          </button>
        </motion.div>

        {/* Section 3: Filters */}
        <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="card-premium glass-card p-6">
          <SectionHeader icon={Filter} title="Filters" subtitle="Fine-tune when this rule applies." color="mint" />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-surface-200/60 p-4 hover:bg-surface-50/80 transition-all group">
              <input
                type="checkbox"
                checked={topLevelOnly}
                onChange={(e) => setTopLevelOnly(e.target.checked)}
                className="mt-0.5 rounded-lg border-surface-300 text-navy-500 focus:ring-navy-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-ink-800 block">Top-Level Only</span>
                <span className="text-ink-400">Skip threads and nested replies.</span>
              </div>
            </label>

            <div className="rounded-xl border border-surface-200/60 p-4 flex flex-col justify-between">
              <div className="text-xs">
                <span className="font-bold text-ink-800 block">Reply Limit</span>
                <span className="text-ink-400">Max prior replies from same user.</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxReplies}
                  onChange={(e) => setMaxReplies(parseInt(e.target.value) || 5)}
                  className="input-glass !w-16 !py-1.5 !px-2 text-xs text-center"
                />
                <span className="text-[10px] font-bold text-ink-400 uppercase">replies</span>
              </div>
            </div>

            <div className="rounded-xl border border-surface-200/60 p-4 flex flex-col justify-between">
              <div className="text-xs">
                <span className="font-bold text-ink-800 block">Language</span>
                <span className="text-ink-400">Verify matching language.</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-glass !py-1.5 mt-3 text-xs"
              >
                <option value="auto">Auto-detect (Recommended)</option>
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Action Template */}
        <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible" className="card-premium glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-surface-200/60 pb-4 mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink-800">Reply Template</h3>
                <p className="text-[11px] text-ink-400 mt-0.5">Select a template and configure variables.</p>
              </div>
            </div>

            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="input-glass !w-auto !py-2 text-xs"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Insert Variables</label>
              <select
                onChange={(e) => { if (e.target.value) { insertVariable(e.target.value); e.target.value = ""; } }}
                className="input-glass max-w-xs text-xs"
                defaultValue=""
              >
                <option value="" disabled>Select variable...</option>
                <option value="{{commenter_name}}">{"{{commenter_name}}"} — Commenter name</option>
                <option value="{{video_title}}">{"{{video_title}}"} — Video title</option>
                <option value="{{channel_name}}">{"{{channel_name}}"} — Channel name</option>
                <option value="{{reply_date}}">{"{{reply_date}}"} — Today&apos;s date</option>
                <option value="{{custom_variable_1}}">{"{{custom_variable_1}}"} — Custom 1 (Link)</option>
                <option value="{{custom_variable_2}}">{"{{custom_variable_2}}"} — Custom 2 (Code)</option>
                <option value="{{custom_variable_3}}">{"{{custom_variable_3}}"} — Custom 3 (Contact)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <textarea
                ref={replyTextAreaRef}
                rows={4}
                required
                value={replyTextPreview}
                onChange={(e) => setReplyTextPreview(e.target.value)}
                placeholder="Compose your reply body..."
                className="input-glass resize-none font-sans leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Live Preview</label>
              <div className="rounded-xl border border-surface-200/60 bg-surface-50 p-4 text-xs text-ink-600 font-sans leading-relaxed italic min-h-[60px]">
                {replyTextPreview ? (
                  replyTextPreview
                    .replace(/\{\{commenter_name\}\}/g, "John Doe")
                    .replace(/\{\{video_title\}\}/g, "My Latest Video")
                    .replace(/\{\{channel_name\}\}/g, "My Channel")
                    .replace(/\{\{reply_date\}\}/g, new Date().toLocaleDateString())
                    .replace(/\{\{custom_variable_1\}\}/g, customVar1 || "")
                    .replace(/\{\{custom_variable_2\}\}/g, customVar2 || "")
                    .replace(/\{\{custom_variable_3\}\}/g, customVar3 || "")
                ) : (
                  <span className="text-ink-400 not-italic">Type your template to see a live preview...</span>
                )}
              </div>
            </div>

            <div className="grid gap-3 pt-3 sm:grid-cols-3 border-t border-surface-200/60">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Custom 1 (Link)</label>
                <input type="text" value={customVar1} onChange={(e) => setCustomVar1(e.target.value)} placeholder="https://..." className="input-glass text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Custom 2 (Code)</label>
                <input type="text" value={customVar2} onChange={(e) => setCustomVar2(e.target.value)} placeholder="PROMO10" className="input-glass text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Custom 3 (Contact)</label>
                <input type="text" value={customVar3} onChange={(e) => setCustomVar3(e.target.value)} placeholder="support@..." className="input-glass text-xs" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 5: Delays & Limits */}
        <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible" className="card-premium glass-card p-6">
          <SectionHeader icon={Timer} title="Scheduling" subtitle="Control timing and daily limits." color="coral" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Humanization Delay</label>
              <p className="text-[11px] text-ink-400 mb-2">Add delay to make replies appear human-written.</p>
              <select
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 3)}
                className="input-glass text-xs"
              >
                <option value={1}>1 Minute</option>
                <option value={2}>2 Minutes</option>
                <option value={3}>3 Minutes (Recommended)</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">Daily Cap</label>
              <p className="text-[11px] text-ink-400 mb-2">Prevent spam and API quota exhaustion.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                  className="input-glass !w-24 text-xs text-center"
                />
                <span className="text-xs text-ink-400 font-semibold">replies / day</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit Bar */}
        <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-200/60 pt-6">
          <button
            type="button"
            onClick={runTestRule}
            className="btn-glass inline-flex items-center gap-2 !rounded-xl text-xs"
          >
            <Play className="h-4 w-4 text-navy-500" />
            Test on Sample Comments
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/rules")}
              className="text-xs font-semibold text-ink-500 hover:text-ink-800 px-4 py-2.5 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary inline-flex items-center gap-2 !rounded-xl text-xs">
              Save Rule
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </form>

      {/* Testing Drawer */}
      <AnimatePresence>
        {testingDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTestingDrawerOpen(false)}
              className="fixed inset-0 bg-navy-900/20 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full max-w-[440px] flex-col glass-strong shadow-elevated-lg"
            >
              <div className="flex h-16 items-center justify-between border-b border-surface-200/60 px-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-navy-500/8 flex items-center justify-center">
                    <Play className="h-4 w-4 text-navy-500" />
                  </div>
                  <span className="font-display text-sm font-bold text-ink-800">Rule Match Tester</span>
                </div>
                <button onClick={() => setTestingDrawerOpen(false)} className="rounded-xl p-2 text-ink-400 hover:bg-surface-100 hover:text-ink-700 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                <div className="rounded-xl bg-navy-500/5 border border-navy-200/30 p-3.5 text-xs text-navy-700 leading-relaxed">
                  <Info className="h-4 w-4 text-navy-500 inline shrink-0 mr-1.5 align-text-bottom" />
                  Comments highlighted in <span className="text-mint-600 font-bold bg-mint-50 px-1 border border-mint-200/60 rounded">green</span> match your conditions.
                </div>

                <div className="space-y-3">
                  {testComments.map((comment) => {
                    const isMatched = testResults[comment.id] || false;
                    return (
                      <div
                        key={comment.id}
                        className={`rounded-xl border p-4 card-premium glass-card !rounded-2xl transition-all
                          ${isMatched ? "!border-mint-300/60 !shadow-glow-navy" : ""}
                        `}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <img src={comment.authorAvatar} alt={comment.author} className="h-6 w-6 rounded-lg object-cover border border-surface-200" />
                            <span className="text-xs font-bold text-ink-800">{comment.author}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
                            ${isMatched ? "bg-mint-50 text-mint-600" : "bg-surface-100 text-ink-400"}
                          `}>
                            {isMatched ? "Match" : "No Match"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-600 leading-relaxed italic mb-2">
                          &ldquo;{highlightKeywords(comment.text)}&rdquo;
                        </p>
                        {isMatched && (
                          <div className="bg-surface-50 rounded-xl p-3 border border-surface-200/60 text-[10px] text-ink-500 italic leading-relaxed">
                            <span className="font-bold text-navy-600 block mb-1">Auto-reply preview:</span>
                            {replyTextPreview
                              .replace(/\{\{commenter_name\}\}/g, comment.author)
                              .replace(/\{\{channel_name\}\}/g, "TechUnboxed")
                              .replace(/\{\{video_title\}\}/g, comment.videoTitle)
                              .replace(/\{\{custom_variable_1\}\}/g, customVar1)
                              .replace(/\{\{custom_variable_2\}\}/g, customVar2)
                              .replace(/\{\{custom_variable_3\}\}/g, customVar3)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex h-14 items-center justify-end border-t border-surface-200/60 bg-surface-0/50 px-5">
                <button onClick={() => setTestingDrawerOpen(false)} className="btn-primary !rounded-xl text-xs">
                  Done Testing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
