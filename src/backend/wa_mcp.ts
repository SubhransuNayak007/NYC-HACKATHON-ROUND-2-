/**
 * ============================================================
 *  QuickReply — Real MCP (Model Context Protocol) Tool Layer
 *  src/backend/wa_mcp.ts
 *
 *  Executable server-side tool execution engine for WhatsApp AI.
 *  Zero-Mock Enforcement:
 *  - Every tool queries and modifies REAL database records.
 *  - Never fabricates inventory, orders, prices, or customer data.
 *  - Returns structured execution traces and timings for auditability.
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import type {
  DBData,
  WACustomer,
  WAConversation,
  WAMessage,
  WAProduct,
  WAOrder,
  WAAnalyticsEvent,
  MCPTool,
} from "@/database/db";

export interface MCPToolExecutionLog {
  id: string;
  toolName: string;
  conversationId?: string;
  customerPhone?: string;
  arguments: Record<string, unknown>;
  result: unknown;
  executionMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface MCPContext {
  db: DBData;
  organizationId: string;
  conversationId?: string;
  customerPhone?: string;
}

export class WAMCPToolEngine {
  private static logs: MCPToolExecutionLog[] = [];

  /**
   * Execute an MCP tool by name with arguments against the live DB context
   */
  static async executeTool(
    toolName: string,
    args: Record<string, any>,
    ctx: MCPContext
  ): Promise<{ success: boolean; data: any; executionMs: number; error?: string }> {
    const startTime = Date.now();
    let success = true;
    let data: any = null;
    let error: string | undefined;

    try {
      switch (toolName) {
        // --- 1. Customer Context ---
        case "whatsapp_get_customer": {
          const phone = args.phone || ctx.customerPhone;
          if (!phone) {
            data = { found: false, message: "No phone number provided" };
            break;
          }
          const customer = (ctx.db.waCustomers || []).find(
            (c) => c.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
          );
          if (customer) {
            data = {
              found: true,
              id: customer.id,
              phone: customer.phone,
              name: customer.name,
              tags: customer.tags,
              totalOrders: customer.totalOrders,
              totalSpent: customer.totalSpent,
              leadScore: customer.leadScore,
              leadStage: customer.leadStage,
              memory: customer.memory,
              isVip: customer.isVip,
            };
          } else {
            data = { found: false, message: `No customer record found for ${phone}` };
          }
          break;
        }

        // --- 2. Conversation Context ---
        case "whatsapp_get_conversation": {
          const convId = args.conversationId || ctx.conversationId;
          const conv = (ctx.db.waConversations || []).find((c) => c.id === convId);
          if (conv) {
            const recentMsgs = (ctx.db.waMessages || [])
              .filter((m) => m.conversationId === conv.id)
              .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
              .slice(-10);
            data = {
              found: true,
              conversation: conv,
              messageCount: recentMsgs.length,
              messages: recentMsgs.map((m) => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                timestamp: m.timestamp,
              })),
            };
          } else {
            data = { found: false, message: "Conversation not found" };
          }
          break;
        }

        // --- 3. Product Catalog Search ---
        case "business_search_products": {
          const query = (args.query || "").toLowerCase();
          const category = (args.category || "").toLowerCase();
          const activeProducts = (ctx.db.waProducts || []).filter((p) => p.isActive);

          const matches = activeProducts.filter((p) => {
            const nameMatch = query ? p.name.toLowerCase().includes(query) : true;
            const descMatch = query ? p.description.toLowerCase().includes(query) : false;
            const catMatch = category ? p.category.toLowerCase().includes(category) : true;
            return (nameMatch || descMatch) && catMatch;
          });

          data = {
            totalFound: matches.length,
            products: matches.slice(0, 5).map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: p.price,
              salePrice: p.salePrice,
              currency: p.currency,
              stock: p.stock,
              category: p.category,
              inStock: p.stock > 0,
            })),
          };
          break;
        }

        // --- 4. Product Lookup ---
        case "business_get_product": {
          const productId = args.productId;
          const productName = (args.name || "").toLowerCase();
          const product = (ctx.db.waProducts || []).find(
            (p) => p.id === productId || (productName && p.name.toLowerCase().includes(productName))
          );
          if (product) {
            data = {
              found: true,
              product: {
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                currency: product.currency,
                category: product.category,
              },
            };
          } else {
            data = { found: false, message: "Product not found in verified database." };
          }
          break;
        }

        // --- 5. Inventory Stock Check ---
        case "business_check_inventory": {
          const productId = args.productId;
          const productName = (args.name || "").toLowerCase();
          const product = (ctx.db.waProducts || []).find(
            (p) => p.id === productId || (productName && p.name.toLowerCase().includes(productName))
          );
          if (product) {
            data = {
              found: true,
              productId: product.id,
              name: product.name,
              stock: product.stock,
              inStock: product.stock > 0,
              status: product.stock > 5 ? "in_stock" : product.stock > 0 ? "low_stock" : "out_of_stock",
            };
          } else {
            data = { found: false, message: "Product not found in verified database." };
          }
          break;
        }

        // --- 6. Order Lookup ---
        case "business_get_order": {
          const orderId = args.orderId;
          const phone = args.customerPhone || ctx.customerPhone;
          let order: WAOrder | undefined;

          if (orderId) {
            order = (ctx.db.waOrders || []).find((o) => o.id === orderId);
          } else if (phone) {
            const cust = (ctx.db.waCustomers || []).find(
              (c) => c.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
            );
            if (cust) {
              order = (ctx.db.waOrders || [])
                .filter((o) => o.customerId === cust.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            }
          }

          if (order) {
            data = {
              found: true,
              order: {
                id: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                items: order.items,
                total: order.total,
                currency: order.currency,
                trackingNumber: order.trackingNumber,
                createdAt: order.createdAt,
              },
            };
          } else {
            data = { found: false, message: "No matching order found in verified database." };
          }
          break;
        }

        // --- 7. Knowledge Search ---
        case "knowledge_search": {
          const query = (args.query || "").toLowerCase();
          const faqs = ctx.db.faqs || [];
          const quickReplies = ctx.db.waQuickReplies || [];

          const matchingFaqs = faqs.filter((f) => {
            const q = f.question.toLowerCase();
            const a = f.answer.toLowerCase();
            return q.includes(query) || a.includes(query) || query.split(/\s+/).some((w: string) => w.length > 3 && q.includes(w));
          });

          const matchingQRs = quickReplies.filter((qr) => {
            const t = qr.title.toLowerCase();
            const m = qr.message.toLowerCase();
            return t.includes(query) || m.includes(query);
          });

          data = {
            found: matchingFaqs.length > 0 || matchingQRs.length > 0,
            faqs: matchingFaqs.slice(0, 3).map((f) => ({ question: f.question, answer: f.answer })),
            quickReplies: matchingQRs.slice(0, 2).map((qr) => ({ title: qr.title, message: qr.message })),
          };
          break;
        }

        // --- 8. CRM: Create/Update Lead ---
        case "crm_create_lead": {
          const phone = args.phone || ctx.customerPhone;
          const scoreDelta = args.scoreIncrement || 10;
          if (phone) {
            const custIdx = (ctx.db.waCustomers || []).findIndex(
              (c) => c.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
            );
            if (custIdx >= 0 && ctx.db.waCustomers) {
              const currentScore = ctx.db.waCustomers[custIdx].leadScore || 0;
              const newScore = Math.min(100, currentScore + scoreDelta);
              ctx.db.waCustomers[custIdx].leadScore = newScore;
              ctx.db.waCustomers[custIdx].leadStage =
                newScore >= 80 ? "very_hot" : newScore >= 60 ? "hot" : newScore >= 30 ? "warm" : "cold";
              data = { updated: true, newLeadScore: newScore, stage: ctx.db.waCustomers[custIdx].leadStage };
            } else {
              data = { updated: false, message: "Customer not found to update lead score" };
            }
          }
          break;
        }

        // --- 9. Human Escalation ---
        case "human_escalate_conversation": {
          const convId = args.conversationId || ctx.conversationId;
          const reason = args.reason || "AI low confidence or user request";
          const convIdx = (ctx.db.waConversations || []).findIndex((c) => c.id === convId);
          if (convIdx >= 0 && ctx.db.waConversations) {
            ctx.db.waConversations[convIdx].mode = "human";
            ctx.db.waConversations[convIdx].status = "escalated";
            ctx.db.waConversations[convIdx].escalationReason = reason;
            ctx.db.waConversations[convIdx].updatedAt = new Date().toISOString();
            data = { escalated: true, conversationId: convId, reason };
          } else {
            data = { escalated: false, message: "Conversation not found" };
          }
          break;
        }

        default:
          success = false;
          error = `Unknown MCP tool: ${toolName}`;
          data = { error };
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : "Tool execution failed";
      data = { error };
    }

    const executionMs = Date.now() - startTime;

    // Update tool invocation counter in DB if present
    if (ctx.db.mcpTools) {
      const toolIdx = ctx.db.mcpTools.findIndex((t) => t.name === toolName || t.id === toolName);
      if (toolIdx >= 0) {
        ctx.db.mcpTools[toolIdx].invocationCount = (ctx.db.mcpTools[toolIdx].invocationCount || 0) + 1;
        ctx.db.mcpTools[toolIdx].lastInvokedAt = new Date().toISOString();
        if (error) ctx.db.mcpTools[toolIdx].lastError = error;
      }
    }

    // Record execution log
    const logEntry: MCPToolExecutionLog = {
      id: uuidv4(),
      toolName,
      conversationId: ctx.conversationId,
      customerPhone: ctx.customerPhone,
      arguments: args,
      result: data,
      executionMs,
      success,
      error,
      timestamp: new Date().toISOString(),
    };
    WAMCPToolEngine.logs.unshift(logEntry);
    if (WAMCPToolEngine.logs.length > 200) WAMCPToolEngine.logs.pop();

    return { success, data, executionMs, error };
  }

  /**
   * Get recent MCP tool execution logs
   */
  static getExecutionLogs(limit = 20): MCPToolExecutionLog[] {
    return WAMCPToolEngine.logs.slice(0, limit);
  }
}
