"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Inbox, Shield, Brain, MessageSquare, Sparkles, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

interface PipelineStage {
  stage: "ingest" | "safety" | "intent" | "rule" | "rag" | "confidence" | "reply";
  status: "pass" | "hold" | "block" | "skip" | "done" | "error";
  latencyMs: number;
  detail?: string;
  confidence?: number;
  matchedId?: string;
}

interface PipelineTrace {
  id: string;
  commentId: string;
  author: string;
  textPreview: string;
  videoTitle: string;
  channelId: string;
  startedAt: string;
  finishedAt: string;
  totalMs: number;
  stages: PipelineStage[];
  outcome: "replied" | "review" | "skipped" | "failed" | "limit";
  replyText?: string;
  replySource?: "rule" | "rag" | "ai";
  confidence?: number;
  isDemo?: boolean;
}

const STAGE_CONFIG: Record<string, { icon: typeof Inbox; label: string; color: string; bgColor: string; borderColor: string }> = {
  ingest: { icon: Inbox, label: "Inbox", color: "text-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  safety: { icon: Shield, label: "Safety Filter", color: "text-emerald-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  intent: { icon: Brain, label: "Intent", color: "text-purple-500", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  rule: { icon: MessageSquare, label: "Rule Match", color: "text-amber-500", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  rag: { icon: Sparkles, label: "RAG Engine", color: "text-indigo-500", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
  confidence: { icon: Brain, label: "Confidence Gate", color: "text-teal-500", bgColor: "bg-teal-50", borderColor: "border-teal-200" },
  reply: { icon: CheckCircle, label: "Reply", color: "text-green-500", bgColor: "bg-green-50", borderColor: "border-green-200" },
};

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle; label: string; color: string; bgColor: string }> = {
  replied: { icon: CheckCircle, label: "Auto-Replied", color: "text-green-600", bgColor: "bg-green-50" },
  review: { icon: AlertTriangle, label: "Held for Review", color: "text-amber-600", bgColor: "bg-amber-50" },
  skipped: { icon: Clock, label: "Skipped", color: "text-gray-500", bgColor: "bg-[#f9fafb]" },
  failed: { icon: XCircle, label: "Failed", color: "text-red-500", bgColor: "bg-red-50" },
  limit: { icon: Clock, label: "Limit Reached", color: "text-orange-500", bgColor: "bg-orange-50" },
};

export default function PipelineVisualizer() {
  const [traces, setTraces] = useState<PipelineTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<PipelineTrace | null>(null);
  const [animatedStage, setAnimatedStage] = useState<number>(-1);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "polling">("connecting");
  const sseRef = useRef<EventSource | null>(null);

  // Fetch recent traces
  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/traces?limit=20");
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || data || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  // SSE connection for real-time traces
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    try {
      const eventSource = new EventSource("/api/comments/stream");
      sseRef.current = eventSource;
      eventSource.onopen = () => setSseStatus("live");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "trace" && data.trace) {
            setTraces(prev => [data.trace, ...prev].slice(0, 20));
            // Auto-select and animate the newest trace
            setSelectedTrace(data.trace);
            setAnimatedStage(0);
          }
        } catch {}
      };
      eventSource.onerror = () => {
        setSseStatus("polling");
        setTimeout(connectSSE, 5000);
      };
    } catch {
      setSseStatus("polling");
    }
  }, []);

  useEffect(() => {
    connectSSE();
    return () => { sseRef.current?.close(); };
  }, [connectSSE]);

  // Animate stages sequentially when a trace is selected
  useEffect(() => {
    if (!selectedTrace) return;
    setAnimatedStage(0);
    const stages = selectedTrace.stages;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      if (current >= stages.length) {
        clearInterval(timer);
        return;
      }
      setAnimatedStage(current);
    }, 400);
    return () => clearInterval(timer);
  }, [selectedTrace?.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8B931]/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[#E8B931]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1e293b] text-sm">Live Pipeline</h3>
            <p className="text-[10px] text-[#94a3b8]">Watch comments flow through the engine in real-time</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          sseStatus === "live" ? "bg-green-50 border-green-200 text-green-600" : "bg-[#f9fafb] border-[#e2e8f0] text-[#94a3b8]"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sseStatus === "live" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
          {sseStatus === "live" ? "Live" : "Connecting..."}
        </div>
      </div>

      {/* Active Pipeline View */}
      {selectedTrace && (
        <motion.div
          key={selectedTrace.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-5 space-y-4"
        >
          {/* Comment being processed */}
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
              {selectedTrace.author.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1e293b]">{selectedTrace.author}</span>
                {selectedTrace.isDemo && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold border border-purple-200/60">DEMO</span>
                )}
              </div>
              <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2">&ldquo;{selectedTrace.textPreview}&rdquo;</p>
              <p className="text-[9px] text-[#94a3b8] mt-1">on {selectedTrace.videoTitle}</p>
            </div>
          </div>

          {/* Stage pipeline — horizontal flow */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {selectedTrace.stages.map((stage, idx) => {
              const cfg = STAGE_CONFIG[stage.stage];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const isActive = idx <= animatedStage;
              const isCurrent = idx === animatedStage;
              const statusColor = stage.status === "pass" || stage.status === "done" ? "bg-green-500" :
                stage.status === "block" || stage.status === "error" ? "bg-red-500" :
                stage.status === "hold" ? "bg-amber-500" : "bg-gray-300";
              return (
                <React.Fragment key={stage.stage + idx}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isActive ? { opacity: 1, scale: isCurrent ? 1.1 : 1 } : { opacity: 0.3, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-xl border transition-all ${
                      isActive ? `${cfg.bgColor} ${cfg.borderColor} ${isCurrent ? "shadow-[0_0_12px_rgba(232,185,49,0.3)]" : ""}` : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      isActive ? cfg.bgColor : "bg-gray-100"
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${isActive ? cfg.color : "text-gray-400"}`} />
                    </div>
                    <span className={`text-[9px] font-semibold ${isActive ? "text-[#334155]" : "text-[#94a3b8]"}`}>{cfg.label}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? statusColor : "bg-gray-200"}`} />
                    {stage.latencyMs > 0 && (
                      <span className="text-[8px] text-[#94a3b8] font-mono">{stage.latencyMs}ms</span>
                    )}
                  </motion.div>
                  {idx < selectedTrace.stages.length - 1 && (
                    <>
                      <div className={`h-px w-3 ${isActive ? "bg-gray-300" : "bg-gray-100"}`} />
                      {idx < animatedStage && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="h-1.5 w-1.5 rounded-full bg-[#E8B931] shrink-0"
                          style={{ boxShadow: "0 0 6px rgba(232, 185, 49, 0.6)" }}
                        />
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Outcome badge + reply text */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
            {(() => {
              const oc = OUTCOME_CONFIG[selectedTrace.outcome];
              if (!oc) return null;
              const OI = oc.icon;
              return (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${oc.bgColor} ${oc.color}`}>
                  <OI className="h-3 w-3" />
                  {oc.label}
                </div>
              );
            })()}
            <div className="flex items-center gap-3 text-[10px] text-[#94a3b8]">
              {selectedTrace.replySource && <span>via <b className="text-[#475569]">{selectedTrace.replySource.toUpperCase()}</b></span>}
              {typeof selectedTrace.confidence === "number" && <span>conf <b className="text-[#475569]">{(selectedTrace.confidence * 100).toFixed(0)}%</b></span>}
              <span className="font-mono">{selectedTrace.totalMs}ms total</span>
            </div>
          </div>

          {selectedTrace.replyText && (
            <div className="bg-green-50/80 border border-green-200/60 rounded-xl p-3">
              <p className="text-[9px] font-bold text-green-600 mb-1">Reply:</p>
              <p className="text-[11px] text-[#334155] italic">&ldquo;{selectedTrace.replyText}&rdquo;</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Recent traces list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {traces.length === 0 ? (
          <div className="text-center py-8 text-[#94a3b8] text-xs">
            No traces yet. Start the engine to see comments flow through.
          </div>
        ) : (
          traces.map(trace => {
            const isSelected = selectedTrace?.id === trace.id;
            const oc = OUTCOME_CONFIG[trace.outcome];
            return (
              <motion.button
                key={trace.id}
                onClick={() => { setSelectedTrace(trace); setAnimatedStage(trace.stages.length - 1); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected ? "border-[#E8B931]/40 bg-[#E8B931]/5" : "border-gray-100 bg-white/60 hover:bg-white/80"
                }`}
                whileHover={{ y: -1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#1e293b]">{trace.author}</span>
                    <span className="text-[9px] text-[#94a3b8] line-clamp-1 max-w-[200px]">{trace.textPreview}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {oc && <span className={`text-[9px] font-semibold ${oc.color}`}>{oc.label}</span>}
                    <span className="text-[9px] text-[#94a3b8] font-mono">{trace.totalMs}ms</span>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
