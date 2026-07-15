/**
 * AI Service Layer for Quick Reply
 *
 * Provider-agnostic wrapper around Anthropic's Claude API.
 * Powers: reply generation, sentiment analysis, language detection, and translation.
 * All functions gracefully fallback on API errors (returns null).
 */

import Anthropic from "@anthropic-ai/sdk";

// --- Lazy-initialized Anthropic client ---
let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[AI] ANTHROPIC_API_KEY not set — AI features disabled");
    return null;
  }
  if (!_client) {
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const MODEL = "claude-3-5-sonnet-20241022";
const FAST_MODEL = "claude-3-5-haiku-20241022";

// --- Types ---

export interface ReplyContext {
  commentText: string;
  author: string;
  videoTitle: string;
  channelName: string;
  faqContext?: string;
  tone?: "friendly" | "professional" | "casual" | "enthusiastic";
}

export interface GenerateReplyResult {
  reply: string;
  confidence: number;
}

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative" | "question" | "spam";
  confidence: number;
}

export interface LanguageDetectionResult {
  language: string;
  languageName: string;
  confidence: number;
}

export interface TranslationResult {
  detectedLanguage: string;
  detectedLanguageName: string;
  translatedText: string;
  wasTranslated: boolean;
}

// --- Reply Generation ---

export async function generateReply(context: ReplyContext): Promise<GenerateReplyResult | null> {
  const client = getClient();
  if (!client) return null;

  const toneInstructions: Record<string, string> = {
    friendly: "Be warm, approachable, and grateful. Use casual language.",
    professional: "Be clear, respectful, and informative. Maintain a polished tone.",
    casual: "Be laid-back, brief, and conversational. Like texting a friend.",
    enthusiastic: "Be energetic, excited, and expressive. Match the commenter's energy.",
  };

  const tone = context.tone || "friendly";
  const toneInstruction = toneInstructions[tone] || toneInstructions.friendly;

  const systemPrompt = `You are a YouTube creator's auto-reply assistant. Generate a natural, human-like reply to a YouTube comment.

Rules:
- Keep replies under 150 characters when possible (YouTube comments are short)
- Use 1-2 emojis max, only if appropriate
- NEVER reveal you are AI or automated
- Match the language of the comment
- Be genuine and specific to what the commenter said
- Don't be overly generic or templated
- If the comment is a question, answer it concisely
- If the comment is a compliment, thank them warmly
- ${toneInstruction}

Return ONLY a JSON object with two fields:
- "reply": the reply text
- "confidence": a number 0.0-1.0 representing how confident you are that this reply is accurate, on-topic, and appropriate to auto-post on the creator's behalf (lower it when the comment is ambiguous, mentions something you can't verify, or needs a human touch)
No other text. Just the JSON.`;

  const userPrompt = `Reply to this YouTube comment:

Video: "${context.videoTitle}"
Channel: "${context.channelName}"
Commenter: ${context.author}
Comment: "${context.commentText}"
${context.faqContext ? `\nRelevant FAQ context:\n${context.faqContext}` : ""}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return null;

    // Parse the JSON response; fall back to treating the whole output as the reply
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let reply = raw;
    let confidence = 0.5;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.reply === "string" && parsed.reply.trim()) {
          reply = parsed.reply;
        }
        if (typeof parsed.confidence === "number") {
          confidence = Math.min(1, Math.max(0, parsed.confidence));
        }
      } catch {
        // Not valid JSON — treat raw output as the reply
      }
    }

    // Clean up any quotes or markdown wrapping
    const cleanReply = reply.replace(/^["']|["']$/g, "").replace(/\*\*/g, "").trim();

    return {
      reply: cleanReply,
      confidence,
    };
  } catch (err) {
    console.error("[AI] Reply generation failed:", err);
    return null;
  }
}

// --- Sentiment Analysis ---

export async function analyzeSentiment(text: string): Promise<SentimentResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 64,
      system: `Classify the sentiment of this YouTube comment. Return ONLY a JSON object with "sentiment" and "confidence" fields.
Sentiment must be exactly one of: "positive", "neutral", "negative", "question", "spam"
Confidence is a number between 0 and 1.
No other text. Just the JSON.`,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return null;

    // Try to parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validSentiments = ["positive", "neutral", "negative", "question", "spam"];
    if (!validSentiments.includes(parsed.sentiment)) return null;

    return {
      sentiment: parsed.sentiment,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
    };
  } catch (err) {
    console.error("[AI] Sentiment analysis failed:", err);
    return null;
  }
}

// --- Batch Sentiment Analysis (cost-optimized: multiple comments in one call) ---

export async function batchAnalyzeSentiment(
  comments: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; sentiment: SentimentResult | null }>> {
  const client = getClient();
  if (!client) return comments.map((c) => ({ id: c.id, sentiment: null }));

  // Process in batches of 10 to stay within token limits
  const BATCH_SIZE = 10;
  const results: Array<{ id: string; sentiment: SentimentResult | null }> = [];

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);

    try {
      const commentList = batch
        .map((c, idx) => `[${idx + 1}] (id: ${c.id}) ${c.text}`)
        .join("\n");

      const response = await client.messages.create({
        model: FAST_MODEL,
        max_tokens: 512,
        system: `Classify the sentiment of each YouTube comment below. Return a JSON array where each element has: "id" (the comment id), "sentiment" (one of: "positive", "neutral", "negative", "question", "spam"), and "confidence" (0-1 number).
Return ONLY the JSON array. No other text.`,
        messages: [{ role: "user", content: commentList }],
      });

      const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
      if (!raw) {
        batch.forEach((c) => results.push({ id: c.id, sentiment: null }));
        continue;
      }

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        batch.forEach((c) => results.push({ id: c.id, sentiment: null }));
        continue;
      }

      const parsed: Array<{ id: string; sentiment: string; confidence: number }> = JSON.parse(jsonMatch[0]);
      const validSentiments = ["positive", "neutral", "negative", "question", "spam"];

      // Map results back by id
      const resultMap = new Map<string, SentimentResult>();
      for (const item of parsed) {
        if (validSentiments.includes(item.sentiment)) {
          resultMap.set(item.id, {
            sentiment: item.sentiment as SentimentResult["sentiment"],
            confidence: Math.min(1, Math.max(0, item.confidence || 0.7)),
          });
        }
      }

      for (const c of batch) {
        results.push({ id: c.id, sentiment: resultMap.get(c.id) || null });
      }
    } catch (err) {
      console.error("[AI] Batch sentiment failed:", err);
      batch.forEach((c) => results.push({ id: c.id, sentiment: null }));
    }
  }

  return results;
}

// --- Language Detection ---

export async function detectLanguage(text: string): Promise<LanguageDetectionResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 64,
      system: `Detect the language of the text below. Return ONLY a JSON object with:
- "language": ISO 639-1 code (e.g., "en", "es", "ja", "ko", "fr", "de", "hi", "pt", "ar", "ru")
- "languageName": Full language name in English (e.g., "English", "Spanish", "Japanese")
- "confidence": number between 0 and 1
No other text. Just the JSON.`,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.language) return null;

    return {
      language: parsed.language,
      languageName: parsed.languageName || parsed.language,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.8)),
    };
  } catch (err) {
    console.error("[AI] Language detection failed:", err);
    return null;
  }
}

// --- Translation ---

export async function translateText(
  text: string,
  targetLanguage: string = "en"
): Promise<TranslationResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: `You are a translator. First detect the language of the input text. Then translate it to the target language.

Return ONLY a JSON object with:
- "detectedLanguage": ISO 639-1 code of the source language
- "detectedLanguageName": Full name of the source language in English
- "translatedText": The translated text
- "wasTranslated": true if source and target languages differ, false if same

Target language: ${targetLanguage}
No other text. Just the JSON.`,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.translatedText) return null;

    return {
      detectedLanguage: parsed.detectedLanguage || "unknown",
      detectedLanguageName: parsed.detectedLanguageName || "Unknown",
      translatedText: parsed.translatedText,
      wasTranslated: parsed.wasTranslated ?? parsed.detectedLanguage !== targetLanguage,
    };
  } catch (err) {
    console.error("[AI] Translation failed:", err);
    return null;
  }
}

// --- Combined: Detect + Translate (single API call for efficiency) ---

export async function detectAndTranslate(
  commentText: string,
  replyTemplate: string,
  channelLanguage: string = "en"
): Promise<TranslationResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: `You are a language expert for a YouTube auto-reply system.

1. Detect the language of the COMMENT below
2. If the comment is in a different language than the channel's default (${channelLanguage}), translate the REPLY TEMPLATE into the comment's language
3. If same language, return the reply template as-is

Return ONLY a JSON object with:
- "detectedLanguage": ISO 639-1 code (e.g., "en", "es", "ja")
- "detectedLanguageName": Full language name in English
- "translatedText": The translated reply (or original if same language)
- "wasTranslated": boolean

No other text. Just the JSON.`,
      messages: [
        {
          role: "user",
          content: `Comment (language to detect): "${commentText}"\n\nReply template (to translate if needed): "${replyTemplate}"`,
        },
      ],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.translatedText) return null;

    return {
      detectedLanguage: parsed.detectedLanguage || "unknown",
      detectedLanguageName: parsed.detectedLanguageName || "Unknown",
      translatedText: parsed.translatedText,
      wasTranslated: parsed.wasTranslated ?? false,
    };
  } catch (err) {
    console.error("[AI] detectAndTranslate failed:", err);
    return null;
  }
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt || "You are a helpful and intelligent AI assistant.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    return text;
  } catch (err) {
    console.error("[AI] generateText failed:", err);
    return null;
  }
}

// --- Health Check ---

export async function checkAIAvailability(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    });
    return response.content.length > 0;
  } catch {
    return false;
  }
}

