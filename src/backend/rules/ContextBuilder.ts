/**
 * ============================================================================
 * QuickReply — Multi-Dimensional Context Builder
 * src/backend/rules/ContextBuilder.ts
 *
 * Compiles Customer CRM profile, content metadata, video tags, RAG knowledge,
 * and conversation history into a unified AssembledContext for the rule engine.
 * ============================================================================
 */

import { NormalizedEvent } from "@/backend/events/EventNormalizer";
import { CustomerMemoryService } from "@/backend/crm/CustomerMemoryService";
import { getDB } from "@/database/db";
import { AssembledContext } from "./types";

export class ContextBuilder {
  /**
   * Build complete AssembledContext from an inbound event
   */
  static async buildContext(event: NormalizedEvent): Promise<AssembledContext> {
    const db = await getDB(event.tenantId);

    // 1. Resolve Customer CRM Memory
    const customer = await CustomerMemoryService.resolveCustomer(event);

    // 2. Resolve Video/Post Content Metadata
    const targetId = event.target?.videoId || event.target?.postId || event.target?.channelId || "default_content";
    const targetTitle = event.rawPayload?.videoTitle || event.rawPayload?.title || "Community Post";

    // Check if video/content has persistent Tag/RAG automation modes configured
    const videoQueueEntry = (db.videoQueue || []).find((v: any) => v.videoId === targetId || v.id === targetId);
    const contentTagAutomated = videoQueueEntry?.isAutomated ?? true;
    const contentRAGAutomated = videoQueueEntry?.isRAGAutomated ?? false;

    const contentMetadata: AssembledContext["contentMetadata"] = {
      id: targetId,
      title: targetTitle,
      description: event.rawPayload?.videoDescription || "",
      tags: event.rawPayload?.tags || ["social", event.platform],
      platform: event.platform,
      publishedAt: event.timestamp,
      isAutomatedTagMode: contentTagAutomated,
      isAutomatedRAGMode: contentRAGAutomated,
    };

    // 3. Relevant Knowledge Base Entries (for RAG Mode)
    const faqs = (db.faqs || []).slice(0, 10).map((f: any) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      confidence: 1.0,
    }));

    return {
      event,
      customer,
      contentMetadata,
      relevantKnowledge: faqs,
      conversationHistory: [],
    };
  }
}
