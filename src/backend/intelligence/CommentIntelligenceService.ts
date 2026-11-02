/**
 * ============================================================================
 * QuickReply — Comment Intelligence Command Center Service
 * src/backend/intelligence/CommentIntelligenceService.ts
 *
 * Provides:
 * 1. Smart Comment Queuing & Categorization (High Priority, Buying, Support, Spam).
 * 2. Multi-Channel Query Builder with cursor pagination.
 * 3. Bot & Spam Scoring Radar.
 * 4. Aggregate operational intent statistics.
 * ============================================================================
 */

import { getDB } from "@/database/db";
import { IntentLibrary } from "@/backend/rules/IntentLibrary";

export interface CommentIntelligenceItem {
  id: string;
  platform: string;
  author: string;
  authorAvatar?: string;
  text: string;
  publishedAt: string;
  contentTitle: string;
  contentId: string;
  intent: string;
  intentConfidence: number;
  sentiment: "positive" | "neutral" | "negative";
  queueCategory: "HIGH_PRIORITY" | "BUYING_INTENT" | "SUPPORT" | "GIVEAWAY" | "GENERAL" | "SPAM";
  spamScore: number;          // 0.0 (Clean) to 1.0 (Confirmed Spam)
  leadScore: number;
  isAnswered: boolean;
  repliedText?: string;
  tags: string[];
}

export interface CommentFilterQuery {
  platform?: string;
  contentId?: string;
  searchKeyword?: string;
  intent?: string;
  queueCategory?: string;
  sentiment?: string;
  minLeadScore?: number;
  unansweredOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class CommentIntelligenceService {
  /**
   * Calculate Bot / Spam Score (0.0 to 1.0)
   */
  static calculateSpamScore(text: string): number {
    let score = 0.0;
    const clean = text.toLowerCase();

    // 1. Link Density
    const urlMatches = text.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 0) score += 0.45;

    // 2. Known Spam & Bot Phrases
    const spamPhrases = [
      "whatsapp me", "dm on telegram", "crypto investment", "free followers",
      "check my bio", "check out my channel", "sub4sub", "click here", "inbox me now"
    ];
    for (const phrase of spamPhrases) {
      if (clean.includes(phrase)) score += 0.5;
    }

    // 3. Repeated Characters (e.g. "aaaaaa", "!!!!!!!")
    if (/(.)\1{5,}/.test(text)) score += 0.25;

    // 4. Excessive Emojis
    const emojiCount = (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length;
    if (emojiCount > 6) score += 0.2;

    return Math.min(1.0, parseFloat(score.toFixed(2)));
  }

  /**
   * Classify Comment into Smart Queue
   */
  static classifyQueue(intent: string, spamScore: number, text: string): CommentIntelligenceItem["queueCategory"] {
    if (spamScore >= 0.7) return "SPAM";
    if (intent === "COMPLAINT" || intent === "REFUND") return "HIGH_PRIORITY";
    if (intent === "BUYING_INTENT" || intent === "PRICE_QUESTION") return "BUYING_INTENT";
    if (intent === "SUPPORT_REQUEST" || intent === "AVAILABILITY" || intent === "SHIPPING") return "SUPPORT";
    if (intent === "GIVEAWAY_ENTRY" || intent === "GAME_ENTRY") return "GIVEAWAY";
    return "GENERAL";
  }

  /**
   * Search and Filter Comments from Database
   */
  static async searchComments(
    tenantId: string,
    query: CommentFilterQuery
  ): Promise<{ items: CommentIntelligenceItem[]; total: number; intentDistribution: Record<string, number> }> {
    const db = await getDB(tenantId);
    const rawComments = db.comments || [];

    const intentCounts: Record<string, number> = {};

    const enrichedItems: CommentIntelligenceItem[] = rawComments.map((c: any) => {
      const intentRes = IntentLibrary.detectIntent(c.text || "");
      const spamScore = this.calculateSpamScore(c.text || "");
      const queueCategory = this.classifyQueue(intentRes.intent, spamScore, c.text || "");

      // Determine sentiment
      let sentiment: "positive" | "neutral" | "negative" = "neutral";
      if (intentRes.intent === "PRAISE") sentiment = "positive";
      if (intentRes.intent === "COMPLAINT" || intentRes.intent === "REFUND") sentiment = "negative";

      intentCounts[intentRes.intent] = (intentCounts[intentRes.intent] || 0) + 1;

      return {
        id: c.id,
        platform: c.platform || "youtube",
        author: c.author || "Viewer",
        authorAvatar: c.authorAvatar,
        text: c.text || "",
        publishedAt: c.publishedAt || new Date().toISOString(),
        contentTitle: c.videoTitle || "Recent Video",
        contentId: c.videoId || "vid_default",
        intent: intentRes.intent,
        intentConfidence: intentRes.confidence,
        sentiment,
        queueCategory,
        spamScore,
        leadScore: intentRes.intent === "BUYING_INTENT" ? 85 : intentRes.intent === "PRICE_QUESTION" ? 75 : 50,
        isAnswered: !!c.replyText || c.status === "replied",
        repliedText: c.replyText,
        tags: c.tags || [queueCategory.toLowerCase()],
      };
    });

    // Apply Filter Query
    let filtered = enrichedItems;

    if (query.platform) {
      filtered = filtered.filter((i) => i.platform.toLowerCase() === query.platform?.toLowerCase());
    }
    if (query.contentId) {
      filtered = filtered.filter((i) => i.contentId === query.contentId);
    }
    if (query.queueCategory && query.queueCategory !== "ALL") {
      filtered = filtered.filter((i) => i.queueCategory === query.queueCategory);
    }
    if (query.intent && query.intent !== "ALL") {
      filtered = filtered.filter((i) => i.intent === query.intent);
    }
    if (query.sentiment && query.sentiment !== "ALL") {
      filtered = filtered.filter((i) => i.sentiment === query.sentiment);
    }
    if (query.unansweredOnly) {
      filtered = filtered.filter((i) => !i.isAnswered);
    }
    if (query.searchKeyword && query.searchKeyword.trim()) {
      const kw = query.searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.text.toLowerCase().includes(kw) ||
          i.author.toLowerCase().includes(kw) ||
          i.contentTitle.toLowerCase().includes(kw)
      );
    }

    const total = filtered.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    return {
      items: filtered.slice(offset, offset + limit),
      total,
      intentDistribution: intentCounts,
    };
  }
}
