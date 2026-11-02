/**
 * ============================================================================
 * QuickReply — Lightweight Customer CRM & Conversation Memory Service
 * src/backend/crm/CustomerMemoryService.ts
 *
 * Tracks cross-platform customer profiles, persistent conversational memory,
 * dynamic lead scoring, and structured context assembly for AI generation.
 * ============================================================================
 */

import { getDB, saveDB } from "@/database/db";
import { NormalizedEvent } from "@/backend/events/EventNormalizer";
import { v4 as uuidv4 } from "uuid";

export interface CustomerPlatformIdentity {
  platform: string;
  externalId: string;
  username?: string;
  handle?: string;
}

export interface CustomerMemoryItem {
  key: string;
  value: string;
  confidence: number;
  extractedAt: string;
}

export interface CustomerProfile {
  id: string;
  tenantId: string;
  workspaceId: string;
  name?: string;
  email?: string;
  phone?: string;
  identities: CustomerPlatformIdentity[];
  leadScore: number;
  leadStage: "prospect" | "lead" | "hot" | "customer" | "churned";
  sentiment: "positive" | "neutral" | "negative";
  tags: string[];
  totalInteractions: number;
  lifetimeValue: number;
  memories: CustomerMemoryItem[];
  lastInteractedAt: string;
  createdAt: string;
  notes?: string[];
}

export class CustomerMemoryService {
  /**
   * Find or Create Customer Profile from an Inbound Event
   */
  static async resolveCustomer(event: NormalizedEvent): Promise<CustomerProfile> {
    const db = await getDB(event.tenantId);
    if (!db.crmCustomers) db.crmCustomers = [];

    const actorId = event.actor.id;
    const platform = event.platform;

    // Search by platform identity or phone/email
    let customer: CustomerProfile | undefined = db.crmCustomers.find((c: CustomerProfile) => {
      const matchIdentity = c.identities?.some(
        (i) => i.platform === platform && i.externalId === actorId
      );
      const matchPhone = event.actor.phone && c.phone === event.actor.phone;
      const matchEmail = event.actor.email && c.email === event.actor.email;
      return matchIdentity || matchPhone || matchEmail;
    });

    const now = new Date().toISOString();

    if (!customer) {
      customer = {
        id: `cust_${uuidv4()}`,
        tenantId: event.tenantId,
        workspaceId: event.workspaceId,
        name: event.actor.name || event.actor.username || "Anonymous Lead",
        phone: event.actor.phone,
        email: event.actor.email,
        identities: [
          {
            platform,
            externalId: actorId,
            username: event.actor.username,
          },
        ],
        leadScore: 50,
        leadStage: "prospect",
        sentiment: "neutral",
        tags: ["new_inbound", platform],
        totalInteractions: 1,
        lifetimeValue: 0,
        memories: [],
        lastInteractedAt: now,
        createdAt: now,
      };
      db.crmCustomers.push(customer);
    } else {
      customer.totalInteractions = (customer.totalInteractions || 0) + 1;
      customer.lastInteractedAt = now;
      if (event.actor.name && !customer.name) customer.name = event.actor.name;
    }

    await saveDB(db, event.tenantId);
    return customer;
  }

  /**
   * Recalibrate Customer Lead Score & Sentiment following an Interaction
   */
  static async recordInteraction(params: {
    tenantId: string;
    customerId: string;
    inboundText: string;
    replyText?: string;
    sentimentDetected?: "positive" | "neutral" | "negative";
    intentDetected?: string;
  }): Promise<void> {
    const db = await getDB(params.tenantId);
    if (!db.crmCustomers) return;

    const customer = db.crmCustomers.find((c: CustomerProfile) => c.id === params.customerId);
    if (!customer) return;

    if (params.sentimentDetected) {
      customer.sentiment = params.sentimentDetected;
      if (params.sentimentDetected === "positive") {
        customer.leadScore = Math.min(100, customer.leadScore + 5);
      } else if (params.sentimentDetected === "negative") {
        customer.leadScore = Math.max(0, customer.leadScore - 10);
      }
    }

    if (params.intentDetected === "pricing_inquiry" || params.intentDetected === "schedule_demo") {
      customer.leadScore = Math.min(100, customer.leadScore + 15);
      if (customer.leadScore >= 80) {
        customer.leadStage = "hot";
        if (!customer.tags.includes("hot_lead")) customer.tags.push("hot_lead");
      }
    }

    await saveDB(db, params.tenantId);
  }

  /**
   * Assemble Structured Context Pipeline for AI Prompting
   * Ensures User Content is strictly isolated from System Policy to prevent injection.
   */
  static assembleContext(customer: CustomerProfile, event: NormalizedEvent, brandVoice?: string): {
    systemContext: string;
    customerMemoryBlock: string;
    userContent: string;
  } {
    const memoryStrings = customer.memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");

    const systemContext = `
[ROLE & BRAND VOICE]
${brandVoice || "You are QuickReply AI Copilot, a professional, concise, and helpful brand representative."}

[CUSTOMER PROFILE & CRM CONTEXT]
- Name: ${customer.name || "Customer"}
- Lead Stage: ${customer.leadStage.toUpperCase()}
- Sentiment History: ${customer.sentiment}
- Total Previous Interactions: ${customer.totalInteractions}
${memoryStrings ? `[EXTRACTED MEMORY]\n${memoryStrings}` : ""}
    `.trim();

    const customerMemoryBlock = `Customer ID: ${customer.id} | Platform: ${event.platform}`;
    const userContent = event.content;

    return { systemContext, customerMemoryBlock, userContent };
  }
}
