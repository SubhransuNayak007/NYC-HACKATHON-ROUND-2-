"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/frontend/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Trash2,
  X,
  Link2,
  Clock,
  ChevronRight,
  Play,
  Pause,
  Settings,
  Globe,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Webhook,
  Send,
  Repeat,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

interface AutomationChain {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  conditions: { id: string; type: string; value: string; advancedType?: string; advancedOperator?: string; advancedValue?: string }[];
  operator: "AND" | "OR";
  actions: { id: string; type: string; config: Record<string, string> }[];
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface WebhookTrigger {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastFiredAt?: string;
  fireCount: number;
}

interface FollowUpSequence {
  id: string;
  commentId: string;
  sequence: { step: number; delayHours: number; message: string; status: string }[];
  escalateAfterSteps: number;
  status: string;
  createdAt: string;
}

export default function AutomationsPage() {
  const showToast = useUIStore((s) => s.showToast);
  const triggerRefresh = useUIStore((s) => s.triggerRefresh);
  const refreshTrigger = useUIStore((s) => s.refreshTrigger);

  const [activeTab, setActiveTab] = useState<"chains" | "webhooks" | "followups">("chains");
  const [chains, setChains] = useState<AutomationChain[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([]);
  const [followups, setFollowups] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(false);

  // Chain form
  const [showChainForm, setShowChainForm] = useState(false);
  const [chainName, setChainName] = useState("");
  const [chainConditions, setChainConditions] = useState<{ id: string; type: string; value: string; advancedType?: string; advancedOperator?: string; advancedValue?: string }[]>([
    { id: "c1", type: "contains", value: "" },
  ]);
  const [chainOperator, setChainOperator] = useState<"AND" | "OR">("AND");
  const [chainActions, setChainActions] = useState<{ id: string; type: string; config: Record<string, string> }[]>([
    { id: "a1", type: "reply", config: { templateId: "" } },
  ]);

  // Webhook form
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [whName, setWhName] = useState("");
  const [whUrl, setWhUrl] = useState("");
  const [whSecret, setWhSecret] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(["comment_replied"]);

  // Follow-up form
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [fuSteps, setFuSteps] = useState<{ delayHours: number; message: string }[]>([
    { delayHours: 24, message: "" },
  ]);
  const [fuEscalateAfter, setFuEscalateAfter] = useState(3);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, wRes, fRes] = await Promise.all([
          fetch("/api/automations/chains"),
          fetch("/api/automations/webhooks"),
          fetch("/api/automations/followups"),
        ]);
        if (cRes.ok) setChains(await cRes.json());
        if (wRes.ok) setWebhooks(await wRes.json());
        if (fRes.ok) setFollowups(await fRes.json());
      } catch (e) { console.error("Load error:", e); }
      finally { setLoading(false); }
    }
    load();
  }, [refreshTrigger]);

  // ── Chain CRUD ──
  const handleCreateChain = async () => {
    if (!chainName) return showToast("Enter a chain name", "error");
    try {
      const res = await fetch("/api/automations/chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chainName,
          conditions: chainConditions.filter((c) => c.value.trim()),
          operator: chainOperator,
          actions: chainActions.filter((a) => a.type),
        }),
      });
      if (res.ok) {
        showToast("Chain created!", "success");
        setShowChainForm(false);
        setChainName("");
        triggerRefresh();
      }
    } catch { showToast("Failed to create chain", "error"); }
  };

  const toggleChain = async (chain: AutomationChain) => {
    try {
      await fetch(`/api/automations/chains/${chain.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !chain.isActive }),
      });
      triggerRefresh();
    } catch { showToast("Failed to toggle", "error"); }
  };

  const deleteChain = async (id: string) => {
    try {
      await fetch(`/api/automations/chains/${id}`, { method: "DELETE" });
      showToast("Chain deleted", "success");
      triggerRefresh();
    } catch { showToast("Failed to delete", "error"); }
  };

  // ── Webhook CRUD ──
  const handleCreateWebhook = async () => {
    if (!whName || !whUrl) return showToast("Name and URL required", "error");
    try {
      const res = await fetch("/api/automations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: whName, url: whUrl, secret: whSecret, events: whEvents }),
      });
      if (res.ok) {
        showToast("Webhook created!", "success");
        setShowWebhookForm(false);
        setWhName(""); setWhUrl(""); setWhSecret("");
        triggerRefresh();
      }
    } catch { showToast("Failed to create webhook", "error"); }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/automations/webhooks/${id}`, { method: "DELETE" });
      showToast("Webhook deleted", "success");
      triggerRefresh();
    } catch { showToast("Failed to delete", "error"); }
  };

  const toggleWebhook = async (wh: WebhookTrigger) => {
    try {
      await fetch(`/api/automations/webhooks/${wh.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      triggerRefresh();
    } catch { showToast("Failed to toggle", "error"); }
  };

  const CONDITION_TYPES = [
    { value: "contains", label: "Keyword contains" },
    { value: "equals", label: "Exact match" },
    { value: "starts_with", label: "Starts with" },
    { value: "subscriber_count", label: "Subscriber count" },
    { value: "language", label: "Language" },
    { value: "time_of_day", label: "Time of day" },
    { value: "day_of_week", label: "Day of week" },
  ];

  const ACTION_TYPES = [
    { value: "reply", label: "Send Reply", icon: Send },
    { value: "flag_for_review", label: "Flag for Review", icon: AlertCircle },
    { value: "send_webhook", label: "Send Webhook", icon: Webhook },
    { value: "assign_to", label: "Assign to Team Member", icon: ArrowRight },
    { value: "escalate", label: "Escalate", icon: ChevronRight },
    { value: "send_notification", label: "Send Notification", icon: AlertCircle },
  ];

  const WEBHOOK_EVENTS = [
    { value: "comment_matched", label: "Comment Matched" },
    { value: "comment_replied", label: "Comment Replied" },
    { value: "rule_triggered", label: "Rule Triggered" },
    { value: "milestone_reached", label: "Milestone Reached" },
    { value: "quota_warning", label: "Quota Warning" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-premium glass-card p-6 space-y-3">
            <div className="h-5 w-40 shimmer rounded-full" />
            <div className="h-16 shimmer rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const tabs = [
    { id: "chains" as const, label: "Conditional Chains", icon: Zap, count: chains.length },
    { id: "webhooks" as const, label: "Webhook Triggers", icon: Webhook, count: webhooks.length },
    { id: "followups" as const, label: "Follow-up Sequences", icon: Repeat, count: followups.length },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 text-left">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-navy-500/8 flex items-center justify-center">
            <Zap className="h-4 w-4 text-navy-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
              Workflow <span className="gradient-text">Automations</span>
            </h1>
            <p className="text-sm text-ink-500 mt-0.5">
              Build conditional chains, webhooks, and follow-up sequences.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex items-center gap-1 p-1 rounded-2xl bg-surface-100/80 border border-surface-200/60 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
              ${activeTab === tab.id ? "bg-surface-0 text-navy-600 shadow-sm" : "text-ink-400 hover:text-ink-700"}
            `}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
              activeTab === tab.id ? "bg-navy-500/10 text-navy-600" : "bg-surface-200 text-ink-400"
            }`}>{tab.count}</span>
          </button>
        ))}
      </motion.div>

      {/* ═══ CHAINS TAB ═══ */}
      {activeTab === "chains" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowChainForm(!showChainForm)} className="btn-primary inline-flex items-center gap-2 !rounded-xl text-xs">
              <Plus className="h-3.5 w-3.5" /> New Chain
            </button>
          </div>

          {/* Chain Form */}
          <AnimatePresence>
            {showChainForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="card-premium glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-200/60 pb-3">
                    <h3 className="font-display text-sm font-bold text-ink-800">New Conditional Chain</h3>
                    <button onClick={() => setShowChainForm(false)} className="rounded-xl p-1.5 text-ink-400 hover:bg-surface-100"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Chain Name</label>
                    <input type="text" value={chainName} onChange={(e) => setChainName(e.target.value)} placeholder="e.g. VIP Subscriber Auto-Reply" className="input-glass" />
                  </div>

                  {/* Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">IF Conditions</label>
                      <div className="inline-flex items-center rounded-lg bg-surface-100 p-0.5 text-[10px]">
                        <button onClick={() => setChainOperator("AND")} className={`px-2 py-1 rounded-md font-bold transition-all ${chainOperator === "AND" ? "bg-surface-0 text-navy-600 shadow-sm" : "text-ink-400"}`}>AND</button>
                        <button onClick={() => setChainOperator("OR")} className={`px-2 py-1 rounded-md font-bold transition-all ${chainOperator === "OR" ? "bg-surface-0 text-navy-600 shadow-sm" : "text-ink-400"}`}>OR</button>
                      </div>
                    </div>
                    {chainConditions.map((cond, idx) => (
                      <div key={cond.id} className="flex flex-wrap items-center gap-2 mb-2 p-3 rounded-xl bg-surface-50/80 border border-surface-200/40">
                        <span className="text-[10px] font-bold text-ink-400 w-6">{idx === 0 ? "IF" : chainOperator}</span>
                        <select value={cond.type} onChange={(e) => {
                          const newConds = [...chainConditions];
                          newConds[idx] = { ...newConds[idx], type: e.target.value };
                          setChainConditions(newConds);
                        }} className="input-glass !w-auto !py-1.5 !px-2 text-xs">
                          {CONDITION_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                        </select>
                        {cond.type === "subscriber_count" ? (
                          <div className="flex items-center gap-1">
                            <select value={cond.advancedOperator || "gt"} onChange={(e) => {
                              const newConds = [...chainConditions];
                              newConds[idx] = { ...newConds[idx], advancedOperator: e.target.value };
                              setChainConditions(newConds);
                            }} className="input-glass !w-auto !py-1.5 !px-2 text-xs">
                              <option value="gt">&gt;</option>
                              <option value="lt">&lt;</option>
                              <option value="gte">≥</option>
                              <option value="lte">≤</option>
                              <option value="eq">=</option>
                            </select>
                            <input type="number" value={cond.advancedValue || ""} onChange={(e) => {
                              const newConds = [...chainConditions];
                              newConds[idx] = { ...newConds[idx], advancedValue: e.target.value, value: e.target.value };
                              setChainConditions(newConds);
                            }} placeholder="10000" className="input-glass !w-24 !py-1.5 text-xs" />
                            <span className="text-[10px] text-ink-400">subs</span>
                          </div>
                        ) : cond.type === "time_of_day" ? (
                          <div className="flex items-center gap-1">
                            <input type="time" value={cond.advancedValue || "09:00"} onChange={(e) => {
                              const newConds = [...chainConditions];
                              newConds[idx] = { ...newConds[idx], advancedValue: e.target.value, value: e.target.value };
                              setChainConditions(newConds);
                            }} className="input-glass !w-auto !py-1.5 text-xs" />
                          </div>
                        ) : cond.type === "day_of_week" ? (
                          <select value={cond.advancedValue || "0"} onChange={(e) => {
                            const newConds = [...chainConditions];
                            newConds[idx] = { ...newConds[idx], advancedValue: e.target.value, value: e.target.value };
                            setChainConditions(newConds);
                          }} className="input-glass !w-auto !py-1.5 text-xs">
                            <option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option>
                            <option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option>
                          </select>
                        ) : (
                          <input type="text" value={cond.value} onChange={(e) => {
                            const newConds = [...chainConditions];
                            newConds[idx] = { ...newConds[idx], value: e.target.value };
                            setChainConditions(newConds);
                          }} placeholder="e.g. price" className="input-glass flex-1 min-w-[120px] !py-1.5 text-xs" />
                        )}
                        <button onClick={() => setChainConditions(chainConditions.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-ink-400 hover:text-coral-500" disabled={chainConditions.length === 1}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => setChainConditions([...chainConditions, { id: `c${Date.now()}`, type: "contains", value: "" }])} className="btn-glass inline-flex items-center gap-1 !rounded-lg text-[10px] mt-1">
                      <Plus className="h-3 w-3" /> Add Condition
                    </button>
                  </div>

                  {/* Actions */}
                  <div>
                    <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block mb-2">THEN Actions</label>
                    {chainActions.map((action, idx) => (
                      <div key={action.id} className="flex items-center gap-2 mb-2 p-3 rounded-xl bg-surface-50/80 border border-surface-200/40">
                        <span className="text-[10px] font-bold text-ink-400 w-6">{idx + 1}.</span>
                        <select value={action.type} onChange={(e) => {
                          const newActions = [...chainActions];
                          newActions[idx] = { ...newActions[idx], type: e.target.value };
                          setChainActions(newActions);
                        }} className="input-glass !w-auto !py-1.5 !px-2 text-xs">
                          {ACTION_TYPES.map((at) => <option key={at.value} value={at.value}>{at.label}</option>)}
                        </select>
                        {action.type === "assign_to" && (
                          <input type="text" value={action.config.assignee || ""} onChange={(e) => {
                            const newActions = [...chainActions];
                            newActions[idx] = { ...newActions[idx], config: { ...newActions[idx].config, assignee: e.target.value } };
                            setChainActions(newActions);
                          }} placeholder="email@team.com" className="input-glass flex-1 !py-1.5 text-xs" />
                        )}
                        {action.type === "send_notification" && (
                          <select value={action.config.channel || "slack"} onChange={(e) => {
                            const newActions = [...chainActions];
                            newActions[idx] = { ...newActions[idx], config: { ...newActions[idx].config, channel: e.target.value } };
                            setChainActions(newActions);
                          }} className="input-glass !w-auto !py-1.5 text-xs">
                            <option value="slack">Slack</option>
                            <option value="discord">Discord</option>
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                          </select>
                        )}
                        <button onClick={() => setChainActions(chainActions.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-ink-400 hover:text-coral-500" disabled={chainActions.length === 1}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => setChainActions([...chainActions, { id: `a${Date.now()}`, type: "reply", config: {} }])} className="btn-glass inline-flex items-center gap-1 !rounded-lg text-[10px] mt-1">
                      <Plus className="h-3 w-3" /> Add Action
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-surface-200/60">
                    <button onClick={() => setShowChainForm(false)} className="text-xs font-semibold text-ink-500 hover:text-ink-800 px-4 py-2.5">Cancel</button>
                    <button onClick={handleCreateChain} className="btn-primary !rounded-xl text-xs inline-flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Create Chain
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chain List */}
          {chains.length === 0 ? (
            <div className="card-premium glass-card p-12 text-center">
              <Zap className="h-10 w-10 text-ink-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink-600">No automation chains yet</p>
              <p className="text-xs text-ink-400 mt-1">Create conditional chains to automate complex reply logic.</p>
            </div>
          ) : (
            chains.map((chain) => (
              <motion.div key={chain.id} variants={item} className="card-premium glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${chain.isActive ? "bg-mint-50" : "bg-surface-100"}`}>
                      <Zap className={`h-4 w-4 ${chain.isActive ? "text-mint-600" : "text-ink-400"}`} />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-ink-800">{chain.name}</h4>
                      <p className="text-[10px] text-ink-400">
                        {chain.conditions.length} conditions ({chain.operator}) → {chain.actions.length} actions · Triggered {chain.triggerCount}x
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleChain(chain)} className={`rounded-xl p-2 transition-all ${chain.isActive ? "bg-mint-50 text-mint-600 hover:bg-mint-100" : "bg-surface-100 text-ink-400 hover:bg-surface-200"}`}>
                      {chain.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteChain(chain.id)} className="rounded-xl p-2 text-ink-400 hover:bg-coral-50 hover:text-coral-500 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Visual chain flow */}
                <div className="flex items-center gap-2 flex-wrap">
                  {chain.conditions.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      {idx > 0 && <span className="text-[10px] font-bold text-navy-500 bg-navy-500/8 px-1.5 py-0.5 rounded">{chain.operator}</span>}
                      <span className="px-2.5 py-1 rounded-lg bg-navy-500/5 border border-navy-200/30 text-[10px] font-medium text-navy-700">
                        {c.type === "subscriber_count" ? `${c.advancedOperator || ">"} ${c.advancedValue || c.value} subs` :
                         c.type === "time_of_day" ? `at ${c.advancedValue || c.value}` :
                         c.type === "day_of_week" ? `on ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][parseInt(c.advancedValue || "0")]}` :
                         `${c.type} "${c.value}"`}
                      </span>
                    </React.Fragment>
                  ))}
                  <ArrowRight className="h-4 w-4 text-ink-300 mx-1 shrink-0" />
                  {chain.actions.map((a) => (
                    <span key={a.id} className="px-2.5 py-1 rounded-lg bg-mint-50 border border-mint-200/40 text-[10px] font-medium text-mint-700">
                      {ACTION_TYPES.find((at) => at.value === a.type)?.label || a.type}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ═══ WEBHOOKS TAB ═══ */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWebhookForm(!showWebhookForm)} className="btn-primary inline-flex items-center gap-2 !rounded-xl text-xs">
              <Plus className="h-3.5 w-3.5" /> New Webhook
            </button>
          </div>

          <AnimatePresence>
            {showWebhookForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="card-premium glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-200/60 pb-3">
                    <h3 className="font-display text-sm font-bold text-ink-800">New Webhook Trigger</h3>
                    <button onClick={() => setShowWebhookForm(false)} className="rounded-xl p-1.5 text-ink-400 hover:bg-surface-100"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Name</label>
                      <input type="text" value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="e.g. Slack Alert" className="input-glass" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Webhook URL</label>
                      <input type="url" value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://hooks.slack.com/..." className="input-glass" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Secret (optional)</label>
                    <input type="text" value={whSecret} onChange={(e) => setWhSecret(e.target.value)} placeholder="Signing secret for verification" className="input-glass" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block mb-2">Trigger Events</label>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <label key={ev.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-all
                          ${whEvents.includes(ev.value) ? "bg-navy-500/8 border-navy-200/30 text-navy-700" : "bg-surface-50 border-surface-200/40 text-ink-400 hover:border-surface-300"}
                        `}>
                          <input type="checkbox" checked={whEvents.includes(ev.value)} onChange={(e) => {
                            if (e.target.checked) setWhEvents([...whEvents, ev.value]);
                            else setWhEvents(whEvents.filter((x) => x !== ev.value));
                          }} className="sr-only" />
                          {ev.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-surface-200/60">
                    <button onClick={() => setShowWebhookForm(false)} className="text-xs font-semibold text-ink-500 px-4 py-2.5">Cancel</button>
                    <button onClick={handleCreateWebhook} className="btn-primary !rounded-xl text-xs inline-flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Create Webhook
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {webhooks.length === 0 ? (
            <div className="card-premium glass-card p-12 text-center">
              <Webhook className="h-10 w-10 text-ink-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink-600">No webhooks configured</p>
              <p className="text-xs text-ink-400 mt-1">Connect to Slack, Discord, Zapier, or any external service.</p>
            </div>
          ) : (
            webhooks.map((wh) => (
              <motion.div key={wh.id} variants={item} className="card-premium glass-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${wh.isActive ? "bg-mint-50" : "bg-surface-100"}`}>
                      <Webhook className={`h-4 w-4 ${wh.isActive ? "text-mint-600" : "text-ink-400"}`} />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-ink-800">{wh.name}</h4>
                      <p className="text-[10px] text-ink-400 font-mono truncate max-w-[300px]">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.map((ev) => (
                          <span key={ev} className="px-1.5 py-0.5 rounded-md bg-surface-100 text-[9px] font-bold text-ink-500">{ev}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-400">
                    <span>Fired {wh.fireCount}x</span>
                    <button onClick={() => toggleWebhook(wh)} className={`rounded-xl p-2 transition-all ${wh.isActive ? "bg-mint-50 text-mint-600" : "bg-surface-100 text-ink-400"}`}>
                      {wh.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)} className="rounded-xl p-2 text-ink-400 hover:bg-coral-50 hover:text-coral-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ═══ FOLLOW-UPS TAB ═══ */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowFollowupForm(!showFollowupForm)} className="btn-primary inline-flex items-center gap-2 !rounded-xl text-xs">
              <Plus className="h-3.5 w-3.5" /> New Follow-up
            </button>
          </div>

          <AnimatePresence>
            {showFollowupForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="card-premium glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-200/60 pb-3">
                    <h3 className="font-display text-sm font-bold text-ink-800">New Follow-up Sequence</h3>
                    <button onClick={() => setShowFollowupForm(false)} className="rounded-xl p-1.5 text-ink-400 hover:bg-surface-100"><X className="h-4 w-4" /></button>
                  </div>

                  {fuSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50/80 border border-surface-200/40">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="h-6 w-6 rounded-full bg-navy-500/8 text-navy-600 text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                        {idx < fuSteps.length - 1 && <div className="w-px h-4 bg-surface-200" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-ink-400">Wait</label>
                          <input type="number" min={1} max={168} value={step.delayHours} onChange={(e) => {
                            const newSteps = [...fuSteps];
                            newSteps[idx] = { ...newSteps[idx], delayHours: parseInt(e.target.value) || 24 };
                            setFuSteps(newSteps);
                          }} className="input-glass !w-16 !py-1 !px-2 text-xs text-center" />
                          <label className="text-[10px] font-bold text-ink-400">hours</label>
                        </div>
                        <textarea rows={2} value={step.message} onChange={(e) => {
                          const newSteps = [...fuSteps];
                          newSteps[idx] = { ...newSteps[idx], message: e.target.value };
                          setFuSteps(newSteps);
                        }} placeholder="Follow-up message..." className="input-glass resize-none text-xs" />
                      </div>
                      <button onClick={() => setFuSteps(fuSteps.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-ink-400 hover:text-coral-500" disabled={fuSteps.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-4">
                    <button onClick={() => setFuSteps([...fuSteps, { delayHours: 24, message: "" }])} className="btn-glass inline-flex items-center gap-1 !rounded-lg text-[10px]">
                      <Plus className="h-3 w-3" /> Add Step
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-ink-400">Escalate after</label>
                      <input type="number" min={1} max={10} value={fuEscalateAfter} onChange={(e) => setFuEscalateAfter(parseInt(e.target.value) || 3)} className="input-glass !w-12 !py-1 !px-2 text-xs text-center" />
                      <label className="text-[10px] font-bold text-ink-400">steps</label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-surface-200/60">
                    <button onClick={() => setShowFollowupForm(false)} className="text-xs font-semibold text-ink-500 px-4 py-2.5">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {followups.length === 0 ? (
            <div className="card-premium glass-card p-12 text-center">
              <Repeat className="h-10 w-10 text-ink-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink-600">No follow-up sequences</p>
              <p className="text-xs text-ink-400 mt-1">Automatically follow up with commenters who don&apos;t reply.</p>
            </div>
          ) : (
            followups.map((fu) => (
              <motion.div key={fu.id} variants={item} className="card-premium glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${fu.status === "active" ? "bg-mint-50" : "bg-surface-100"}`}>
                      <Repeat className={`h-4 w-4 ${fu.status === "active" ? "text-mint-600" : "text-ink-400"}`} />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-ink-800">Follow-up #{fu.id.split("-")[1]}</h4>
                      <p className="text-[10px] text-ink-400">{fu.sequence.length} steps · Escalate after {fu.escalateAfterSteps} · {fu.status}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    fu.status === "active" ? "bg-mint-50 text-mint-600 border border-mint-200/40" :
                    fu.status === "completed" ? "bg-surface-100 text-ink-500" :
                    "bg-volt-50 text-volt-700 border border-volt-200/40"
                  }`}>{fu.status}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {fu.sequence.map((s, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ArrowRight className="h-3 w-3 text-ink-300 shrink-0" />}
                      <div className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-surface-200/40 text-[10px]">
                        <span className="font-bold text-navy-600">+{s.delayHours}h</span>
                        <span className="text-ink-400 ml-1 truncate max-w-[100px] inline-block">{s.message.slice(0, 30)}...</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
