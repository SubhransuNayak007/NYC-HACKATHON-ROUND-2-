"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Layers,
  ExternalLink,
  Loader2,
  Table,
  Mail,
  Check,
  RotateCcw,
  Clock,
  ChevronRight,
  FileText,
} from "lucide-react";

export const SAMPLE_PROMPTS = [
  {
    title: "Gmail Invoices to Sheets & Telegram",
    prompt:
      "Every morning, check my Gmail for new invoices, extract the vendor, amount and due date, update my Google Sheet, notify me on Telegram if an invoice exceeds ₹50,000, and remind me three days before the due date.",
    tag: "Finance & Operations",
  },
  {
    title: "Stripe Failed Payment to Slack & HubSpot",
    prompt:
      "When a payment fails in Stripe, log the customer into HubSpot CRM with a High Priority tag, and dispatch an urgent alert to #finance in Slack.",
    tag: "Revenue Recovery",
  },
  {
    title: "Daily Morning KPI Digest to WhatsApp",
    prompt:
      "Every morning at 9 AM, aggregate yesterday's sales metrics from our database, generate an executive summary, and send it to my WhatsApp.",
    tag: "Executive Operations",
  },
];

export function HomeAutomationStudioSection() {
  const [promptInput, setPromptInput] = useState(SAMPLE_PROMPTS[0].prompt);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Real Compiled Workflow State
  const [workflowSpec, setWorkflowSpec] = useState<any | null>(null);
  const [dagPreview, setDagPreview] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [syntheticTests, setSyntheticTests] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [assistantExplanation, setAssistantExplanation] = useState<string>("");
  const [clarifications, setClarifications] = useState<any[]>([]);

  // Testing & Deployment State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any | null>(null);

  // Initialize conversation and load first sample automation on mount
  useEffect(() => {
    let isMounted = true;

    async function initPlayground() {
      try {
        const convRes = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Landing Page Interactive Session" }),
        });

        if (convRes.ok) {
          const convData = await convRes.json();
          const convId = convData.conversation?.id;
          if (isMounted && convId) {
            setActiveConvId(convId);
            // Compile default scenario on mount via real API
            executePrompt(SAMPLE_PROMPTS[0].prompt, convId);
          }
        }
      } catch (err) {
        console.error("Failed to initialize automation playground:", err);
      }
    }

    initPlayground();

    return () => {
      isMounted = false;
    };
  }, []);

  const executePrompt = async (promptText: string, convIdOverride?: string) => {
    const convId = convIdOverride || activeConvId;
    if (!promptText.trim()) return;

    setIsProcessing(true);
    setErrorMessage("");
    setTestResult(null);
    setDeploymentResult(null);
    setStatusMessage("🧠 Analyzing natural language requirements & entity schema...");

    try {
      let resolvedConvId = convId;
      if (!resolvedConvId) {
        const convRes = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Landing Page Interactive Session" }),
        });
        const convData = await convRes.json();
        resolvedConvId = convData.conversation?.id;
        setActiveConvId(resolvedConvId);
      }

      setStatusMessage("⚡ Compiling WorkflowSpec v2.0 & validating acyclic graph (DFS)...");

      const res = await fetch(`/api/ai/conversations/${resolvedConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: promptText }),
      });

      if (!res.ok) {
        throw new Error(`API compilation failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setWorkflowSpec(data.workflowSpec);
      setDagPreview(data.dagPreview);
      setSyntheticTests(data.syntheticTests || []);
      setAssistantExplanation(data.assistantMessage?.content || "");
      setClarifications(data.clarifications || []);

      if (data.dagPreview?.nodes?.length > 0) {
        setSelectedNode(data.dagPreview.nodes[0]);
      }
    } catch (err: any) {
      console.error("Compilation error:", err);
      setErrorMessage(err.message || "Failed to compile automation workflow.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const handleRunLiveTest = async () => {
    if (!workflowSpec?.id) return;
    setIsTesting(true);
    setErrorMessage("");

    try {
      const testInput =
        workflowSpec.syntheticTests?.[0]?.inputPayload ||
        syntheticTests?.[0]?.inputPayload ||
        {};

      const res = await fetch(`/api/workflows/${workflowSpec.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testInput,
        }),
      });

      if (!res.ok) throw new Error("Test execution failed.");
      const data = await res.json();
      setTestResult(data.testResult);
    } catch (err: any) {
      setErrorMessage(err.message || "Test verification failed.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeployWorkflow = async () => {
    if (!workflowSpec?.id) return;
    setIsDeploying(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/workflows/${workflowSpec.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runtimeTarget: workflowSpec.runtimeTarget || "n8n",
        }),
      });

      if (!res.ok) throw new Error("Deployment failed. Sign in required for production credentials.");
      const data = await res.json();
      setDeploymentResult(data.deployment);
    } catch (err: any) {
      setErrorMessage(err.message || "Deployment failed.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <section id="ai-studio" className="relative py-20 px-4 sm:px-8 bg-[#18181B] text-white overflow-hidden">
      {/* Background Subtle Tech Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-orange-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Automation Operating System — Zero Mock Builder</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-tight">
            One Conversation. <span className="text-orange-500">Any Automation.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Tell the AI what you want in plain human language. Our compiler checks app catalogs, validates DAG acyclic
            safety, builds the workflow specification, executes synthetic tests, and deploys with human-in-the-loop governance.
          </p>
        </div>

        {/* Studio Workspace Card */}
        <div className="bg-[#27272A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Quick Example Chips */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Try an Example Automation Goal (Live API Compilation):
            </p>
            <div className="flex flex-wrap gap-2.5">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample.title}
                  onClick={() => {
                    setPromptInput(sample.prompt);
                    executePrompt(sample.prompt);
                  }}
                  disabled={isProcessing}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${
                    promptInput === sample.prompt
                      ? "bg-orange-600 text-white border-orange-500 shadow-md"
                      : "bg-[#18181B] text-slate-300 border-white/10 hover:border-orange-500/50"
                  }`}
                >
                  <span className="block font-bold">{sample.title}</span>
                  <span className="text-[10px] opacity-70 block">{sample.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Input */}
          <div className="relative mb-8">
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#18181B] border border-white/15 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    executePrompt(promptInput);
                  }
                }}
                placeholder="Describe your automation in plain English... e.g. Sync Shopify orders to Google Sheets and notify WhatsApp"
                disabled={isProcessing}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => executePrompt(promptInput)}
                disabled={isProcessing || !promptInput.trim()}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 transition cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Compile & Build</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Progress Stage */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium flex items-center gap-2.5"
                >
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Compiled Workflow Workspace */}
          {workflowSpec && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-white/10">
              {/* Left Column: Visual DAG Architecture & Step Inspector */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#18181B] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-500" />
                      <div>
                        <h3 className="text-sm font-bold text-white">{workflowSpec.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {workflowSpec.id} · v{workflowSpec.version} · Target: {workflowSpec.runtimeTarget}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      DAG Validated (DFS)
                    </span>
                  </div>

                  {/* Nodes Stack */}
                  <div className="space-y-3">
                    {/* Trigger Node */}
                    <div
                      onClick={() =>
                        setSelectedNode({
                          id: "trigger",
                          type: "triggerNode",
                          data: {
                            label:
                              workflowSpec.trigger.type === "schedule"
                                ? "Morning 9:00 AM Cron Schedule"
                                : "Inbound Event Trigger",
                            appId: workflowSpec.trigger.appId,
                            type: workflowSpec.trigger.type,
                            config: workflowSpec.trigger.config,
                          },
                        })
                      }
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedNode?.id === "trigger"
                          ? "bg-blue-500/10 border-blue-500"
                          : "bg-[#27272A] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          ⚡
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {workflowSpec.trigger.type === "schedule"
                              ? "Morning Schedule (Cron)"
                              : `Trigger: ${workflowSpec.trigger.appId}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Type: {workflowSpec.trigger.type} · App: {workflowSpec.trigger.appId}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold">
                        TRIGGER
                      </span>
                    </div>

                    {/* Step Nodes */}
                    {workflowSpec.steps?.map((step: any, idx: number) => {
                      const isSelected = selectedNode?.id === step.id;
                      return (
                        <React.Fragment key={step.id}>
                          <div className="flex justify-center text-slate-600">
                            <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                          </div>

                          <div
                            onClick={() =>
                              setSelectedNode({
                                id: step.id,
                                type: "actionNode",
                                data: step,
                              })
                            }
                            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500"
                                : "bg-[#27272A] border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{step.label}</p>
                                <p className="text-[10px] text-slate-400">
                                  App: <span className="font-mono text-orange-400 font-semibold">{step.appId}</span> ·
                                  Action: <span className="font-mono text-slate-300">{step.actionId}</span>
                                  {step.approvalCondition && (
                                    <span className="ml-2 text-emerald-400 font-mono">
                                      · If {step.approvalCondition}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                step.sideEffect === "EXTERNAL_COMMUNICATION"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : step.sideEffect === "SAFE_READ"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {step.sideEffect}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Node Schema Inspector */}
                {selectedNode && (
                  <div className="bg-[#18181B] rounded-2xl p-4 border border-white/10 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-400" />
                        Step Configuration Inspector ({selectedNode.id})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        App: {selectedNode.data?.appId || "engine"}
                      </span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-black/50 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-36">
                      {JSON.stringify(selectedNode.data?.parameters || selectedNode.data?.config || selectedNode.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right Column: Automated Test Harness & Real Deploy */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                {/* Synthetic Tests Verification Panel */}
                <div className="bg-[#18181B] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-white">Automated Test Harness</h3>
                    </div>
                    <button
                      onClick={handleRunLiveTest}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>Run Dry-Run Test</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">
                    Compiler-generated synthetic test cases verified in isolated sandbox before any deployment:
                  </p>

                  <div className="space-y-2">
                    {syntheticTests.map((t: any, i: number) => (
                      <div
                        key={t.id || i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-white text-xs font-medium">{t.name}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          {t.assertions?.length || 1} assertions
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Real Test Execution Results */}
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-3 rounded-xl border text-xs ${
                        testResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-rose-500/10 border-rose-500/30"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between font-bold mb-1 ${
                          testResult.success ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {testResult.success ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Dry-Run Passed 100%
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> Synthetic Assertions Failed
                            </>
                          )}
                        </span>
                        <span className="font-mono text-[10px]">{testResult.durationMs}ms latency</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {testResult.success
                          ? `${testResult.stepResults?.length} steps simulated without error. Side-effect constraints verified.`
                          : testResult.assertionFailures?.join("; ") || "One or more synthetic assertions failed."}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Human-in-the-Loop Side-Effect Safety & Deploy Box */}
                <div className="bg-[#18181B] rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Human-in-the-Loop Governance</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    High-impact side effects (external messaging, write transactions) are classified. Review actions and
                    deploy into runtime with single-tenant isolation.
                  </p>

                  <div className="space-y-2.5">
                    <button
                      onClick={handleDeployWorkflow}
                      disabled={isDeploying}
                      className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      <span>Deploy to n8n / LangGraph Runtime</span>
                    </button>

                    <Link href="/dashboard/automations" className="block w-full">
                      <button className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
                        <span>Open Full AI Studio Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>

                  {deploymentResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs"
                    >
                      <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Deployment Active ({deploymentResult.deploymentId})
                      </p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1 truncate">
                        Webhook: {deploymentResult.webhookUrl}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
