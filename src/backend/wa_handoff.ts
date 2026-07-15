/**
 * WhatsApp Human Handoff Engine
 * Manages AI → Human mode transitions with full audit trail.
 */

import { v4 as uuidv4 } from "uuid";
import type { DBData, WAConversation, WAMessage, WAAnalyticsEvent } from "@/database/db";

export interface HandoffResult {
  success: boolean;
  conversation: WAConversation | null;
  systemMessage: WAMessage | null;
  analyticsEvent: WAAnalyticsEvent | null;
  error?: string;
}

export async function escalateToHuman(
  conversationId: string,
  reason: string,
  db: DBData,
  agentEmail?: string
): Promise<HandoffResult> {
  const conversations = db.waConversations || [];
  const convIdx = conversations.findIndex((c) => c.id === conversationId);
  if (convIdx === -1) {
    return { success: false, conversation: null, systemMessage: null, analyticsEvent: null, error: "Conversation not found" };
  }

  const conv = { ...conversations[convIdx] };
  conv.mode = "human";
  conv.status = "escalated";
  conv.escalationReason = reason;
  conv.assignedAgent = agentEmail;
  conv.updatedAt = new Date().toISOString();

  const systemMsg: WAMessage = {
    id: uuidv4(),
    conversationId,
    direction: "outbound",
    sender: "system",
    text: agentEmail
      ? `You've been connected with ${agentEmail.split("@")[0]}. A team member will assist you shortly.`
      : "You've been connected with a team member who will assist you shortly.",
    status: "sent",
    timestamp: new Date().toISOString(),
    systemEvent: "human_joined",
    metadata: {},
  };

  const event: WAAnalyticsEvent = {
    id: uuidv4(),
    type: "escalation",
    conversationId,
    agentEmail,
    metadata: { reason },
    timestamp: new Date().toISOString(),
  };

  return { success: true, conversation: conv, systemMessage: systemMsg, analyticsEvent: event };
}

export async function returnToAI(
  conversationId: string,
  db: DBData
): Promise<HandoffResult> {
  const conversations = db.waConversations || [];
  const convIdx = conversations.findIndex((c) => c.id === conversationId);
  if (convIdx === -1) {
    return { success: false, conversation: null, systemMessage: null, analyticsEvent: null, error: "Conversation not found" };
  }

  const conv = { ...conversations[convIdx] };
  conv.mode = "ai";
  conv.status = "active";
  conv.assignedAgent = undefined;
  conv.updatedAt = new Date().toISOString();

  const systemMsg: WAMessage = {
    id: uuidv4(),
    conversationId,
    direction: "outbound",
    sender: "system",
    text: "AI assistant has resumed. How can I help you?",
    status: "sent",
    timestamp: new Date().toISOString(),
    systemEvent: "ai_took_over",
    metadata: {},
  };

  const event: WAAnalyticsEvent = {
    id: uuidv4(),
    type: "ai_reply",
    conversationId,
    metadata: { action: "returned_to_ai" },
    timestamp: new Date().toISOString(),
  };

  return { success: true, conversation: conv, systemMessage: systemMsg, analyticsEvent: event };
}
