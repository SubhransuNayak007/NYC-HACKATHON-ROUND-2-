/**
 * Intent Classifier for Quick Reply
 *
 * Uses Claude Haiku (fast, cheap) to classify YouTube comments into
 * intent categories. This determines whether to attempt a RAG reply
 * or skip the comment entirely.
 *
 * Core behavior: Only "question" intents proceed to RAG matching.
 * Everything else is skipped (no knowledge base match expected).
 */

import Anthropic from "@anthropic-ai/sdk";
import { CommentIntent, SKIP_INTENTS } from "./rag_types";

// --- Lazy-initialized Anthropic client ---
let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const FAST_MODEL = "claude-3-5-haiku-20241022";

const VALID_INTENTS: CommentIntent[] = [
  "question", "praise", "complaint", "suggestion", "report", "off_topic",
];

/**
 * Classify a YouTube comment's intent.
 *
 * @param commentText - The comment text to classify
 * @param videoTitle - Optional video title for context
 * @returns The classified intent, or "off_topic" on failure
 */
export async function classifyIntent(
  commentText: string,
  videoTitle?: string
): Promise<CommentIntent> {
  const client = getClient();
  if (!client) {
    // No API key — assume question to let RAG handle it
    return "question";
  }

  try {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 20,
      system: `Classify this YouTube comment into exactly one category.

Categories:
- question: The commenter is asking for information, how-to, pricing, availability, or clarification about a product/service
- praise: The commenter is expressing appreciation, agreement, or compliment (e.g. "great video!", "love this")
- complaint: The commenter is expressing dissatisfaction, frustration, or criticism
- suggestion: The commenter is proposing an idea, improvement, or feature request
- report: The commenter is reporting a bug, error, or issue
- off_topic: The comment is not related to the product, service, or video topic (e.g. random chat, self-promotion, unrelated)

Respond with ONLY the category name (lowercase, no quotes, no period).`,
      messages: [
        {
          role: "user",
          content: videoTitle
            ? `Video: "${videoTitle}"\nComment: "${commentText}"`
            : `Comment: "${commentText}"`,
        },
      ],
    });

    const raw =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim().toLowerCase()
        : "";

    // Parse and validate
    const intent = raw.replace(/[^a-z_]/g, "") as CommentIntent;
    if (VALID_INTENTS.includes(intent)) {
      return intent;
    }

    // Fallback: try to match partial strings
    if (raw.includes("question")) return "question";
    if (raw.includes("praise") || raw.includes("positive")) return "praise";
    if (raw.includes("complaint") || raw.includes("negative")) return "complaint";
    if (raw.includes("suggestion")) return "suggestion";
    if (raw.includes("report")) return "report";

    return "off_topic";
  } catch (err) {
    console.error("[IntentClassifier] Classification failed:", err);
    // On failure, assume question to let RAG attempt a match
    return "question";
  }
}

/**
 * Quick check: should we skip this comment entirely based on intent?
 * Returns true for intents that don't match any knowledge base entry.
 */
export function shouldSkipByIntent(intent: CommentIntent): boolean {
  return SKIP_INTENTS.includes(intent);
}
