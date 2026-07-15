/**
 * ============================================================
 * QuickReply — Business Copilot & Acceptance Test Engine
 * src/backend/intelligence/BusinessCopilot.ts
 *
 * FULLY FUNCTIONAL · ZERO-MOCK · REAL-TIME REASONING
 * Grounded in your actual connected channels, real comments, and database facts.
 * ============================================================
 */

import { getDB, type DBData } from "@/database/db";
import { BusinessMathEngine } from "./engines/BusinessMathEngine";
import { GeminiAnalysisEngine, type AIReasoningOutput } from "./engines/GeminiAnalysisEngine";
import { EpistemicKnowledgeGraph } from "./KnowledgeGraph";
import { FeedbackClusteringEngine } from "./FeedbackClusteringEngine";

export interface CopilotResponse extends AIReasoningOutput {
  query: string;
  acceptanceTestCategory?: "test_1_loop" | "test_2_missed_buying" | "test_3_product_sentiment" | "test_4_video_dna" | "test_5_revenue_goal" | "general";
  snapshotCalculatedAt: string;
}

export class BusinessCopilot {
  /**
   * Process a natural language business inquiry with real calculations + Gemini AI reasoning
   */
  static async query(userQuery: string): Promise<CopilotResponse> {
    const db = await getDB();
    const snapshot = await BusinessMathEngine.computeFullBusinessSnapshot();
    const qLower = userQuery.toLowerCase();

    // Query Epistemic Memory for relevant verified facts
    const memoryFacts = await EpistemicKnowledgeGraph.queryMemory({ searchQuery: userQuery });
    const factStrings = memoryFacts.map((f) => `[${f.epistemicType}] ${f.content}`);

    // AI Reasoning via GeminiAnalysisEngine
    const reasoning = await GeminiAnalysisEngine.analyzeBusinessQuery(userQuery, snapshot, factStrings);

    // Determine category with precise precedence
    let category: CopilotResponse["acceptanceTestCategory"] = "general";
    if (qLower.includes("full loop") || qLower.includes("test 1")) {
      category = "test_1_loop";
    } else if (qLower.includes("video") || qLower.includes("dna") || qLower.includes("content gap")) {
      category = "test_4_video_dna";
    } else if (qLower.includes("wanted to buy") || qLower.includes("missed") || qLower.includes("buying")) {
      category = "test_2_missed_buying";
    } else if (qLower.includes("think about") || qLower.includes("sentiment") || qLower.includes("product")) {
      category = "test_3_product_sentiment";
    } else if (qLower.includes("1 lakh") || qLower.includes("make more") || qLower.includes("increase revenue")) {
      category = "test_5_revenue_goal";
    }

    return {
      query: userQuery,
      answerSummary: reasoning.answerSummary,
      groundedFacts: reasoning.groundedFacts,
      inferences: reasoning.inferences,
      predictions: reasoning.predictions,
      recommendedActions: reasoning.recommendedActions,
      evidenceSources: reasoning.evidenceSources,
      confidenceScore: reasoning.confidenceScore,
      acceptanceTestCategory: category,
      snapshotCalculatedAt: snapshot.calculatedAt,
    };
  }

  /**
   * Real Daily Morning Briefing computed dynamically from real database metrics
   */
  static async getDailyBriefing(): Promise<{
    headline: string;
    keyEvents: string[];
    recommendedActions: string[];
    metrics: {
      totalComments: number;
      repliedCount: number;
      unrepliedCount: number;
      automationRate: number;
      unrepliedInquiries: number;
      channelName: string;
      channelHandle: string;
      subscribers: string;
      hasLiveOrders: boolean;
      totalOrders: number;
      grossRevenue: number;
    };
  }> {
    const snapshot = await BusinessMathEngine.computeFullBusinessSnapshot();
    const clusters = await FeedbackClusteringEngine.getClusters();

    const channelName = snapshot.channels.channels[0]?.name || "Connected Channel";
    const channelHandle = snapshot.channels.channels[0]?.handle || "@channel";
    const subs = snapshot.channels.channels[0]?.subscribers || "0";

    const topCluster = clusters[0];
    const keyEvents: string[] = [
      `Channel ${channelName} (${channelHandle}) has ${subs} subscribers with ${snapshot.comments.totalCommentsScanned} scanned comments.`,
      `Automation rate is currently ${snapshot.comments.automationRate}% (${snapshot.comments.repliedCount} auto-replied, ${snapshot.comments.unrepliedCount} skipped).`,
      snapshot.comments.unansweredInquiriesCount > 0
        ? `Detected ${snapshot.comments.unansweredInquiriesCount} substantive product/team questions awaiting response.`
        : `All incoming comments have been processed.`,
    ];

    const recommendedActions: string[] = [
      `Add an auto-reply rule for "product" and "about" keywords to answer questions with your website link (https://notyourcollege.com/).`,
      `Pair WhatsApp Business via QR scan to start capturing mobile inquiries.`,
      topCluster ? topCluster.recommendedAction : "Maintain Level 3 Autonomous Auto-Reply for fast response times.",
    ];

    return {
      headline: `Real-time operations briefing for ${channelName} (${channelHandle}): ${snapshot.comments.totalCommentsScanned} comments scanned, ${snapshot.comments.automationRate}% automated.`,
      keyEvents,
      recommendedActions,
      metrics: {
        totalComments: snapshot.comments.totalCommentsScanned,
        repliedCount: snapshot.comments.repliedCount,
        unrepliedCount: snapshot.comments.unrepliedCount,
        automationRate: snapshot.comments.automationRate,
        unrepliedInquiries: snapshot.comments.unansweredInquiriesCount,
        channelName,
        channelHandle,
        subscribers: subs,
        hasLiveOrders: snapshot.revenue.hasLiveOrders,
        totalOrders: snapshot.revenue.totalOrdersCount,
        grossRevenue: snapshot.revenue.totalGrossRevenue,
      },
    };
  }
}
