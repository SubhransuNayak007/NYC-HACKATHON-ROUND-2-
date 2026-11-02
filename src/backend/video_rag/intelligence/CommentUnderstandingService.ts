/**
 * ============================================================================
 * QuickReply — Comment Understanding & Multi-Label Intent Classifier
 * src/backend/video_rag/intelligence/CommentUnderstandingService.ts
 *
 * Implements:
 * 1. 21-Label Multi-Classification Engine
 * 2. Thread Depth & Conversation Context Awareness
 * 3. Self-Response Loop Protection & Bot Filtering
 * 4. Timestamp Reference Extraction
 * ============================================================================
 */

import {
  CommentUnderstandingResult,
  CommentClassificationLabel,
} from "../types";

export class CommentUnderstandingService {
  /**
   * Deeply analyze and classify incoming comment with conversation context
   */
  static analyzeComment(params: {
    commentId: string;
    text: string;
    author: string;
    authorSubscribers?: string;
    parentCommentId?: string;
    threadHistory?: Array<{ author: string; text: string }>;
    channelHandle?: string;
  }): CommentUnderstandingResult {
    const rawText = params.text || "";
    const cleanText = rawText.trim();
    const lowerText = cleanText.toLowerCase();

    const classifications: CommentClassificationLabel[] = [];

    // 1. Check for Self-Response / Creator Bot Loop
    const isSelfResponse =
      (params.channelHandle && params.author.toLowerCase().includes(params.channelHandle.toLowerCase())) ||
      params.author.toLowerCase().includes("quickreply_bot") ||
      params.author.toLowerCase() === "quickreply";

    // 2. Check for Emoji-Only or Low Information
    const emojiRegex = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
    const isEmojiOnly = emojiRegex.test(cleanText) || /^[🔥❤️👏🙌😍✨👍💯🎉🚀]+$/.test(cleanText);

    if (isEmojiOnly) {
      classifications.push("LOW_INFORMATION");
    }

    // 3. Short Generic Praise / Single Words
    const praiseWords = ["nice", "great", "cool", "first", "wow", "good", "awesome", "loved it", "op", "fire", "super"];
    if (praiseWords.includes(lowerText) || (lowerText.length < 25 && praiseWords.some((p) => lowerText.startsWith(p)))) {
      classifications.push("PRAISE");
    }

    // 4. Genuine Question Detection
    const hasQuestionMark = cleanText.includes("?");
    const hasQuestionWords = /\b(what|how|where|when|why|which|can|does|is|are|could|would|will)\b/i.test(cleanText);
    if (hasQuestionMark || hasQuestionWords) {
      classifications.push("GENUINE_QUESTION");
    }

    // 5. Real Problem / Support / Bug / Complaint Detection
    const problemRegex = /\b(crash(?:es|ed|ing)?|error|bug|broken|not working|fail(?:s|ed|ing|ure)?|problem|issue|help|stuck|refund|delay(?:ed|s)?|scam|terrible|cannot install)\b/i;
    if (problemRegex.test(cleanText)) {
      classifications.push("REAL_PROBLEM");
      classifications.push("SUPPORT_REQUEST");
    }

    // 6. Buying Intent Detection
    const buyingRegex = /\b(price|cost|buy|discount|coupon|how much|available|where to buy|link to buy|shipping)\b/i;
    if (buyingRegex.test(cleanText)) {
      classifications.push("PURCHASE_INTENT");
    }

    // 7. Helpful Feedback / Constructive Criticism
    const feedbackRegex = /\b(next time|suggestion|would be better|you should|comparison|improved|tested on|benchmark)\b/i;
    if (feedbackRegex.test(cleanText)) {
      classifications.push("USEFUL_FEEDBACK");
      classifications.push("CONSTRUCTIVE_CRITICISM");
    }

    // 8. Joke / Meme / Casual Reaction
    const jokeRegex = /\b(lol|lmao|haha|bro really|fighting for its life|dead|nah bro|😂|💀|🤣)\b/i;
    if (jokeRegex.test(cleanText)) {
      classifications.push("JOKE");
      classifications.push("MEME");
      classifications.push("CASUAL_REACTION");
    }

    // 9. Spam / Promotion / Bot-like
    const spamRegex = /\b(whatsapp me|check my bio|free followers|telegram|crypto|invest|subscribe to my|click here|dm me)\b/i;
    const urlMatches = cleanText.match(/https?:\/\/[^\s]+/g);
    let spamProb = 0.0;
    if (spamRegex.test(cleanText)) spamProb += 0.7;
    if (urlMatches && urlMatches.length > 0) spamProb += 0.5;

    if (spamProb >= 0.6) {
      classifications.push("SPAM");
      classifications.push("PROMOTION");
      classifications.push("BOT_LIKE");
    }

    // 10. Timestamp Reference Detection (e.g. "at 3:20", "around 2:15", "part 1:05")
    const timestampRegex = /\b(?:at|around|timestamp|part|time)?\s*(\d{1,2}:\d{2})\b/i;
    const timestampReferenceRequested = timestampRegex.test(cleanText) || lowerText.includes("timestamp") || lowerText.includes("what part");

    // 11. Toxicity / Abuse
    const abuseRegex = /\b(idiot|trash|stupid|scam|garbage|hate|shut up)\b/i;
    const toxicityScore = abuseRegex.test(cleanText) ? 0.65 : 0.05;
    if (toxicityScore >= 0.5) {
      classifications.push("ABUSE");
    }

    // Determine Primary Classification
    let primaryClassification: CommentClassificationLabel = "CASUAL_REACTION";
    if (classifications.includes("REAL_PROBLEM")) primaryClassification = "REAL_PROBLEM";
    else if (classifications.includes("GENUINE_QUESTION")) primaryClassification = "GENUINE_QUESTION";
    else if (classifications.includes("PURCHASE_INTENT")) primaryClassification = "PURCHASE_INTENT";
    else if (classifications.includes("USEFUL_FEEDBACK")) primaryClassification = "USEFUL_FEEDBACK";
    else if (classifications.includes("SPAM")) primaryClassification = "SPAM";
    else if (classifications.includes("LOW_INFORMATION")) primaryClassification = "LOW_INFORMATION";
    else if (classifications.includes("PRAISE")) primaryClassification = "PRAISE";
    else if (classifications.length > 0) primaryClassification = classifications[0];

    // Determine Sentiment
    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    if (classifications.includes("REAL_PROBLEM") || classifications.includes("ABUSE") || lowerText.includes("bad")) {
      sentiment = "negative";
    } else if (classifications.includes("PRAISE") || classifications.includes("THANKS") || lowerText.includes("love") || lowerText.includes("great")) {
      sentiment = "positive";
    }

    return {
      commentId: params.commentId,
      text: cleanText,
      author: params.author,
      authorSubscribers: params.authorSubscribers,
      parentCommentId: params.parentCommentId,
      threadDepth: params.threadHistory ? params.threadHistory.length : 0,
      classifications,
      primaryClassification,
      sentiment,
      spamProbability: parseFloat(Math.min(1.0, spamProb).toFixed(2)),
      toxicityScore,
      isSelfResponse: !!isSelfResponse,
      isAlreadyAnswered: false,
      extractedQuestion: hasQuestionMark ? cleanText : undefined,
      extractedConcern: classifications.includes("REAL_PROBLEM") ? cleanText : undefined,
      detectedEntities: [],
      timestampReferenceRequested,
    };
  }
}
