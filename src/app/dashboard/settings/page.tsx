"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/frontend/store";
import {
  Settings,
  Users,
  Activity,
  Plus,
  Slack,
  Loader2,
  Shield,
  Bell,
  Mail,
  Brain,
  Key,
  Globe,
  Sparkles,
  Fingerprint,
} from "lucide-react";
import { motion } from "framer-motion";
import QuickLoginSetup from "@/frontend/components/QuickLoginSetup";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function SettingsPage() {
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [workspaceName, setWorkspaceName] = useState("");
  const [dailyQuota, setDailyQuota] = useState(500);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [spamProtection, setSpamProtection] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [emailDigest, setEmailDigest] = useState("daily");
  const [negativeKeywords, setNegativeKeywords] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiReplyEnabled, setAiReplyEnabled] = useState(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Editor");
  const [inviting, setInviting] = useState(false);
  const [newBlockedUser, setNewBlockedUser] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const { workspace, activityLogs } = data;
          setWorkspaceName(workspace.name);
          setDailyQuota(workspace.settings.dailyReplyQuota);
          setBlockedUsers(workspace.settings.blockedUsers);
          setSpamProtection(workspace.settings.spamProtection);
          setSlackWebhook(workspace.settings.slackWebhook);
          setEmailDigest(workspace.settings.emailDigest);
          setNegativeKeywords(workspace.settings.negativeKeywords || "");
          setDefaultLanguage(workspace.settings.defaultLanguage || "en");
          setAutoTranslate(workspace.settings.autoTranslate !== false);
          setAiReplyEnabled(workspace.settings.aiReplyEnabled !== false);
          setMembers(workspace.members);
          setLogs(activityLogs);
        }
      } catch (err) { console.error("Error loading settings:", err); }
      finally { setLoading(false); }
    }
    loadSettings();
  }, [refreshTrigger]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          settings: { dailyReplyQuota: dailyQuota, blockedUsers, spamProtection, slackWebhook, emailDigest, negativeKeywords, defaultLanguage, autoTranslate, aiReplyEnabled }
        })
      });
      if (res.ok) { showToast("Settings saved!", "success"); triggerRefresh(); }
      else showToast("Failed to save settings.", "error");
    } catch (err) { console.error("Error saving:", err); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (res.ok) { showToast(`Invitation sent to ${inviteEmail}`, "success"); setInviteEmail(""); triggerRefresh(); }
      else { const errData = await res.json(); showToast(errData.error || "Failed to invite.", "error"); }
    } catch (err) { console.error("Error inviting:", err); }
    finally { setInviting(false); }
  };

  const handleAddBlockedUser = () => {
    if (!newBlockedUser || blockedUsers.includes(newBlockedUser)) return;
    setBlockedUsers([...blockedUsers, newBlockedUser]);
    setNewBlockedUser("");
    showToast(`Blocked '${newBlockedUser}'. Click save to persist.`, "info");
  };

  const handleRemoveBlockedUser = (user: string) => {
    setBlockedUsers(blockedUsers.filter((u) => u !== user));
    showToast(`Removed '${user}' from blocklist.`, "info");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card-premium glass-card p-6 space-y-3">
            <div className="h-5 w-32 shimmer rounded-full" />
            <div className="h-20 shimmer rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left max-w-5xl"
    >
      {/* Page Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-navy-500/8 flex items-center justify-center">
            <Settings className="h-4 w-4 text-navy-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
              Workspace <span className="gradient-text">Settings</span>
            </h1>
            <p className="text-sm text-ink-500 mt-0.5">
              Manage moderation, integrations, and team roles.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Column: Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preferences */}
          <motion.form variants={item} onSubmit={handleSaveSettings} className="card-premium glass-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-2">
              <div className="h-8 w-8 rounded-xl bg-navy-500/8 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-navy-500" />
              </div>
              <h3 className="font-display text-sm font-bold text-ink-800">Preferences</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em]">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="input-glass"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em]">Daily Quota Cap</label>
                <input
                  type="number"
                  required
                  value={dailyQuota}
                  onChange={(e) => setDailyQuota(parseInt(e.target.value) || 100)}
                  className="input-glass"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">Slack Webhook</label>
              <div className="relative">
                <Slack className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="input-glass !pl-10"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-surface-200/60 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">Email Digest</label>
                <select
                  value={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.value)}
                  className="input-glass"
                >
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly summary</option>
                  <option value="none">Mute emails</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-200/60 p-2.5 hover:bg-surface-50/80 transition-all h-[38px]">
                  <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    spamProtection ? "bg-navy-500" : "bg-surface-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={spamProtection}
                      onChange={(e) => setSpamProtection(e.target.checked)}
                      className="sr-only"
                    />
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      spamProtection ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </div>
                  <span className="text-xs font-bold text-ink-700">Spam Auto-moderator</span>
                </label>
              </div>
            </div>

            {/* Blocklist */}
            <div className="border-t border-surface-200/60 pt-4 space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">Blocked Commenters</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlockedUser}
                  onChange={(e) => setNewBlockedUser(e.target.value)}
                  placeholder="Username to block"
                  className="input-glass flex-1"
                />
                <button type="button" onClick={handleAddBlockedUser} className="btn-primary !rounded-xl !text-xs !py-2 !px-4 shrink-0">
                  Block
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {blockedUsers.map((user) => (
                  <span key={user} className="inline-flex items-center gap-1 bg-coral-500/6 border border-coral-200/40 text-coral-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {user}
                    <button type="button" onClick={() => handleRemoveBlockedUser(user)} className="text-coral-400 hover:text-coral-600">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Negative Keywords */}
            <div className="border-t border-surface-200/60 pt-4 space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">
                Never auto-reply if comment contains:
              </label>
              <input
                type="text"
                value={negativeKeywords}
                onChange={(e) => setNegativeKeywords(e.target.value)}
                placeholder="scam, refund, disappointed, hate, fake"
                className="input-glass"
              />
              <p className="text-[10px] text-ink-400">
                Comments with these keywords skip all rules and go to Manual Review Queue.
              </p>
            </div>

            {/* AI & Language Settings */}
            <div className="border-t border-surface-200/60 pt-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-display text-sm font-bold text-ink-800">AI & Language Settings</h4>
              </div>

              {/* AI Reply Toggle */}
              <label className="flex items-center gap-3 text-sm text-ink-700 cursor-pointer group">
                <span className={`toggle-apple ${aiReplyEnabled ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={aiReplyEnabled}
                    onChange={(e) => setAiReplyEnabled(e.target.checked)}
                    className="sr-only"
                  />
                </span>
                <div>
                  <span className="font-medium group-hover:text-ink-800 transition-colors">AI-Powered Replies</span>
                  <p className="text-[10px] text-ink-400">Use Claude AI to generate contextual replies when rules don't match</p>
                </div>
              </label>

              {/* Auto-Translate Toggle */}
              <label className="flex items-center gap-3 text-sm text-ink-700 cursor-pointer group">
                <span className={`toggle-apple ${autoTranslate ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={(e) => setAutoTranslate(e.target.checked)}
                    className="sr-only"
                  />
                </span>
                <div>
                  <span className="font-medium group-hover:text-ink-800 transition-colors">Auto-Translate Replies</span>
                  <p className="text-[10px] text-ink-400">Automatically detect comment language and translate replies</p>
                </div>
              </label>

              {/* Default Language */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Default Channel Language</label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="input-glass"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="ko">Korean (한국어)</option>
                  <option value="pt">Portuguese (Português)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="ru">Russian (Русский)</option>
                </select>
                <p className="text-[10px] text-ink-400">Replies will be translated to this language if the comment is in another language</p>
              </div>
            </div>

            <div className="border-t border-surface-200/60 pt-4 text-right">
              <button type="submit" className="btn-primary !rounded-xl !text-xs !py-2 !px-6">
                Save Settings
              </button>
            </div>
          </motion.form>
        </div>

        {/* Right Column: Team & Quick Login */}
        <div className="space-y-6">
          {/* Quick Login Setup */}
          <motion.div variants={item} className="card-premium glass-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-2">
              <div className="h-8 w-8 rounded-xl" style={{ background: "#E8B93115" }}>
                <Fingerprint className="h-4 w-4" style={{ color: "#E8B931" }} />
              </div>
              <h3 className="font-display text-sm font-bold text-ink-800">Quick Login</h3>
            </div>
            <QuickLoginSetup />
          </motion.div>

          {/* Members */}
          <motion.div variants={item} className="card-premium glass-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-2">
              <div className="h-8 w-8 rounded-xl bg-volt-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-volt-700" />
              </div>
              <h3 className="font-display text-sm font-bold text-ink-800">Workspace Team</h3>
            </div>

            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full border-2 border-surface-200/80 object-cover" />
                    <div className="text-left truncate">
                      <span className="font-bold text-ink-800 block truncate">{member.name}</span>
                      <span className="text-[10px] text-ink-400 block truncate font-medium">{member.email}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                    member.role === "Owner" ? "bg-coral-50 text-coral-600 border border-coral-200/40" :
                    member.role === "Editor" ? "bg-navy-500/6 text-navy-600 border border-navy-200/30" :
                    "bg-surface-100 text-ink-500"
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="border-t border-surface-200/60 pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-ink-700">Invite Collaborator</h4>
                <p className="text-[10px] text-ink-400">Invite a new workspace member by email.</p>
              </div>
              <div className="space-y-2 text-left">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-glass"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-glass"
                >
                  <option value="Editor">Editor (Read/Write)</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 !rounded-xl !text-xs disabled:opacity-50"
                >
                  {inviting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Inviting...</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" /> Send Invitation</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Audit Logs */}
      <motion.div variants={item} className="card-premium glass-card p-5">
        <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-mint-500/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-mint-600" />
          </div>
          <h3 className="font-display text-sm font-bold text-ink-800">Activity Audit Trail</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-200/60 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                <th className="py-2.5 font-bold">Collaborator</th>
                <th className="py-2.5 font-bold">Action</th>
                <th className="py-2.5 font-bold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/60 text-ink-700">
              {logs.map((log) => (
                <tr key={log.id} className="table-row-premium hover:bg-surface-50/80 transition-colors">
                  <td className="py-3 font-bold text-ink-800">{log.user}</td>
                  <td className="py-3 font-medium text-ink-600">{log.action}</td>
                  <td className="py-3 text-right font-medium text-ink-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
