/**
 * ============================================================
 *  QuickReply Autonomous OS — Master 24/7 Execution Plane
 *  src/backend/execution/ExecutionPlane.ts
 *
 *  The 24/7 Autonomous Backbone:
 *  - Runs headless when every browser tab is closed
 *  - Orchestrates Event Bus, Brain, Consistency, Firewall, and Notifiers
 * ============================================================
 */

import { DurableEventBus, type BusinessEvent } from "../events/EventBus";
import { BusinessBrain } from "../brain/BusinessBrain";
import { ConsistencyEngine } from "../consistency/ConsistencyEngine";
import { ActionFirewall } from "../firewall/ActionFirewall";
import { ZeroDashboardEngine } from "./ZeroDashboardEngine";
import { VerifiableAuditLedger } from "../audit/VerifiableAuditLedger";
import { ReliabilityEngine } from "../reliability/ReliabilityEngine";
import { getWhatsAppWebSessionProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { processWhatsAppMessage } from "../wa_engine";
import { getDB, saveDB } from "@/database/db";

export class ExecutionPlane {
  private static isInitialized = false;

  /**
   * Boots the 24/7 Execution Plane on server start
   */
  static start(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("============================================================");
    console.log("⚡ [ExecutionPlane] 24/7 Autonomous Business OS Initializing...");
    console.log("============================================================");

    const bus = DurableEventBus.getInstance();
    const reliability = ReliabilityEngine.getInstance();

    // ─── 1. Inbound Channel Event Consumer ───────────────────────────
    bus.subscribe("*.inbound", "ai_reasoning_workers", async (event: BusinessEvent) => {
      try {
        const { from, text, platform, conversationId } = event.payload;

        // Check if message is a 2-way approval command from the business owner
        const isOwnerReply = await ZeroDashboardEngine.handleOwnerInboundReply(from, text);
        if (isOwnerReply) {
          console.log(`[ExecutionPlane] Processed 2-way owner command from ${from}`);
          return;
        }

        // Fetch Grounded Business Facts
        const brainContext = await BusinessBrain.getContext({
          organizationId: event.organizationId,
          customerPhone: from,
          productQuery: text,
        });

        // Query verified pricing/inventory if inquiry detected
        const priceInfo = await ConsistencyEngine.getVerifiedPrice(text);

        // Process message through AI engine
        const db = await getDB();
        const aiResult = await processWhatsAppMessage({
          waMessageId: event.eventId,
          conversationId: conversationId || `conv_${from}`,
          customerPhone: from,
          customerName: brainContext.customerProfile?.name || `Customer (${from})`,
          text,
          timestamp: event.timestamp,
          db,
          organizationId: event.organizationId,
        });

        // AI Action Firewall Validation
        const firewallDecision = await ActionFirewall.evaluate({
          actionId: `act_${event.eventId}`,
          toolName: "whatsapp_send_message",
          organizationId: event.organizationId,
          platform: "whatsapp",
          targetId: from,
          args: { to: from, text: aiResult.responseText },
          proposedByAgent: "QuickReply_AI",
          timestamp: new Date().toISOString(),
        });

        if (firewallDecision.allowed && aiResult.responseText) {
          // Send response via provider
          const wa = getWhatsAppWebSessionProvider();
          await wa.sendMessage(from, aiResult.responseText);

          // Record in Verifiable Audit Ledger
          VerifiableAuditLedger.record("message_dispatched", "ai_agent", {
            to: from,
            intent: aiResult.intent,
            confidence: aiResult.confidence,
          });
        } else if (firewallDecision.requiresOwnerApproval) {
          // Gate action and notify owner
          await ZeroDashboardEngine.sendOwnerAlert({
            title: "Action Gated by Security Firewall",
            description: `AI proposed ${firewallDecision.reason}`,
            approvalToken: firewallDecision.approvalToken,
            details: firewallDecision,
          });
        }

        // Save state to DB
        if (aiResult.newMessages && aiResult.newMessages.length > 0) {
          if (!db.waMessages) db.waMessages = [];
          db.waMessages.push(...aiResult.newMessages);
          await saveDB(db);
        }
      } catch (err) {
        reliability.moveToDLQ(event, err instanceof Error ? err.message : "Inbound processing failed");
      }
    });

    // ─── 2. Periodic Autonomous Business Watcher (Every 5 minutes) ──
    setInterval(async () => {
      try {
        // Scan for low stock and alert owner proactively
        const alerts = await ConsistencyEngine.scanLowStock();
        for (const alert of alerts) {
          await ZeroDashboardEngine.sendOwnerAlert({
            title: `⚠️ Stock Alert: ${alert.productName}`,
            description: `Current available: ${alert.currentStock} units. Recommended restock: ${alert.recommendedReorder} units.`,
            suggestedCommand: `APPROVE RESTOCK ${alert.productId}`,
            details: alert,
          });
        }
      } catch (err) {
        console.error("[ExecutionPlane] Periodic watcher error:", err);
      }
    }, 5 * 60 * 1000);

    console.log("✅ [ExecutionPlane] 24/7 Autonomous Business OS is Running Live.");
  }
}
