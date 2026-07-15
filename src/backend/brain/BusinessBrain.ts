/**
 * ============================================================
 *  QuickReply Autonomous OS — Business Brain (Structured Knowledge Graph)
 *  src/backend/brain/BusinessBrain.ts
 *
 *  Provides grounded, deterministic business context to the AI Engine:
 *  - Products, Variants, SKUs, Verified Pricing, Real Inventory
 *  - Customer History, Preferences, Memory, Order Trajectories
 *  - Store Policies, Business Hours, Escalation Thresholds
 * ============================================================
 */

import { getDB, saveDB, type DBData, type WACustomer, type WAProduct, type WAOrder } from "@/database/db";
import { getAudienceContextForPrompt } from "../agi/AudienceKnowledgeGraph";

export interface BusinessEntityFact {
  entityType: "product" | "inventory" | "customer" | "order" | "policy" | "store";
  id: string;
  verifiedAt: string;
  data: any;
  confidence: number;
}

export interface BusinessContextQuery {
  organizationId: string;
  customerPhone?: string;
  productQuery?: string;
  orderId?: string;
  intent?: string;
}

export interface StructuredBusinessContext {
  organizationName: string;
  customerProfile?: WACustomer;
  relevantProducts: WAProduct[];
  activeOrder?: WAOrder;
  verifiedPolicies: {
    returnPolicyDays: number;
    shippingThreshold: number;
    businessHours: string;
    supportEmail: string;
  };
  factsSummary: string;
}

export class BusinessBrain {
  /**
   * Retrieves structured, verified domain facts for an incoming interaction
   */
  static async getContext(query: BusinessContextQuery): Promise<StructuredBusinessContext> {
    const db = await getDB();

    // 1. Customer Context
    let customer: WACustomer | undefined;
    if (query.customerPhone) {
      const clean = query.customerPhone.replace(/\D/g, "");
      customer = (db.waCustomers || []).find((c) => c.phone.replace(/\D/g, "") === clean);
    }

    // 2. Product & Inventory Facts
    let relevantProducts: WAProduct[] = [];
    if (query.productQuery) {
      const q = query.productQuery.toLowerCase();
      relevantProducts = (db.waProducts || []).filter(
        (p) =>
          p.isActive &&
          (p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)))
      );
    } else {
      // Default top available products
      relevantProducts = (db.waProducts || []).filter((p) => p.isActive).slice(0, 5);
    }

    // 3. Active Order Context
    let activeOrder: WAOrder | undefined;
    if (query.orderId) {
      activeOrder = (db.waOrders || []).find((o) => o.id === query.orderId);
    } else if (customer) {
      activeOrder = (db.waOrders || []).find((o) => o.customerId === customer?.id);
    }

    // 4. Grounded Store Policies
    const verifiedPolicies = {
      returnPolicyDays: 30,
      shippingThreshold: 999,
      businessHours: "Monday to Saturday, 9:00 AM - 6:00 PM (IST)",
      supportEmail: "subhransu.nayak.418@gmail.com",
    };

    // 5. Build Compact Fact Summary for Prompt Grounding
    const businessName = db.workspace?.name || "QuickReply Commerce";
    const factsSummary = [
      `Business: ${businessName}`,
      customer ? `Customer: ${customer.name || customer.phone} (Stage: ${customer.leadStage}, Orders: ${customer.totalOrders})` : null,
      relevantProducts.length > 0
        ? `Products in stock: ${relevantProducts.map((p) => `${p.name} (₹${p.price}, Stock: ${p.stock})`).join("; ")}`
        : null,
      activeOrder ? `Order #${activeOrder.id}: Status=${activeOrder.status}, Total=₹${activeOrder.total}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      organizationName: businessName,
      customerProfile: customer,
      relevantProducts,
      activeOrder,
      verifiedPolicies,
      factsSummary,
    };
  }

  /**
   * Updates customer memory with structured fact extraction
   */
  static async updateCustomerMemory(
    phone: string,
    memoryUpdate: { interest?: string; purchase?: string; note?: string }
  ): Promise<void> {
    const db = await getDB();
    const clean = phone.replace(/\D/g, "");
    let customer = (db.waCustomers || []).find((c) => c.phone.replace(/\D/g, "") === clean);

    if (customer) {
      if (!customer.memory) customer.memory = {};
      if (memoryUpdate.interest && !customer.memory.interests?.includes(memoryUpdate.interest)) {
        customer.memory.interests = [...(customer.memory.interests || []), memoryUpdate.interest];
      }
      if (memoryUpdate.purchase && !customer.memory.previousPurchases?.includes(memoryUpdate.purchase)) {
        customer.memory.previousPurchases = [...(customer.memory.previousPurchases || []), memoryUpdate.purchase];
      }
      if (memoryUpdate.note) {
        customer.notes = customer.notes ? `${customer.notes} | ${memoryUpdate.note}` : memoryUpdate.note;
      }
      customer.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Retrieves a compact audience intelligence string for prompt injection.
   * Built from the AGI Continuous Learning Engine's knowledge graph.
   */
  static async getAudienceContext(): Promise<string> {
    try {
      return await getAudienceContextForPrompt();
    } catch {
      return '';
    }
  }

  /**
   * Called by the AGI engine after processing each comment batch.
   * Stores a learning note in the workspace memory.
   */
  static async learnFromComment(
    insight: { type: 'question' | 'complaint' | 'testimonial' | 'feature_request'; text: string }
  ): Promise<void> {
    try {
      const db = await getDB();
      if (!db.workspace) return;
      if (!db.activityLogs) db.activityLogs = [];
      db.activityLogs.unshift({
        id: `agi_${Date.now()}`,
        user: "QuickReply Brain",
        action: `[AGI] Learned ${insight.type}: ${insight.text.slice(0, 80)}`,
        timestamp: new Date().toISOString(),
      });
      db.activityLogs = db.activityLogs.slice(0, 500);
      await saveDB(db);
    } catch {
      // Non-critical — silently ignore
    }
  }
}
