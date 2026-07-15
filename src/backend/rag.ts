/**
 * ============================================================================
 *  QuickReply — Production RAG Engine (LangChain + Neural Vector Index)
 *  src/backend/rag.ts
 *
 *  Replaced legacy TF-IDF engine with real ML vector search:
 *   - Local ONNX Neural Embeddings (384-dim Xenova/all-MiniLM-L6-v2) or OpenAI (1536-dim)
 *   - LangChain RecursiveCharacterTextSplitter for semantic document chunking
 *   - Hybrid Retrieval (Dense Semantic Vector Cosine + Sparse BM25 Keyword Match)
 *   - Reciprocal Rank Fusion (RRF) score aggregation & confidence thresholding
 * ============================================================================
 */

import {
  searchHybridRAG,
  searchHybridRAGMultiQuery,
  personalizeRAGReply,
  HybridMatchResult,
  indexUserFAQs,
  expandQuery,
} from "./rag_pipeline";
import {
  CommentIntent,
  RAGReplyResult,
  getVideoPollingTier,
} from "./rag_types";
import { getDynamicThresholds } from "./confidence";
import { rerankCandidates, mergeRerankedScores } from "./reranker";

// --- FAQ & Matching Interfaces ---

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  faqId: string;
  question: string;
  answer: string;
  confidence: number;
  category: string;
  denseScore?: number;
  sparseScore?: number;
}

/**
 * Find the best matching FAQ for a given comment text using Hybrid Neural RAG.
 *
 * @param commentText - Incoming YouTube comment text
 * @param faqs - User's FAQ knowledge base
 * @param topK - Number of top matches to return
 * @param minConfidence - Minimum confidence threshold (0.0 - 1.0)
 * @param userEmail - Namespace identifier for vector index
 */
export async function findBestFAQMatch(
  commentText: string,
  faqs: FAQEntry[],
  topK: number = 3,
  minConfidence: number = 0.35,
  userEmail: string = "default_user"
): Promise<MatchResult[]> {
  if (!faqs || faqs.length === 0 || !commentText.trim()) return [];

  const matches = await searchHybridRAG(
    commentText,
    userEmail,
    faqs,
    topK,
    minConfidence
  );

  return matches.map((m) => ({
    faqId: m.faqId,
    question: m.question,
    answer: m.answer,
    confidence: m.confidence,
    category: m.category,
    denseScore: m.denseScore,
    sparseScore: m.sparseScore,
  }));
}

/**
 * Generate a contextual reply based on the matched FAQ.
 * Applies personalization variables (commenter name, channel name, date, etc.).
 */
export function generateRAGReply(
  faqMatch: MatchResult,
  commenterName: string,
  channelName: string
): string {
  return personalizeRAGReply(
    faqMatch.answer,
    commenterName,
    channelName,
    faqMatch.question
  );
}

/**
 * Full RAG Pipeline: Comment Text → Neural Hybrid Search → Contextual Reply
 * Returns null if no match meets the confidence threshold.
 */
export async function processRAGReply(
  commentText: string,
  faqs: FAQEntry[],
  commenterName: string,
  channelName: string,
  minConfidence: number = 0.38,
  userEmail: string = "default_user"
): Promise<{ replyText: string; matchedFAQ: MatchResult } | null> {
  const matches = await findBestFAQMatch(
    commentText,
    faqs,
    1,
    minConfidence,
    userEmail
  );
  if (matches.length === 0) return null;

  const best = matches[0];
  const replyText = generateRAGReply(best, commenterName, channelName);

  return { replyText, matchedFAQ: best };
}

// --- Enhanced RAG Pipeline: Multi-Query + Re-ranking + FAQ Grounding ---

import Anthropic from "@anthropic-ai/sdk";

let _aiClient: Anthropic | null = null;
function getAIClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_aiClient) _aiClient = new Anthropic({ apiKey });
  return _aiClient;
}

/**
 * Enhanced RAG pipeline with multi-query expansion, re-ranking, and FAQ grounding.
 *
 * Flow:
 * 1. Expand query into multiple variations
 * 2. Hybrid search with RRF across all variations
 * 3. Re-rank top candidates if confidence is uncertain
 * 4. If high confidence (>= 0.40): use FAQ answer directly
 * 5. If medium confidence (0.25-0.40): generate FAQ-grounded reply via Claude
 * 6. If low confidence (< 0.25): skip (no KB match)
 *
 * Returns null if no KB match found (comment should be skipped).
 */
export async function processEnhancedRAGReply(
  commentText: string,
  faqs: FAQEntry[],
  commenterName: string,
  channelName: string,
  intent: CommentIntent = "question",
  videoTitle?: string,
  userEmail: string = "default_user"
): Promise<RAGReplyResult | null> {
  const startTime = Date.now();

  if (!faqs || faqs.length === 0 || !commentText.trim()) return null;

  // 1. Get dynamic thresholds based on intent and comment complexity
  const thresholds = getDynamicThresholds(intent, commentText.length);

  // 2. Multi-query expansion
  const expanded = await expandQuery(commentText, videoTitle);

  // 3. Hybrid search with RRF across all query variations
  const matches = await searchHybridRAGMultiQuery(
    expanded,
    userEmail,
    faqs,
    5, // Get top 5 for re-ranking
    thresholds.skip
  );

  // If embedding search found nothing, still proceed to keyword fallback below
  // (don't return null here — the keyword fallback will catch it)
  if (matches.length === 0) {
    console.log(`[RAG] Embedding search returned 0 matches for "${commentText.slice(0, 60)}" — falling through to keyword fallback`);
  }

  // 4. If embedding search found results, re-rank and apply confidence gate
  if (matches.length > 0) {
    const topConfidence = matches[0].confidence;
    let bestMatch = matches[0];

    // Re-rank if confidence is in uncertain range (0.25 - 0.65)
    if (topConfidence >= 0.25 && topConfidence <= 0.65 && matches.length > 1) {
      const reranked = await rerankCandidates(commentText, matches.slice(0, 5));
      const merged = mergeRerankedScores(matches.slice(0, 5), reranked);

      if (merged.length > 0 && merged[0].finalScore > bestMatch.confidence) {
        bestMatch = merged[0];
      }
    }

    const finalConfidence = bestMatch.confidence;

    // HIGH CONFIDENCE: Use FAQ answer directly
    if (finalConfidence >= thresholds.ragDirect) {
      const replyText = personalizeRAGReply(
        bestMatch.answer,
        commenterName,
        channelName,
        bestMatch.question
      );

      return {
        replyText,
        confidence: finalConfidence,
        matchSource: "rag_direct",
        matchedFAQId: bestMatch.faqId,
        matchedChunks: [{ id: bestMatch.faqId, score: finalConfidence, source: "rag" }],
        intent,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // MEDIUM CONFIDENCE: Generate FAQ-grounded reply via Claude
    if (finalConfidence >= thresholds.faqFallback) {
      const replyText = await generateFAQGroundedReply(
        commentText,
        bestMatch,
        commenterName,
        channelName,
        matches.slice(0, 3)
      );

      if (replyText) {
        return {
          replyText,
          confidence: finalConfidence,
          matchSource: "faq_hybrid",
          matchedFAQId: bestMatch.faqId,
          matchedChunks: matches.slice(0, 3).map((m) => ({
            id: m.faqId,
            score: m.confidence,
            source: "rag",
          })),
          intent,
          processingTimeMs: Date.now() - startTime,
        };
      }
    }
  }

  // LOW CONFIDENCE / NO EMBEDDING MATCHES: Fall back to keyword-only matching
  // This ensures auto-reply works even when embeddings produce low scores
  // (e.g. on Vercel where the fast hash-based embedding is less precise than full ONNX).
  console.log(`[RAG] Trying keyword fallback for "${commentText.slice(0, 60)}" (${faqs.length} FAQs available)`);
  const commentLower = commentText.toLowerCase();
  const commentWords = commentLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);

  for (const faq of faqs) {
    // Check if any FAQ keyword appears in the comment
    const faqKeywords = (faq.keywords || []).map(k => k.toLowerCase());
    const keywordMatch = faqKeywords.some(kw => commentLower.includes(kw));

    // Check significant word overlap between comment and FAQ question/answer
    const qWords = faq.question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
    const aWords = faq.answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const allFaqWords = [...new Set([...qWords, ...aWords])];
    const wordOverlap = allFaqWords.filter(w => commentWords.includes(w)).length;

    // Relative overlap ratios against question words and comment words
    const questionOverlap = qWords.filter(w => commentWords.includes(w)).length;
    const questionOverlapRatio = qWords.length > 0 ? questionOverlap / qWords.length : 0;
    const commentOverlapRatio = commentWords.length > 0 ? wordOverlap / commentWords.length : 0;

    // Detect general question intent anywhere in string
    const isQuestion = commentLower.includes("?") || /\b(what|how|when|where|who|why|can|does|is|are|do|did|will|team|price|cost|info|help|know|tell|about|support)\b/.test(commentLower);
    const topicOverlap = allFaqWords.some(w => commentLower.includes(w) && w.length > 3);

    if (keywordMatch || questionOverlapRatio >= 0.20 || commentOverlapRatio >= 0.20 || wordOverlap >= 2 || (isQuestion && topicOverlap)) {
      const keywordScore = keywordMatch ? 0.35 : 0.28;
      const replyText = personalizeRAGReply(faq.answer, commenterName, channelName, faq.question);
      return {
        replyText,
        confidence: keywordScore,
        matchSource: "faq_hybrid" as const,
        matchedFAQId: faq.id,
        matchedChunks: [{ id: faq.id, score: keywordScore, source: "keyword_fallback" }],
        intent,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // No match at all — skip (don't reply)
  return null;
}

/**
 * Generate a natural reply grounded in FAQ context using Claude.
 * Used when RAG confidence is medium (0.25-0.40) — the FAQ is
 * relevant but not a perfect match, so we use LLM to adapt it.
 */
async function generateFAQGroundedReply(
  commentText: string,
  faqMatch: MatchResult,
  commenterName: string,
  channelName: string,
  alternativeMatches: MatchResult[]
): Promise<string | null> {
  const client = getAIClient();
  if (!client) {
    // No LLM available — fall back to direct FAQ answer
    return personalizeRAGReply(
      faqMatch.answer,
      commenterName,
      channelName,
      faqMatch.question
    );
  }

  const altContext = alternativeMatches.length > 0
    ? `\nAdditional relevant FAQs:\n${alternativeMatches.map((m, i) => `[${i + 1}] Q: ${m.question}\nA: ${m.answer}`).join("\n\n")}`
    : "";

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 200,
      system: `You are a YouTube community manager for ${channelName}. A viewer has left a comment.
We found a FAQ that may be relevant. Your task:
1. Read the FAQ answer carefully
2. Adapt it to directly address the commenter's specific question
3. Be friendly, concise, and helpful (under 150 characters when possible)
4. If the FAQ only partially addresses the comment, acknowledge what you can help with
5. NEVER fabricate information not in the FAQ
6. Do NOT reveal you are AI or automated
7. Use a warm, conversational tone`,
      messages: [
        {
          role: "user",
          content: `Commenter: ${commenterName}\nComment: "${commentText}"

Best matching FAQ:
Q: ${faqMatch.question}
A: ${faqMatch.answer}
${altContext}

Generate ONLY the reply text, nothing else.`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : null;

    if (text) {
      return text.replace(/^["']|["']$/g, "").replace(/\*\*/g, "").trim();
    }
  } catch (err) {
    console.error("[RAG] FAQ-grounded generation failed:", err);
  }

  // Fallback: return the raw FAQ answer personalized
  return personalizeRAGReply(
    faqMatch.answer,
    commenterName,
    channelName,
    faqMatch.question
  );
}

/**
 * Sync & Re-index a user's FAQs into the vector database.
 * Call this after creating, editing, or importing FAQs.
 */
export async function syncFAQIndex(userEmail: string, faqs: FAQEntry[]) {
  return await indexUserFAQs(userEmail, faqs);
}
