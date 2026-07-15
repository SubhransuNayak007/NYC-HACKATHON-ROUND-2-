"use client";

import { useState, useEffect } from "react";
import {
  Users, UserPlus, MessageSquare, CheckCircle2, XCircle,
  Clock, FileText, Edit3, Trash2, Send, Eye, Shield,
  ChevronDown, ChevronRight, History, Star, AlertCircle,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  joinedAt: string;
  lastActive?: string;
}

interface CommentAssignment {
  commentId: string;
  assignedTo: string;
  assignedBy: string;
  status: "pending" | "in_progress" | "completed";
  note?: string;
  createdAt: string;
}

interface ApprovalWorkflow {
  id: string;
  commentId: string;
  draftReply: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "sent";
  createdBy: string;
  assignedApprover?: string;
  history: { action: string; by: string; at: string; note?: string }[];
  createdAt: string;
}

interface TemplateVersion {
  id: string;
  templateId: string;
  templateName: string;
  version: number;
  content: string;
  createdBy: string;
  createdAt: string;
  isLatest: boolean;
}

type Tab = "members" | "assignments" | "approvals" | "templates";
type RoleFilter = "all" | "admin" | "editor" | "viewer";

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("members");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Data
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<CommentAssignment[]>([]);
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [templates, setTemplates] = useState<TemplateVersion[]>([]);

  // Forms
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "viewer" as const });
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ templateName: "", content: "" });
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [mRes, aRes, apRes, tRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/assignments"),
        fetch("/api/team/approvals"),
        fetch("/api/templates/versions"),
      ]);
      if (mRes.ok) setMembers(await mRes.json());
      if (aRes.ok) setAssignments(await aRes.json());
      if (apRes.ok) setApprovals(await apRes.json());
      if (tRes.ok) setTemplates(await tRes.json());
    } catch (err) {
      console.error("Failed to load team data:", err);
    }
  }

  // Member CRUD
  async function addMember() {
    if (!newMember.name || !newMember.email) return;
    const res = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    if (res.ok) {
      setNewMember({ name: "", email: "", role: "viewer" });
      setShowAddMember(false);
      fetchAll();
    }
  }

  async function removeMember(id: string) {
    await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/team/members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchAll();
  }

  // Approval workflow
  async function updateApproval(id: string, status: string) {
    await fetch(`/api/team/approvals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: approvalNote }),
    });
    setApprovalNote("");
    fetchAll();
  }

  // Template CRUD
  async function addTemplate() {
    if (!newTemplate.templateName || !newTemplate.content) return;
    const res = await fetch("/api/templates/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    });
    if (res.ok) {
      setNewTemplate({ templateName: "", content: "" });
      setShowAddTemplate(false);
      fetchAll();
    }
  }

  const filteredMembers = roleFilter === "all"
    ? members
    : members.filter((m) => m.role === roleFilter);

  const roleColors: Record<string, string> = {
    admin: "bg-coral-50 text-coral-600 border-coral-200",
    editor: "bg-navy-50 text-navy-600 border-navy-200",
    viewer: "bg-surface-100 text-ink-500 border-surface-200",
  };

  const approvalStatusColors: Record<string, string> = {
    draft: "bg-surface-100 text-ink-500",
    pending_review: "bg-amber-50 text-amber-600",
    approved: "bg-mint-50 text-mint-600",
    rejected: "bg-coral-50 text-coral-600",
    sent: "bg-navy-50 text-navy-600",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-ink-900 tracking-tight">
          Team <span className="gradient-text">Collaboration</span>
        </h1>
        <p className="text-ink-400 font-medium mt-1">Manage team, assignments, approvals & templates</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Team Members", value: members.length, icon: Users, color: "text-navy-500" },
          { label: "Pending Assignments", value: assignments.filter((a) => a.status === "pending").length, icon: MessageSquare, color: "text-amber-500" },
          { label: "Awaiting Approval", value: approvals.filter((a) => a.status === "pending_review" || a.status === "draft").length, icon: CheckCircle2, color: "text-coral-500" },
          { label: "Templates", value: [...new Set(templates.map((t) => t.templateId))].length, icon: FileText, color: "text-mint-500" },
        ].map((stat, i) => (
          <div key={i} className="card-premium glass-card p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-surface-50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-800">{stat.value}</p>
                <p className="text-xs text-ink-400 font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-surface-100/80 border border-surface-200/60">
        {(["members", "assignments", "approvals", "templates"] as Tab[]).map((t) => {
          const icons = { members: Users, assignments: MessageSquare, approvals: CheckCircle2, templates: FileText };
          const labels = { members: "Members", assignments: "Assignments", approvals: "Approvals", templates: "Templates" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300
                ${tab === t
                  ? "bg-white text-navy-600 shadow-sm border border-surface-200/60"
                  : "text-ink-400 hover:text-ink-600"
                }
              `}
            >
              {(() => { const I = icons[t]; return <I className="h-4 w-4" />; })()}
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ===== MEMBERS TAB ===== */}
      {tab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["all", "admin", "editor", "viewer"] as RoleFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === r
                      ? "bg-navy-500 text-white"
                      : "bg-surface-100 text-ink-500 hover:bg-surface-200"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddMember(!showAddMember)} className="btn-primary text-sm">
              <UserPlus className="h-4 w-4 mr-1.5 inline" />
              Add Member
            </button>
          </div>

          {/* Add Member Form */}
          {showAddMember && (
            <div className="card-premium glass-card p-5">
              <h3 className="font-display font-bold text-ink-800 mb-4">Invite Team Member</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  className="input-glass"
                  placeholder="Full Name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
                <input
                  className="input-glass"
                  type="email"
                  placeholder="Email Address"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
                <select
                  className="input-glass"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                >
                  <option value="viewer">Viewer — Read only</option>
                  <option value="editor">Editor — Can edit replies</option>
                  <option value="admin">Admin — Full access</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addMember} className="btn-primary text-sm">Add Member</button>
                <button onClick={() => setShowAddMember(false)} className="btn-glass text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="card-premium glass-card p-12 text-center">
                <Users className="h-12 w-12 text-ink-300 mx-auto mb-3" />
                <p className="text-ink-400 font-medium">No team members yet</p>
                <p className="text-ink-300 text-sm mt-1">Add your first teammate to start collaborating</p>
              </div>
            ) : (
              filteredMembers.map((m) => (
                <div key={m.id} className="card-premium glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0038FF&color=fff`}
                      alt={m.name}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-ink-800 text-sm">{m.name}</p>
                      <p className="text-xs text-ink-400">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${roleColors[m.role]}`}>
                      {m.role === "admin" && <Shield className="h-3 w-3 inline mr-1" />}
                      {m.role}
                    </span>
                    <select
                      value={m.role}
                      onChange={(e) => updateRole(m.id, e.target.value)}
                      className="input-glass text-xs py-1 px-2 w-28"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="p-1.5 rounded-lg text-ink-300 hover:text-coral-500 hover:bg-coral-50 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== ASSIGNMENTS TAB ===== */}
      {tab === "assignments" && (
        <div className="space-y-4">
          <p className="text-ink-400 text-sm">Assign comments to team members for follow-up or review.</p>
          {assignments.length === 0 ? (
            <div className="card-premium glass-card p-12 text-center">
              <MessageSquare className="h-12 w-12 text-ink-300 mx-auto mb-3" />
              <p className="text-ink-400 font-medium">No assignments yet</p>
              <p className="text-ink-300 text-sm mt-1">Assign comments from the Live Feed to team members</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a, i) => (
                <div key={i} className="card-premium glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        a.status === "completed" ? "bg-mint-50 text-mint-500"
                          : a.status === "in_progress" ? "bg-navy-50 text-navy-500"
                          : "bg-amber-50 text-amber-500"
                      }`}>
                        {a.status === "completed" ? <CheckCircle2 className="h-4 w-4" />
                          : a.status === "in_progress" ? <Clock className="h-4 w-4" />
                          : <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">Comment #{a.commentId.slice(-6)}</p>
                        <p className="text-xs text-ink-400">
                          Assigned to <span className="font-semibold text-ink-600">{a.assignedTo}</span>
                          {" "}by {a.assignedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        a.status === "completed" ? "bg-mint-50 text-mint-600"
                          : a.status === "in_progress" ? "bg-navy-50 text-navy-600"
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {a.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-ink-300">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {a.note && (
                    <div className="mt-3 ml-11 p-2.5 rounded-lg bg-surface-50 text-xs text-ink-500 italic">
                      {a.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== APPROVALS TAB ===== */}
      {tab === "approvals" && (
        <div className="space-y-4">
          <p className="text-ink-400 text-sm">Review, approve, or reject draft replies before they&apos;re sent.</p>
          {approvals.length === 0 ? (
            <div className="card-premium glass-card p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-ink-300 mx-auto mb-3" />
              <p className="text-ink-400 font-medium">No approval workflows</p>
              <p className="text-ink-300 text-sm mt-1">Draft replies will appear here for review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((wf) => (
                <div key={wf.id} className="card-premium glass-card p-5">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedApproval(expandedApproval === wf.id ? null : wf.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedApproval === wf.id
                        ? <ChevronDown className="h-4 w-4 text-ink-400" />
                        : <ChevronRight className="h-4 w-4 text-ink-400" />}
                      <div>
                        <p className="text-sm font-semibold text-ink-800">Comment #{wf.commentId.slice(-6)}</p>
                        <p className="text-xs text-ink-400">
                          Created by {wf.createdBy} • {new Date(wf.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${approvalStatusColors[wf.status]}`}>
                        {wf.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expandedApproval === wf.id && (
                    <div className="mt-4 space-y-4">
                      {/* Draft Reply */}
                      <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/60">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">Draft Reply</p>
                        <p className="text-sm text-ink-700 whitespace-pre-wrap">{wf.draftReply}</p>
                      </div>

                      {/* History */}
                      {wf.history.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1">
                            <History className="h-3 w-3" /> History
                          </p>
                          <div className="space-y-2">
                            {wf.history.map((h, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-navy-400 mt-1.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-ink-600">{h.action.replace(/_/g, " ")}</span>
                                  {" "}by <span className="text-ink-500">{h.by}</span>
                                  <span className="text-ink-300 ml-1">{new Date(h.at).toLocaleString()}</span>
                                  {h.note && <p className="text-ink-400 italic mt-0.5">{h.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {(wf.status === "draft" || wf.status === "pending_review") && (
                        <div className="flex items-center gap-3">
                          <input
                            className="input-glass flex-1 text-sm"
                            placeholder="Add a note (optional)..."
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                          />
                          {wf.status === "draft" && (
                            <button
                              onClick={() => updateApproval(wf.id, "pending_review")}
                              className="btn-glass text-sm"
                            >
                              Submit for Review
                            </button>
                          )}
                          <button
                            onClick={() => updateApproval(wf.id, "approved")}
                            className="btn-primary text-sm !bg-mint-500 hover:!bg-mint-600"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1 inline" /> Approve
                          </button>
                          <button
                            onClick={() => updateApproval(wf.id, "rejected")}
                            className="btn-glass text-sm !text-coral-500 hover:!bg-coral-50"
                          >
                            <XCircle className="h-4 w-4 mr-1 inline" /> Reject
                          </button>
                        </div>
                      )}
                      {wf.status === "approved" && (
                        <button
                          onClick={() => updateApproval(wf.id, "sent")}
                          className="btn-primary text-sm"
                        >
                          <Send className="h-4 w-4 mr-1 inline" /> Send Reply
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TEMPLATES TAB ===== */}
      {tab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-ink-400 text-sm">Shared template library with version history.</p>
            <button onClick={() => setShowAddTemplate(!showAddTemplate)} className="btn-primary text-sm">
              <FileText className="h-4 w-4 mr-1.5 inline" />
              New Template
            </button>
          </div>

          {showAddTemplate && (
            <div className="card-premium glass-card p-5">
              <h3 className="font-display font-bold text-ink-800 mb-4">Create Template</h3>
              <div className="space-y-3">
                <input
                  className="input-glass"
                  placeholder="Template Name (e.g., Thank You Reply)"
                  value={newTemplate.templateName}
                  onChange={(e) => setNewTemplate({ ...newTemplate, templateName: e.target.value })}
                />
                <textarea
                  className="input-glass min-h-[100px]"
                  placeholder="Template content with {{variables}}..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={addTemplate} className="btn-primary text-sm">Save Template</button>
                  <button onClick={() => setShowAddTemplate(false)} className="btn-glass text-sm">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Grouped templates */}
          {(() => {
            const grouped: Record<string, TemplateVersion[]> = {};
            templates.forEach((t) => {
              if (!grouped[t.templateId]) grouped[t.templateId] = [];
              grouped[t.templateId].push(t);
            });
            const entries = Object.entries(grouped);

            if (entries.length === 0) {
              return (
                <div className="card-premium glass-card p-12 text-center">
                  <FileText className="h-12 w-12 text-ink-300 mx-auto mb-3" />
                  <p className="text-ink-400 font-medium">No templates yet</p>
                  <p className="text-ink-300 text-sm mt-1">Create reusable reply templates with version control</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {entries.map(([templateId, versions]) => {
                  const latest = versions.find((v) => v.isLatest) || versions[versions.length - 1];
                  const isExpanded = expandedTemplate === templateId;
                  return (
                    <div key={templateId} className="card-premium glass-card p-5">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedTemplate(isExpanded ? null : templateId)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-ink-400" />
                            : <ChevronRight className="h-4 w-4 text-ink-400" />}
                          <div>
                            <p className="text-sm font-semibold text-ink-800">{latest.templateName}</p>
                            <p className="text-xs text-ink-400">
                              v{latest.version} • by {latest.createdBy} • {versions.length} version{versions.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {latest.isLatest && (
                            <span className="px-2 py-0.5 rounded-md bg-mint-50 text-mint-600 text-[10px] font-bold uppercase">
                              Latest
                            </span>
                          )}
                          <Star className="h-4 w-4 text-amber-400" />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          {/* Current content */}
                          <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">
                              Current (v{latest.version})
                            </p>
                            <p className="text-sm text-ink-700 whitespace-pre-wrap">{latest.content}</p>
                          </div>

                          {/* Version history */}
                          {versions.length > 1 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1">
                                <History className="h-3 w-3" /> Version History
                              </p>
                              <div className="space-y-2">
                                {[...versions].reverse().map((v) => (
                                  <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-50">
                                    <span className="text-xs font-mono font-bold text-navy-500">v{v.version}</span>
                                    <p className="text-xs text-ink-500 flex-1 truncate">{v.content}</p>
                                    <span className="text-[10px] text-ink-300">{new Date(v.createdAt).toLocaleDateString()}</span>
                                    <span className="text-[10px] text-ink-400">by {v.createdBy}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
