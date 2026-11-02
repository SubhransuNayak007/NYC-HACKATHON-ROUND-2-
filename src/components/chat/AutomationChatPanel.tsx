"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  PlusCircle,
  GitPullRequest,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { PatchDiffPreview, GraphPatchOperation } from "./PatchDiffPreview";
import { ParameterPromptModal, MissingRequirement } from "./ParameterPromptModal";
import { PlanApprovalCard } from "./PlanApprovalCard";
import { ConnectorOnboardingCard } from "./ConnectorOnboardingCard";
import type { WorkflowDefinitionV3 } from "../canvas/types";
import type { AutomationPlan, RequirementDocument, DiscoveryState } from "@/backend/automation/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  workflow?: WorkflowDefinitionV3;
  planCard?: AutomationPlan;
  onboardingCard?: any;
  discoveryStage?: DiscoveryState;
  graphPatch?: {
    workflowId: string;
    explanation: string;
    operations: GraphPatchOperation[];
  };
  missingRequirements?: MissingRequirement[];
  planningStage?: string;
  createdAt: string;
}

export interface AutomationChatPanelProps {
  currentWorkflow?: WorkflowDefinitionV3;
  onWorkflowConstructed: (workflow: WorkflowDefinitionV3) => void;
  onApplyPatch: (operations: GraphPatchOperation[]) => void;
  onRunTest?: () => void;
  onStateChange?: (state: {
    discoveryState?: DiscoveryState;
    plan?: AutomationPlan;
    requirementDoc?: RequirementDocument;
  }) => void;
}

const PRESET_PROMPTS = [
  {
    title: "Scenario 1: WhatsApp Automation",
    prompt:
      "Send me a WhatsApp notification whenever a new lead enters my Google Sheet.",
  },
  {
    title: "Scenario 2: Gmail Form Notification",
    prompt:
      "Email me every time someone fills my website registration form.",
  },
  {
    title: "Scenario 3: Telegram Order Alerts",
    prompt:
      "Send a Telegram message to my team whenever a new customer completes an order.",
  },
  {
    title: "Scenario 4: Ambiguous Goal",
    prompt:
      "Notify me when something happens.",
  },
];

export const AutomationChatPanel: React.FC<AutomationChatPanelProps> = ({
  currentWorkflow,
  onWorkflowConstructed,
  onApplyPatch,
  onRunTest,
  onStateChange,
}) => {
  const [conversationId] = useState<string>(() => `conv_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content:
        "Hello! I am your AI Automation Consultant. Tell me what you'd like to automate. I will investigate the required integrations, ask for any missing details, propose a complete implementation plan, and build the workflow only once you approve.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);

  // Active patch & clarification modal states
  const [activePatch, setActivePatch] = useState<{
    workflowId: string;
    explanation: string;
    operations: GraphPatchOperation[];
  } | null>(null);

  const [activeClarifications, setActiveClarifications] = useState<MissingRequirement[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStage]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsProcessing(true);

    try {
      setCurrentStage("1. Understanding business objective...");
      await new Promise((r) => setTimeout(r, 250));

      setCurrentStage("2. Investigating connectors & verifying prerequisites...");
      await new Promise((r) => setTimeout(r, 250));

      const res = await fetch("/api/automations/engineer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: userText,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (onStateChange) {
          onStateChange({
            discoveryState: data.state,
            plan: data.plan,
            requirementDoc: data.requirementDoc,
          });
        }

        const asstMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          role: "assistant",
          content: data.replyText,
          planCard: data.plan,
          onboardingCard: data.onboardingStep,
          discoveryStage: data.state,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, asstMsg]);

        // If user already approved and canvas workflow is returned:
        if (data.readyToBuild && data.canvasWorkflow) {
          onWorkflowConstructed(data.canvasWorkflow);
        }
      } else {
        // Fallback message
        setMessages((prev) => [
          ...prev,
          {
            id: `asst_err_${Date.now()}`,
            role: "assistant",
            content: data.error || "Could not process request.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_err_${Date.now()}`,
          role: "assistant",
          content: `Connection error: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setCurrentStage(null);
    }
  };

  const handleApprovePlan = async (planId: string) => {
    setIsProcessing(true);
    setCurrentStage("Freezing plan snapshot & constructing visual workflow...");

    try {
      const res = await fetch("/api/automations/engineer/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          planId,
        }),
      });

      const data = await res.json();
      if (data.success && data.canvasWorkflow) {
        onWorkflowConstructed(data.canvasWorkflow);

        setMessages((prev) => [
          ...prev,
          {
            id: `asst_appr_${Date.now()}`,
            role: "assistant",
            content: `Plan approved! Freezing blueprint snapshot (v${data.plan.version}). The workflow is now mounted on your visual canvas. Before going live with real external side effects, you can test and activate it.`,
            workflow: data.canvasWorkflow,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentStage(null);
    }
  };

  const handleModifyPlan = (planId: string) => {
    setInputPrompt("I would like to modify the plan: ");
  };

  const handleCancelPlan = async (planId: string) => {
    try {
      await fetch("/api/automations/engineer/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          planId,
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_cancel_${Date.now()}`,
          role: "assistant",
          content: "Plan cancelled. The workflow was not constructed.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  const handleConnectorSuccess = (connectorId: string, credentials: Record<string, any>) => {
    handleSendMessage(`Connected ${connectorId} successfully. Please proceed with the implementation plan.`);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-100 select-none overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
              AI Automation Consultant
            </h3>
            <p className="text-[10px] text-zinc-400">
              Understand · Investigate · Plan · Approve · Build
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Approval Guard Active
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-400 font-medium">
              {msg.role === "assistant" ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Automation Consultant</span>
                </>
              ) : (
                <>
                  <span>You</span>
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                </>
              )}
            </div>

            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                  : "bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              {msg.content}
            </div>

            {/* In-Chat Interactive Plan Approval Card */}
            {msg.planCard && (
              <div className="w-full max-w-[95%]">
                <PlanApprovalCard
                  plan={msg.planCard}
                  onApprove={handleApprovePlan}
                  onModify={handleModifyPlan}
                  onCancel={handleCancelPlan}
                  onAskQuestion={(q) => handleSendMessage(q)}
                  isProcessing={isProcessing}
                />
              </div>
            )}

            {/* In-Chat Dynamic Connector Onboarding Card */}
            {msg.onboardingCard && (
              <div className="w-full max-w-[90%]">
                <ConnectorOnboardingCard
                  step={msg.onboardingCard}
                  onConnect={handleConnectorSuccess}
                  isProcessing={isProcessing}
                />
              </div>
            )}
          </div>
        ))}

        {/* Live Planning Stages Indicator */}
        {isProcessing && currentStage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-indigo-400 text-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="font-mono text-[11px]">{currentStage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Starters */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Try a real scenario:
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESET_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                className="text-left p-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 transition-colors flex items-center justify-between group"
              >
                <span className="font-medium truncate">{item.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputPrompt);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="e.g. Send me a WhatsApp message whenever someone submits my website form..."
            disabled={isProcessing}
            className="flex-1 rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
          />

          <button
            type="submit"
            disabled={isProcessing || !inputPrompt.trim()}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/30 shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* Active AST Patch Review Modal */}
      {activePatch && (
        <PatchDiffPreview
          isOpen={Boolean(activePatch)}
          patch={activePatch}
          onApply={() => {
            onApplyPatch(activePatch.operations);
            setActivePatch(null);
          }}
          onReject={() => setActivePatch(null)}
        />
      )}
    </div>
  );
};
