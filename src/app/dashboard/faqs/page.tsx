"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  Tag,
  MessageCircleQuestion,
  Sparkles,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "general",
  "pricing",
  "shipping",
  "returns",
  "product",
  "support",
  "account",
  "features",
  "technical",
  "other",
];

function safeParseJSON(str: string): any[] | null {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    try {
      let cleaned = str.trim().replace(/,\s*([\]}])/g, "$1");
      if (!cleaned.startsWith("[") && cleaned.startsWith("{")) {
        cleaned = `[${cleaned}]`;
      }
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return null;
    }
  }
}

function parseNaturalTextToFAQs(rawText: string): FAQEntry[] {
  const text = rawText.trim();
  if (!text) return [];

  const asJson = safeParseJSON(text);
  if (asJson && asJson.length > 0) {
    return asJson.map((it: any, idx: number) => ({
      id: `faq_auto_${Date.now()}_${idx}`,
      question: it.question || it.q || "FAQ Question",
      answer: it.answer || it.a || "",
      keywords: Array.isArray(it.keywords)
        ? it.keywords
        : (it.keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean),
      category: it.category || "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  const faqs: FAQEntry[] = [];
  const qaRegex = /(?:^|\n)(?:Q|Question|Q\.|#|\d+\.)\s*([^\n?]+\??)\s*(?:\n|$)+(?:A|Answer|A\.|->|—|-)?\s*([^\n]+(?:\n[^\nQ0-9][^\n]+)*)/gi;
  let match;
  let idx = 0;
  while ((match = qaRegex.exec(text)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim();
    if (q && a) {
      const keywords = q
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["what", "when", "why", "how", "where", "does", "have", "karo", "kya", "kyun"].includes(w));
      faqs.push({
        id: `faq_natural_${Date.now()}_${idx++}`,
        question: q.endsWith("?") ? q : `${q}?`,
        answer: a,
        keywords: keywords.slice(0, 5),
        category: "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (faqs.length === 0) {
    const blocks = text.split(/\n{2,}/);
    blocks.forEach((block, i) => {
      const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const q = lines[0];
        const a = lines.slice(1).join(" ");
        const keywords = q
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3);
        faqs.push({
          id: `faq_natural_${Date.now()}_${i}`,
          question: q.endsWith("?") ? q : `${q}?`,
          answer: a,
          keywords: keywords.slice(0, 5),
          category: "general",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  if (faqs.length === 0) {
    const firstSentenceEnd = text.indexOf("?");
    const q = firstSentenceEnd > 0 ? text.substring(0, firstSentenceEnd + 1).trim() : "General FAQ Query";
    const a = firstSentenceEnd > 0 ? text.substring(firstSentenceEnd + 1).trim() : text;
    faqs.push({
      id: `faq_natural_${Date.now()}_0`,
      question: q,
      answer: a || q,
      keywords: ["general", "faq"],
      category: "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return faqs;
}

export default function FAQsPage() {
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);

  // Start empty on both server and client. Reading localStorage during a
  // useState initializer makes SSR render "0" but hydration render the saved
  // count, which triggers a React hydration mismatch — so local FAQs are
  // loaded after mount in an effect instead.
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  // Bulk import state
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<"text" | "json">("text");
  const [importJSON, setImportJSON] = useState("");

  // ML RAG Playground & Evaluation state
  const [showRagEval, setShowRagEval] = useState(false);
  const [testComment, setTestComment] = useState("What is your return policy and can I get a refund?");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const handleRunRagEval = async () => {
    if (!testComment.trim()) {
      showToast("Please enter a test comment", "error");
      return;
    }
    setEvalLoading(true);
    try {
      const res = await fetch("/api/ai/rag-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentText: testComment.trim(), faqs }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResult(data);
        showToast("RAG evaluation completed", "success");
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Server error (${res.status})`;
        console.error("RAG evaluation failed:", errMsg);
        showToast(`RAG eval failed: ${errMsg}`, "error");
      }
    } catch (err: any) {
      console.error("Error executing RAG eval:", err);
      showToast(`Error executing RAG eval: ${err.message || "Network error"}`, "error");
    } finally {
      setEvalLoading(false);
    }
  };

  const fetchFAQs = useCallback(async () => {
    try {
      const res = await fetch("/api/faqs");
      let serverFaqs: FAQEntry[] = [];
      if (res.ok) {
        const data = await res.json();
        serverFaqs = Array.isArray(data) ? data : [];
      }

      // Read local storage FAQs and merge with server FAQs
      const localRaw = typeof window !== "undefined" ? localStorage.getItem("quickreply_local_faqs") : null;
      const localFaqs: FAQEntry[] = localRaw ? JSON.parse(localRaw) : [];

      const mergedMap = new Map<string, FAQEntry>();
      mergedMap.set("team_ruthless_faq", {
        id: "team_ruthless_faq",
        question: "What is your team name? Who built this project?",
        answer: "Our team is Team Ruthless.",
        keywords: ["team", "ruthless", "name", "who", "built", "quickreply", "channel", "bro", "creators", "hackathon"],
        category: "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      serverFaqs.forEach((f) => mergedMap.set(f.id, f));
      localFaqs.forEach((f) => mergedMap.set(f.id, f));

      setFaqs(Array.from(mergedMap.values()));
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load locally-saved FAQs immediately after mount (fetchFAQs merges them too).
  useEffect(() => {
    try {
      const localRaw = localStorage.getItem("quickreply_local_faqs");
      if (localRaw) {
        const localFaqs = JSON.parse(localRaw);
        if (Array.isArray(localFaqs)) setFaqs(localFaqs);
      }
    } catch {
      // ignore malformed localStorage content
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const resetForm = () => {
    setFormQuestion("");
    setFormAnswer("");
    setFormKeywords("");
    setFormCategory("general");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      showToast("Question and answer are required", "error");
      return;
    }

    setSaving(true);
    try {
      const keywordsArr = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        keywords: keywordsArr,
        category: formCategory,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/faqs/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast(editingId ? "FAQ updated successfully" : "FAQ created successfully", "success");
        resetForm();
        fetchFAQs();
        triggerRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save FAQ", "error");
      }
    } catch (err) {
      showToast("Network error saving FAQ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ entry?")) return;

    try {
      const res = await fetch(`/api/faqs/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("FAQ deleted", "success");
        fetchFAQs();
      }
    } catch (err) {
      showToast("Failed to delete FAQ", "error");
    }
  };

  const handleEdit = (faq: FAQEntry) => {
    setEditingId(faq.id);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormKeywords(faq.keywords.join(", "));
    setFormCategory(faq.category);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkImport = async () => {
    try {
      if (!importJSON.trim()) {
        showToast("Please enter FAQ text or JSON first", "error");
        return;
      }
      const items = parseNaturalTextToFAQs(importJSON);
      if (items.length === 0) {
        showToast("Could not extract FAQs from text", "error");
        return;
      }

      const res = await fetch("/api/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqs: items }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`✨ Converted & imported ${result.imported || items.length} FAQs!`, "success");
        setShowImport(false);
        setImportJSON("");
        fetchFAQs();
      } else {
        showToast("Server import failed", "error");
      }
    } catch {
      showToast("Error processing FAQ text", "error");
    }
  };

  const handleSaveLocalStorage = () => {
    try {
      if (!importJSON.trim()) {
        showToast("Please enter FAQ text or JSON first", "error");
        return;
      }
      const formattedItems = parseNaturalTextToFAQs(importJSON);
      if (formattedItems.length === 0) {
        showToast("Could not extract Q&A from text. Please format as Q: ... A: ...", "error");
        return;
      }

      // Read existing local storage
      const localRaw = typeof window !== "undefined" ? localStorage.getItem("quickreply_local_faqs") : null;
      const prevFaqs: FAQEntry[] = localRaw ? JSON.parse(localRaw) : [];
      const updatedLocal = [...prevFaqs, ...formattedItems];

      if (typeof window !== "undefined") {
        localStorage.setItem("quickreply_local_faqs", JSON.stringify(updatedLocal));
      }

      setFaqs((curr) => [...curr, ...formattedItems]);
      showToast(`✨ Saved ${formattedItems.length} FAQs to Local Storage!`, "success");
      setShowImport(false);
      setImportJSON("");
    } catch {
      showToast("Error parsing FAQ text", "error");
    }
  };

  const handleExport = () => {
    const exportData = faqs.map(({ question, answer, keywords, category }) => ({
      question,
      answer,
      keywords,
      category,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faq-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("FAQ exported as JSON", "success");
  };

  // Filter FAQs
  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some((k) => k.includes(searchQuery.toLowerCase()));
    const matchesCategory =
      filterCategory === "all" || faq.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const uniqueCategories = [...new Set(faqs.map((f) => f.category))];

  return (
    <div className="space-y-6 text-left max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 border border-purple-200">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
                FAQ Knowledge Base
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Upload your FAQs — the RAG engine matches them to incoming comments for contextual auto-replies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 border border-surface-200 bg-white text-ink-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-50 transition"
          >
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("quickreply_local_faqs", JSON.stringify(faqs));
                showToast(`Saved ${faqs.length} FAQs to Local Storage!`, "success");
              }
            }}
            className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition shadow-sm"
            title="Save all current FAQs to browser Local Storage"
          >
            <Save className="h-3.5 w-3.5" /> Save Local
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 border border-surface-200 bg-white text-ink-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-50 transition"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 bg-navy-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-navy-600 transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add FAQ
          </button>
        </div>
      </div>

      {/* RAG Status Banner (Enterprise ML Stack) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-purple-900">
              Enterprise ML RAG Active — {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} indexed in Vector DB
            </p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Powered by <span className="font-semibold">LangChain</span>, <span className="font-semibold">Transformers (384-dim ONNX Embeddings)</span>, and <span className="font-semibold">Reciprocal Rank Fusion (RRF) Hybrid Search</span>.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowRagEval(!showRagEval)}
          className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 transition shadow-sm"
        >
          <Brain className="h-3.5 w-3.5" /> {showRagEval ? "Hide RAG Playground" : "Test RAG & Ragas Eval"}
        </button>
      </div>

      {/* RAG Evaluation & Testing Playground */}
      <AnimatePresence>
        {showRagEval && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium glass-card rounded-xl border border-purple-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-ink-800">
                    Enterprise RAG Testing & Ragas/TruLens Observability Triad
                  </h3>
                </div>
                <span className="text-[11px] bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                  LangSmith Tracing Ready
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Test YouTube Comment / Query
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testComment}
                    onChange={(e) => setTestComment(e.target.value)}
                    placeholder="e.g. What is your return policy?"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRunRagEval}
                    disabled={evalLoading}
                    className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {evalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Run Eval
                  </button>
                </div>
              </div>

              {evalResult && (
                <div className="mt-4 space-y-3 pt-3 border-t border-slate-100 text-xs">
                  {/* Triad Metrics Card */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-center">
                      <span className="block text-[10px] text-ink-500 uppercase font-semibold">Context Relevance</span>
                      <span className="text-sm font-bold text-purple-700">{evalResult.evaluationTriad?.contextRelevance || 0}%</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-ink-500 uppercase font-semibold">Faithfulness</span>
                      <span className="text-sm font-bold text-emerald-600">{evalResult.evaluationTriad?.faithfulness || 0}%</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-ink-500 uppercase font-semibold">Answer Relevance</span>
                      <span className="text-sm font-bold text-blue-600">{evalResult.evaluationTriad?.answerRelevance || 0}%</span>
                    </div>
                    <div className="text-center border-l border-slate-200">
                      <span className="block text-[10px] text-ink-500 uppercase font-semibold">RAG Grade</span>
                      <span className="text-sm font-extrabold text-slate-900">{evalResult.evaluationTriad?.overallGrade || "N/A"}</span>
                    </div>
                  </div>

                  {/* Architecture & Inference summary */}
                  <div className="flex flex-wrap items-center justify-between bg-purple-50/50 p-2.5 rounded-lg border border-purple-100 text-[11px] text-purple-900">
                    <span><strong>Embeddings:</strong> {evalResult.retrieval?.embeddingModel} ({evalResult.retrieval?.embeddingDimensions}-dim)</span>
                    <span><strong>LLM Router:</strong> {evalResult.inference?.provider} ({evalResult.inference?.model})</span>
                  </div>

                  {/* Generated Reply */}
                  {evalResult.inference?.generatedReply && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase mb-1">Generated Grounded Reply</p>
                      <p className="text-xs text-emerald-950">{evalResult.inference.generatedReply}</p>
                    </div>
                  )}

                  {/* Matched Chunks */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-700 uppercase">Top Retrieved Semantic Chunks (RRF Ranking)</p>
                    {evalResult.retrieval?.matchedChunks?.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-ink-800">{item.chunk?.metadata?.question || item.chunk?.text}</p>
                          <p className="text-ink-500 text-[11px] mt-0.5 line-clamp-2">{item.chunk?.text}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            RRF: {(item.rrfScore * 100).toFixed(0)}%
                          </span>
                          <p className="text-[10px] text-ink-400 mt-0.5">Dense: {(item.denseScore * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit FAQ Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium glass-card rounded-xl border border-surface-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-800">
                  {editingId ? "Edit FAQ Entry" : "New FAQ Entry"}
                </h3>
                <button
                  onClick={resetForm}
                  className="rounded-lg p-1 text-ink-400 hover:bg-surface-100 hover:text-ink-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink-600">
                    Question <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    placeholder="e.g., What is your return policy?"
                    className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink-600">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-ink-800 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-600">
                  Answer / Reply Template <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="The reply that will be sent when a comment matches this FAQ. Use {{commenter_name}} for personalization."
                  rows={4}
                  className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-600">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="e.g., return, refund, exchange, policy"
                  className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition"
                />
                <p className="text-[10px] text-ink-400">
                  Keywords boost matching confidence. Use {"{{commenter_name}}"}, {"{{channel_name}}"}, {"{{reply_date}}"} in the reply.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-1.5 rounded-lg border border-surface-200 text-xs font-semibold text-ink-600 hover:bg-surface-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-navy-500 text-white text-xs font-semibold hover:bg-navy-600 transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {editingId ? "Update FAQ" : "Save FAQ"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowImport(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl border border-surface-200 shadow-lg p-6 max-w-lg w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-800">Bulk Import FAQs</h3>
                <button onClick={() => setShowImport(false)} className="text-ink-400 hover:text-ink-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* TWO TAB MODE SWITCHER */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setImportMode("text")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    importMode === "text"
                      ? "bg-purple-100 text-purple-700 border border-purple-300 shadow-sm"
                      : "text-ink-500 hover:bg-surface-50"
                  }`}
                >
                  ✨ Natural English / Hinglish (Auto-Convert)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("json")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    importMode === "json"
                      ? "bg-blue-100 text-blue-700 border border-blue-300 shadow-sm"
                      : "text-ink-500 hover:bg-surface-50"
                  }`}
                >
                  {"{ } Direct JSON Format"}
                </button>
              </div>

              {importMode === "text" ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1">
                  <p className="text-[11px] text-purple-900 font-semibold">
                    Paste normal English or Hinglish Q&amp;A notes — AI converts to JSON automatically!
                  </p>
                  <pre className="text-[10px] text-purple-700 overflow-x-auto">
{`Q: Apna problem statement explain karo?
A: Creators waste 2-3 hours daily answering repetitive comments.

Q: What is your return policy?
A: We offer 30-day no-questions-asked refund guarantee.`}
                  </pre>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-[11px] text-ink-600 font-medium mb-1">Expected JSON format (syntax errors auto-repaired):</p>
                  <pre className="text-[10px] text-ink-500 overflow-x-auto">
{`[
  {
    "question": "What's your return policy?",
    "answer": "We offer 30-day returns...",
    "keywords": ["return", "refund"],
    "category": "returns"
  }
]`}
                  </pre>
                </div>
              )}

              <textarea
                value={importJSON}
                onChange={(e) => setImportJSON(e.target.value)}
                placeholder={
                  importMode === "text"
                    ? "Paste your normal text, Q: ... A: ..., or judging prep notes here..."
                    : "Paste your JSON array here..."
                }
                rows={8}
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-mono text-ink-800 placeholder:text-ink-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition resize-none"
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-1.5 rounded-lg border border-surface-200 text-xs font-semibold text-ink-600 hover:bg-surface-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLocalStorage}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" /> ✨ Convert &amp; Save Local
                </button>
                <button
                  onClick={handleBulkImport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-navy-500 text-white text-xs font-semibold hover:bg-navy-600 transition shadow-sm"
                >
                  <Upload className="h-3.5 w-3.5" /> ✨ Convert &amp; Sync Server
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="spotlight-search relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full rounded-lg border border-surface-200 bg-white pl-9 pr-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 outline-none transition"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-ink-800 focus:border-navy-500 outline-none transition"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <div className="text-[11px] text-ink-400 font-medium">
          {filteredFAQs.length} of {faqs.length} FAQs
        </div>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-xs font-medium text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading FAQ knowledge base...
        </div>
      ) : filteredFAQs.length === 0 ? (
        <div className="flex flex-col h-60 items-center justify-center text-center p-6 border-2 border-dashed border-surface-200 rounded-xl bg-white">
          <HelpCircle className="h-10 w-10 text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-ink-700">
            {faqs.length === 0 ? "No FAQs yet" : "No matching FAQs"}
          </h4>
          <p className="text-xs text-ink-500 mt-1 max-w-[300px]">
            {faqs.length === 0
              ? "Upload your first FAQ to start getting contextual auto-replies powered by RAG."
              : "Try adjusting your search or category filter."}
          </p>
          {faqs.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 bg-navy-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-navy-600 transition"
            >
              <Plus className="h-4 w-4" /> Add First FAQ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="card-premium glass-card rounded-xl border border-surface-200 p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <MessageCircleQuestion className="h-4 w-4 text-purple-500 shrink-0" />
                      <h4 className="text-xs font-bold text-ink-800">
                        {faq.question}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                        <Tag className="h-2.5 w-2.5" />
                        {faq.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-600 leading-relaxed line-clamp-2 mb-2 pl-6">
                      {faq.answer}
                    </p>

                    {faq.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-6">
                        {faq.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] font-semibold text-ink-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-50 hover:text-ink-600 transition"
                      title="Edit FAQ"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-500 transition"
                      title="Delete FAQ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 pl-6">
                  <span className="text-[9px] text-ink-400 font-medium">
                    Created {new Date(faq.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {faq.updatedAt !== faq.createdAt && (
                    <span className="text-[9px] text-ink-400 font-medium">
                      Updated {new Date(faq.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
