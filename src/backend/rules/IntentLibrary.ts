/**
 * ============================================================================
 * QuickReply — Comprehensive Intent Library & Classifier
 * src/backend/rules/IntentLibrary.ts
 *
 * Pre-calibrated intent registry covering e-commerce, customer support,
 * giveaways, pricing, complaints, and lead capture.
 * ============================================================================
 */

export interface IntentDefinition {
  code: string;
  name: string;
  category: "COMMERCE" | "SUPPORT" | "ENGAGEMENT" | "CHALLENGE" | "FEEDBACK";
  description: string;
  keywords: string[];
  patterns: RegExp[];
}

export class IntentLibrary {
  private static intents: IntentDefinition[] = [
    {
      code: "BUYING_INTENT",
      name: "Buying & Order Intent",
      category: "COMMERCE",
      description: "Viewer expresses direct desire to purchase, order, or checkout.",
      keywords: ["buy", "order", "purchase", "where to buy", "link to buy", "how to get one", "add to cart", "checkout", "need this"],
      patterns: [/where\s+can\s+i\s+(buy|get|order)/i, /how\s+do\s+i\s+(buy|order)/i, /i\s+need\s+(one|this)/i, /link\s+please/i],
    },
    {
      code: "PRICE_QUESTION",
      name: "Pricing & Cost Inquiry",
      category: "COMMERCE",
      description: "Viewer inquires about price, discounts, subscriptions, or coupons.",
      keywords: ["price", "cost", "how much", "rate", "discount", "offer", "coupon", "promo code", "expensive", "cheap", "plans"],
      patterns: [/how\s+much(\s+is|\s+does|\s+for|\?|$)/i, /what('s|\s+is)\s+the\s+price/i, /send\s+(price|rate)/i, /any\s+discount/i],
    },
    {
      code: "AVAILABILITY",
      name: "Product Availability & Stock",
      category: "COMMERCE",
      description: "Viewer asks if specific item, color, or variant is in stock.",
      keywords: ["in stock", "available", "sold out", "restock", "which color", "sizes", "variants"],
      patterns: [/is\s+(this|it)\s+(still\s+)?available/i, /when\s+will\s+it\s+restock/i, /in\s+stock/i],
    },
    {
      code: "SHIPPING",
      name: "Shipping & Delivery",
      category: "COMMERCE",
      description: "Viewer inquires about delivery time, tracking, or shipping zones.",
      keywords: ["shipping", "delivery", "track order", "how long to arrive", "ship to", "international shipping", "free delivery"],
      patterns: [/how\s+long\s+(does|to)\s+(shipping|delivery|arrive)/i, /do\s+you\s+ship\s+to/i, /where\s+is\s+my\s+order/i],
    },
    {
      code: "SUPPORT_REQUEST",
      name: "Customer Support & Troubleshooting",
      category: "SUPPORT",
      description: "Viewer needs help, troubleshooting, or product guidance.",
      keywords: ["help", "not working", "broken", "issue", "bug", "how to setup", "manual", "guide", "stuck"],
      patterns: [/how\s+do\s+i\s+setup/i, /it('s|\s+is)\s+not\s+working/i, /need\s+help\s+with/i],
    },
    {
      code: "REFUND",
      name: "Refund & Cancellation",
      category: "SUPPORT",
      description: "Viewer requests refund, exchange, or order cancellation.",
      keywords: ["refund", "money back", "cancel order", "return policy", "exchange"],
      patterns: [/want\s+a\s+refund/i, /cancel\s+my\s+order/i, /return\s+policy/i],
    },
    {
      code: "COMPLAINT",
      name: "Critical Complaint & Escalation",
      category: "FEEDBACK",
      description: "Severe dissatisfaction, legal threat, or product failure.",
      keywords: ["terrible", "worst", "scam", "fraud", "sue", "lawyer", "disappointed", "stole", "waste of money"],
      patterns: [/waste\s+of\s+money/i, /total\s+scam/i, /going\s+to\s+sue/i, /worst\s+experience/i],
    },
    {
      code: "PRAISE",
      name: "Positive Reaction & Praise",
      category: "FEEDBACK",
      description: "Viewer compliments the video, content, or product.",
      keywords: ["love this", "great video", "awesome", "helpful", "amazing", "best", "thank you", "kudos"],
      patterns: [/great\s+(video|job|content)/i, /love\s+this/i, /thank\s+you\s+so\s+much/i],
    },
    {
      code: "GIVEAWAY_ENTRY",
      name: "Giveaway & Contest Entry",
      category: "CHALLENGE",
      description: "Participation in a giveaway, contest, or raffle.",
      keywords: ["enter", "giveaway", "participate", "count me in", "contest", "win"],
      patterns: [/count\s+me\s+in/i, /enter(ed)?\s+the\s+giveaway/i, /hope\s+i\s+win/i],
    },
    {
      code: "GAME_ENTRY",
      name: "Challenge / Game Answer",
      category: "CHALLENGE",
      description: "Viewer answering a quiz, riddle, or engagement question.",
      keywords: ["answer is", "my guess", "i think", "option", "number"],
      patterns: [/the\s+answer\s+is/i, /my\s+guess\s+is/i, /i\s+think\s+it('s|\s+is)/i],
    },
    {
      code: "SPAM",
      name: "Spam & Self-Promotion",
      category: "FEEDBACK",
      description: "Spam links, telegram bots, cryptocurrency shills.",
      keywords: ["whatsapp me", "check my channel", "crypto", "free followers", "dm on telegram"],
      patterns: [/check\s+(out\s+)?my\s+channel/i, /dm\s+me\s+on\s+telegram/i, /invest\s+in\s+crypto/i],
    },
  ];

  /**
   * Fast deterministic regex + keyword intent detection (<1ms)
   */
  static detectIntent(text: string): { intent: string; confidence: number; matchedKeywords: string[] } {
    if (!text || !text.trim()) {
      return { intent: "GENERAL_ENGAGEMENT", confidence: 0.1, matchedKeywords: [] };
    }

    const cleanText = text.toLowerCase();

    for (const item of this.intents) {
      // 1. Check regex patterns first (highest confidence)
      for (const pattern of item.patterns) {
        if (pattern.test(cleanText)) {
          return { intent: item.code, confidence: 0.94, matchedKeywords: [pattern.source] };
        }
      }

      // 2. Check keyword lists
      const matchedKw = item.keywords.filter((kw) => cleanText.includes(kw.toLowerCase()));
      if (matchedKw.length >= 2) {
        return { intent: item.code, confidence: 0.88, matchedKeywords: matchedKw };
      }
      if (matchedKw.length === 1) {
        return { intent: item.code, confidence: 0.75, matchedKeywords: matchedKw };
      }
    }

    return { intent: "GENERAL_ENGAGEMENT", confidence: 0.5, matchedKeywords: [] };
  }

  static getAll(): IntentDefinition[] {
    return this.intents;
  }
}
