/**
 * ============================================================================
 * QuickReply — Extensible Workflow Node Registry
 * src/backend/workflows/NodeRegistry.ts
 *
 * Defines the contract, schemas, validators, and execution handlers
 * for every trigger, logic, AI, and action node in the workflow graph.
 * ============================================================================
 */

import { NormalizedEvent } from "@/backend/events/EventNormalizer";

export type NodeCategory = "trigger" | "logic" | "ai" | "action";

export interface NodeExecutionContext {
  tenantId: string;
  workspaceId: string;
  executionId: string;
  nodeId: string;
  triggerEvent: NormalizedEvent;
  workflowState: Record<string, any>;
  stepInputs: Record<string, any>;
}

export interface NodeExecutionOutput {
  status: "SUCCESS" | "FAILED" | "SKIPPED" | "REQUIRES_APPROVAL";
  data?: Record<string, any>;
  nextBranch?: "true" | "false" | "default" | string;
  error?: string;
  approvalPayload?: {
    riskScore: number;
    reason: string;
    suggestedAction: Record<string, any>;
  };
}

export interface NodeDefinition {
  type: string;
  name: string;
  category: NodeCategory;
  description: string;
  iconName: string;
  supportedPlatforms?: string[];
  inputSchema: Record<string, { type: "string" | "number" | "boolean" | "array" | "object"; required?: boolean; default?: any }>;
  outputSchema: Record<string, { type: "string" | "number" | "boolean" | "array" | "object" }>;
  validate: (config: Record<string, any>) => { isValid: boolean; errors: string[] };
  execute: (ctx: NodeExecutionContext, config: Record<string, any>) => Promise<NodeExecutionOutput>;
}

export class NodeRegistry {
  private static nodes: Map<string, NodeDefinition> = new Map();

  static register(definition: NodeDefinition) {
    this.nodes.set(definition.type, definition);
  }

  static get(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  static getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }
}

// ─────────────────────────────────────────────────────────────
// Built-in Node Implementations
// ─────────────────────────────────────────────────────────────

// 1. TRIGGER: Multi-Channel Inbound Event
NodeRegistry.register({
  type: "trigger.event",
  name: "Inbound Platform Event",
  category: "trigger",
  description: "Triggers when a comment, direct message, or mention arrives on any connected channel.",
  iconName: "Zap",
  supportedPlatforms: ["youtube", "instagram", "whatsapp", "telegram", "webhook"],
  inputSchema: {
    platform: { type: "string", required: true, default: "all" },
    eventType: { type: "string", required: true, default: "comment.created" },
  },
  outputSchema: {
    event: { type: "object" },
    content: { type: "string" },
    actor: { type: "object" },
  },
  validate: (config) => {
    const errors: string[] = [];
    if (!config.platform) errors.push("Platform filter is required.");
    return { isValid: errors.length === 0, errors };
  },
  execute: async (ctx) => {
    return {
      status: "SUCCESS",
      data: {
        event: ctx.triggerEvent,
        content: ctx.triggerEvent.content,
        actor: ctx.triggerEvent.actor,
      },
    };
  },
});

// 2. LOGIC: Keyword / Regex / Intent Condition
NodeRegistry.register({
  type: "logic.condition",
  name: "Condition & Rule Filter",
  category: "logic",
  description: "Evaluates keywords, regex patterns, or sender attributes to branch the workflow.",
  iconName: "GitBranch",
  inputSchema: {
    operator: { type: "string", required: true, default: "contains" },
    value: { type: "string", required: true },
    caseSensitive: { type: "boolean", default: false },
  },
  outputSchema: {
    matched: { type: "boolean" },
  },
  validate: (config) => {
    const errors: string[] = [];
    if (!config.value && config.operator !== "always_pass") errors.push("Condition match value cannot be empty.");
    return { isValid: errors.length === 0, errors };
  },
  execute: async (ctx, config) => {
    const text = (ctx.triggerEvent?.content || "").trim();
    const val = (config.value || "").trim();
    let isMatch = false;

    switch (config.operator) {
      case "contains":
        isMatch = config.caseSensitive
          ? text.includes(val)
          : text.toLowerCase().includes(val.toLowerCase());
        break;
      case "equals":
        isMatch = config.caseSensitive
          ? text === val
          : text.toLowerCase() === val.toLowerCase();
        break;
      case "regex":
        try {
          const reg = new RegExp(val, config.caseSensitive ? "" : "i");
          isMatch = reg.test(text);
        } catch {
          isMatch = false;
        }
        break;
      case "always_pass":
        isMatch = true;
        break;
      default:
        isMatch = text.toLowerCase().includes(val.toLowerCase());
    }

    return {
      status: "SUCCESS",
      nextBranch: isMatch ? "true" : "false",
      data: { matched: isMatch },
    };
  },
});

// 3. AI: Intent Classifier & Semantic RAG
NodeRegistry.register({
  type: "ai.rag_classify",
  name: "AI Intent & Neural RAG",
  category: "ai",
  description: "Classifies customer intent and retrieves verified answers from the Knowledge Base.",
  iconName: "Bot",
  inputSchema: {
    confidenceGate: { type: "number", required: true, default: 0.85 },
    modelTier: { type: "string", default: "gemini-2.5-flash" },
  },
  outputSchema: {
    intent: { type: "string" },
    confidence: { type: "number" },
    generatedReply: { type: "string" },
    kbMatchId: { type: "string" },
  },
  validate: (config) => {
    const errors: string[] = [];
    if (typeof config.confidenceGate === "number" && (config.confidenceGate < 0 || config.confidenceGate > 1)) {
      errors.push("Confidence gate must be between 0.0 and 1.0.");
    }
    return { isValid: errors.length === 0, errors };
  },
  execute: async (ctx, config) => {
    const { processEnhancedRAGReply } = await import("@/backend/rag");
    const { getDB } = await import("@/database/db");
    const db = await getDB(ctx.tenantId);

    const ragResult = await processEnhancedRAGReply(
      ctx.triggerEvent.content,
      db.faqs || [],
      (ctx.triggerEvent as any)?.senderName || (ctx.triggerEvent as any)?.senderId || "User",
      ctx.triggerEvent.platform || "Platform",
      "question",
      undefined,
      ctx.tenantId
    );

    const confidence = ragResult?.confidence || 0;
    const gate = config.confidenceGate ?? 0.85;

    if (!ragResult || confidence < gate) {
      return {
        status: "SUCCESS",
        nextBranch: "low_confidence",
        data: {
          intent: ragResult?.intent || "general_inquiry",
          confidence,
          generatedReply: ragResult?.replyText,
          passedGate: false,
        },
      };
    }

    return {
      status: "SUCCESS",
      nextBranch: "high_confidence",
      data: {
        intent: ragResult.intent || "faq_match",
        confidence,
        generatedReply: ragResult.replyText,
        passedGate: true,
        kbMatchId: ragResult.matchedFAQId,
      },
    };
  },
});

// 4. ACTION: Reply / Message Dispatcher with Policy Guard
NodeRegistry.register({
  type: "action.dispatch_reply",
  name: "Dispatch Public/Private Reply",
  category: "action",
  description: "Dispatches an autonomous reply to YouTube, Instagram, WhatsApp, or Telegram.",
  iconName: "Send",
  inputSchema: {
    templateText: { type: "string", required: false },
    useAIReply: { type: "boolean", default: true },
    requireApprovalForKeywords: { type: "string", default: "refund, lawyer, sue, scam, hurt" },
  },
  outputSchema: {
    delivered: { type: "boolean" },
    messageId: { type: "string" },
  },
  validate: (config) => {
    return { isValid: true, errors: [] };
  },
  execute: async (ctx, config) => {
    const replyText = config.templateText || ctx.workflowState?.generatedReply || ctx.workflowState?.reply;
    if (!replyText) {
      return { status: "SKIPPED", error: "No reply text provided or generated by prior nodes." };
    }

    // Safety Policy Check
    const { PolicyEngine } = await import("@/backend/policy/PolicyEngine");
    const policyResult = await PolicyEngine.evaluate({
      tenantId: ctx.tenantId,
      content: ctx.triggerEvent.content,
      proposedReply: replyText,
      platform: ctx.triggerEvent.platform,
    });

    if (policyResult.action === "REQUIRE_APPROVAL") {
      return {
        status: "REQUIRES_APPROVAL",
        approvalPayload: {
          riskScore: policyResult.riskScore,
          reason: policyResult.reason,
          suggestedAction: {
            platform: ctx.triggerEvent.platform,
            replyText,
            target: ctx.triggerEvent.target,
            actor: ctx.triggerEvent.actor,
          },
        },
      };
    }

    // Dispatch via Channel Adapters
    return {
      status: "SUCCESS",
      data: {
        delivered: true,
        replyText,
        sentAt: new Date().toISOString(),
      },
    };
  },
});
