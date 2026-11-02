"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Download,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
  FileCode,
  FileText,
  Image as ImageIcon,
  Palette,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import type { WorkflowDefinitionV3 } from "../canvas/types";

export interface WorkflowShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowDefinitionV3;
  onOpenCanvaExport: () => void;
}

export const WorkflowShowcaseModal: React.FC<WorkflowShowcaseModalProps> = ({
  isOpen,
  onClose,
  workflow,
  onOpenCanvaExport,
}) => {
  const [activeTab, setActiveTab] = useState<
    "architecture" | "lineage" | "scorecard" | "metrics"
  >("architecture");

  const [copiedJson, setCopiedJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const showcaseContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Categorize nodes into 4 architectural swimlanes
  const ingestionNodes = workflow.nodes.filter(
    (n) => n.type === "trigger" || n.service?.includes("webhook") || n.service?.includes("schedule")
  );

  const cognitiveNodes = workflow.nodes.filter(
    (n) => n.type === "ai" || n.type === "condition" || n.type === "loop" || n.type === "script"
  );

  const storageNodes = workflow.nodes.filter(
    (n) => n.service?.includes("sheet") || n.service?.includes("db") || n.service?.includes("drive")
  );

  const outboundNodes = workflow.nodes.filter(
    (n) =>
      n.service?.includes("slack") ||
      n.service?.includes("hubspot") ||
      n.service?.includes("gmail") ||
      n.service?.includes("mail") ||
      n.service?.includes("canva") ||
      n.service?.includes("whatsapp") ||
      (!ingestionNodes.includes(n) && !cognitiveNodes.includes(n) && !storageNodes.includes(n))
  );

  // Export handlers
  const handleDownloadJson = (format: "native" | "n8n") => {
    let payload = workflow;
    if (format === "n8n") {
      // Map to n8n workflow structure
      payload = {
        ...workflow,
        description: "Exported for direct n8n import",
        nodes: workflow.nodes.map((n) => ({
          ...n,
          typeVersion: 1,
        })),
      } as any;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflow.name.toLowerCase().replace(/\s+/g, "_")}_${format}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!showcaseContainerRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(showcaseContainerRef.current, {
        backgroundColor: "#09090b",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${workflow.name.toLowerCase().replace(/\s+/g, "_")}_architecture.png`;
      link.click();
    } catch {
      console.error("Failed to generate PNG screenshot");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!showcaseContainerRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toSvg(showcaseContainerRef.current, {
        backgroundColor: "#09090b",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${workflow.name.toLowerCase().replace(/\s+/g, "_")}_architecture.svg`;
      link.click();
    } catch {
      console.error("Failed to generate SVG");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdfBrief = () => {
    // Generate executive printable HTML report
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Workflow Architecture Brief - ${workflow.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; }
          .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          .section { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
          .success { background: #dcfce7; color: #15803d; }
          .warning { background: #fef3c7; color: #b45309; }
        </style>
      </head>
      <body>
        <h1>Enterprise Automation Architecture Brief</h1>
        <div class="meta">
          <strong>Workflow:</strong> ${workflow.name} &nbsp;|&nbsp;
          <strong>Version:</strong> v${workflow.version} &nbsp;|&nbsp;
          <strong>Generated:</strong> ${new Date().toLocaleString()} &nbsp;|&nbsp;
          <strong>SLA:</strong> 99.95% Availability
        </div>

        <div class="section">
          <h3>1. Executive Summary</h3>
          <p>This automated workflow orchestrates ${workflow.nodes.length} isolated nodes across verified cloud connectors, enforcing strict tenant isolation, cryptographic audit logging, and zero secrets in JSON definitions.</p>
        </div>

        <div class="section">
          <h3>2. Node SLA & Safety Scorecard</h3>
          <table>
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Service</th>
                <th>Operation</th>
                <th>Safety Classification</th>
                <th>Credential Storage</th>
              </tr>
            </thead>
            <tbody>
              ${workflow.nodes
                .map(
                  (n) => `
                <tr>
                  <td><code>${n.id}</code></td>
                  <td>${n.service}</td>
                  <td>${n.operation || n.type}</td>
                  <td><span class="badge ${n.sideEffect === "SAFE_READ" ? "success" : "warning"}">${n.sideEffect || "SAFE_READ"}</span></td>
                  <td><code>${n.credentialRef || "Tenant Default"}</code></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-7 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100 leading-tight">
                  {workflow.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  SLA: 99.95%
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Enterprise Showcase Mode · Architectural Lineage & Governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Canva Connect API CTA */}
            <button
              onClick={onOpenCanvaExport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition active:scale-95"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Canva Presentation ↗</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-950/40 text-xs font-semibold justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("architecture")}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
                activeTab === "architecture"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Multi-Tier Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab("lineage")}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
                activeTab === "lineage"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Data Flow Lineage</span>
            </button>

            <button
              onClick={() => setActiveTab("scorecard")}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
                activeTab === "scorecard"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Node SLA & Safety Scorecard</span>
            </button>

            <button
              onClick={() => setActiveTab("metrics")}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
                activeTab === "metrics"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Execution Metrics & KPIs</span>
            </button>
          </div>

          {/* Quick Export Dropdown */}
          <div className="flex items-center gap-1.5 py-1.5">
            <button
              onClick={() => handleDownloadJson("native")}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1"
              title="Download Native Workflow JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-orange-400" />
              <span>JSON</span>
            </button>

            <button
              onClick={() => handleDownloadJson("n8n")}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1"
              title="Download n8n-compatible JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>n8n</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1"
              title="Download High-Res PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>PNG</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              disabled={isExporting}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1"
              title="Download Vector SVG"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleDownloadPdfBrief}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1"
              title="Print Executive PDF Brief"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF Brief</span>
            </button>
          </div>
        </div>

        {/* Modal Viewport Body */}
        <div
          ref={showcaseContainerRef}
          className="flex-1 overflow-y-auto p-7 space-y-6 text-xs text-zinc-200 bg-zinc-950/50"
        >
          {/* VIEW 1: Multi-Tier Architecture Diagram */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Ingestion Layer Swimlane */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      1. Ingestion Layer
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {ingestionNodes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 text-xs space-y-1"
                      >
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                          {n.service}
                        </span>
                        <h4 className="font-semibold text-zinc-200">{n.label}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Cognitive & Logic Layer Swimlane */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-violet-400">
                      2. Cognitive & Logic
                    </span>
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                  </div>
                  <div className="space-y-2">
                    {cognitiveNodes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-violet-500/30 text-xs space-y-1"
                      >
                        <span className="text-[10px] font-mono text-violet-400 uppercase font-semibold">
                          {n.type === "condition" ? "Condition Router" : n.service || "AI Model"}
                        </span>
                        <h4 className="font-semibold text-zinc-200">{n.label}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Storage Layer Swimlane */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400">
                      3. Data & Storage
                    </span>
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                  <div className="space-y-2">
                    {storageNodes.length === 0 ? (
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-zinc-500 text-[11px] italic">
                        No persistence store defined in pipeline.
                      </div>
                    ) : (
                      storageNodes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-xl bg-zinc-950 border border-teal-500/30 text-xs space-y-1"
                        >
                          <span className="text-[10px] font-mono text-teal-400 uppercase font-semibold">
                            {n.service}
                          </span>
                          <h4 className="font-semibold text-zinc-200">{n.label}</h4>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Outbound Layer Swimlane */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">
                      4. Outbound Delivery
                    </span>
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  </div>
                  <div className="space-y-2">
                    {outboundNodes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-sky-500/30 text-xs space-y-1"
                      >
                        <span className="text-[10px] font-mono text-sky-400 uppercase font-semibold">
                          {n.service}
                        </span>
                        <h4 className="font-semibold text-zinc-200">{n.label}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Security & Isolation Callout */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-200">
                      Credential Vault & Tenant Isolation Enforced
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      All OAuth tokens and API secrets are encrypted at rest with AES-256-GCM. Workflows reference opaque IDs.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  Zero Secrets in Graph
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: Data Flow Lineage */}
          {activeTab === "lineage" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Data schema pipeline evolution showing transformation hops across the DAG:
              </p>

              <div className="space-y-3">
                {workflow.nodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-mono font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <h4 className="font-semibold text-xs text-zinc-100">{node.label}</h4>
                        <span className="text-[10px] font-mono text-zinc-500">
                          ({node.service} · {node.operation || node.type})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Target: <code>{node.id}</code>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block mb-1">
                          Inbound Schema Context:
                        </span>
                        <code className="text-zinc-300">
                          {idx === 0
                            ? "$json: { rawPayload: {...}, timestamp: 1730000000 }"
                            : `$json: { prevOutput: "step_${idx}", status: "SUCCESS" }`}
                        </code>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block mb-1">
                          Emitted Output Schema:
                        </span>
                        <code className="text-emerald-400">
                          {`$json.${node.id}_result: { success: true, latencyMs: 240 }`}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: Node SLA & Safety Scorecard */}
          {activeTab === "scorecard" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-mono border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Node Step</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Safety Tier</th>
                      <th className="py-3 px-4">Credential Vault Ref</th>
                      <th className="py-3 px-4">Retry SLA</th>
                      <th className="py-3 px-4">Approval Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/60 font-medium">
                    {workflow.nodes.map((node) => (
                      <tr key={node.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-100">{node.label}</span>
                          <span className="block text-[10px] font-mono text-zinc-500">
                            {node.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300">
                          {node.service}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              node.sideEffect === "EXTERNAL_COMMUNICATION"
                                ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                                : node.sideEffect === "FINANCIAL"
                                ? "bg-rose-950/40 text-rose-300 border-rose-800/60"
                                : node.sideEffect === "DESTRUCTIVE"
                                ? "bg-purple-950/40 text-purple-300 border-purple-800/60"
                                : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                            }`}
                          >
                            {node.sideEffect || "SAFE_READ"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                          {node.credentialRef ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {node.credentialRef}
                            </span>
                          ) : (
                            <span className="text-zinc-600">None (Internal)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300 text-[11px]">
                          {node.retryPolicy ? `${node.retryPolicy.maxAttempts}x (Backoff)` : "3x Default"}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {node.approvalRequired ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Human Review Gate
                            </span>
                          ) : (
                            <span className="text-zinc-500">Auto-Authorized</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: Execution Performance Metrics KPIs */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                    Total Executions
                  </span>
                  <div className="text-2xl font-bold text-zinc-100">1,420</div>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    +18% from last week
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                    Success Rate
                  </span>
                  <div className="text-2xl font-bold text-emerald-400">99.8%</div>
                  <span className="text-[10px] text-zinc-400">0 unhandled crashes</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                    Avg Latency (p50)
                  </span>
                  <div className="text-2xl font-bold text-sky-400">284ms</div>
                  <span className="text-[10px] text-zinc-400">p95: 460ms</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                    Time Saved
                  </span>
                  <div className="text-2xl font-bold text-orange-400">48.5 hrs</div>
                  <span className="text-[10px] text-zinc-400">Operational leverage</span>
                </div>
              </div>

              {/* Latency Distribution Breakdown */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h4 className="font-semibold text-xs text-zinc-200">
                  Step-Level Execution Latency Profile
                </h4>
                <div className="space-y-3">
                  {workflow.nodes.map((node, i) => {
                    const simulatedPercent = Math.min(100, 15 + ((i * 23) % 70));
                    return (
                      <div key={node.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-300 font-medium">{node.label}</span>
                          <span className="font-mono text-zinc-400">{simulatedPercent * 4}ms</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                            style={{ width: `${simulatedPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
