/**
 * Cross-Encoder Re-ranker for Quick Reply RAG
 *
 * After initial hybrid search (dense + sparse) returns candidates,
 * this module uses Claude Haiku as a lightweight cross-encoder to
 * re-score each candidate for precision improvement.
 *
 * Only activates in the "uncertain" confidence range (0.25 - 0.65)
 * to balance accuracy vs. latency/cost.
 */

import Anthropic from "@anthropic-ai/sdk";
import { HybridMatchResult } from "./rag_pipeline";

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

export interface RerankResult {
  faqId: string;
  originalScore: number;
  rerankedScore: number;
}

/**
 * Re-rank candidate FAQ matches using Claude Haiku as a cross-encoder.
 *
 * @param query - The original comment text
 * @param candidates - Top candidates from initial hybrid search
 * @returns Re-scored candidates sorted by reranked score
 */
export async function rerankCandidates(
  query: string,
  candidates: HybridMatchResult[]
): Promise<RerankResult[]> {
  const client = getClient();
  if (!client || candidates.length === 0) {
    return candidates.map((c) => ({
      faqId: c.faqId,
      originalScore: c.confidence,
      rerankedScore: c.confidence,
    }));
  }

  // Process in batches of 5 to manage context window
  const BATCH_SIZE = 5;
  const allResults: RerankResult[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchResults = await rerankBatch(client, query, batch);
    allResults.push(...batchResults);
  }

  return allResults.sort((a, b) => b.rerankedScore - a.rerankedScore);
}

async function rerankBatch(
  client: Anthropic,
  query: string,
  batch: HybridMatchResult[]
): Promise<RerankResult[]> {
  const chunkList = batch
    .map(
      (c, idx) =>
        `[${idx}] FAQ ID: ${c.faqId}\nQuestion: ${c.question}\nAnswer: ${c.answer}`
    )
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 300,
      system: `You are a relevance scoring system. Given a user's YouTube comment and a set of FAQ entries from a knowledge base, assign a relevance score (0.0 to 1.0) to each FAQ.

Scoring criteria:
- 0.9-1.0: The FAQ directly answers the comment's question
- 0.7-0.89: The FAQ is highly relevant and can be adapted to answer
- 0.5-0.69: The FAQ is somewhat relevant but may not fully address the comment
- 0.3-0.49: The FAQ is tangentially related
- 0.0-0.29: The FAQ is irrelevant

Return ONLY a JSON array. No other text.
Example: [{"id": "faq_123", "score": 0.85}, {"id": "faq_456", "score": 0.42}]`,
      messages: [
        {
          role: "user",
          content: `Comment: "${query}"\n\nFAQs:\n${chunkList}`,
        },
      ],
    });

    const raw =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return batch.map((c) => ({
        faqId: c.faqId,
        originalScore: c.confidence,
        rerankedScore: c.confidence,
      }));
    }

    const scores: Array<{ id: string; score: number }> = JSON.parse(jsonMatch[0]);

    return batch.map((candidate) => {
      const match = scores.find((s) => s.id === candidate.faqId);
      return {
        faqId: candidate.faqId,
        originalScore: candidate.confidence,
        rerankedScore: match
          ? Math.min(1, Math.max(0, match.score))
          : candidate.confidence,
      };
    });
  } catch (err) {
    console.error("[Reranker] Batch reranking failed:", err);
    // Fallback: return original scores
    return batch.map((c) => ({
      faqId: c.faqId,
      originalScore: c.confidence,
      rerankedScore: c.confidence,
    }));
  }
}

/**
 * Merge reranked scores with original scores.
 * Formula: finalScore = original * 0.4 + reranked * 0.6
 * Returns candidates with an added `finalScore` property.
 */
export function mergeRerankedScores<T extends { faqId: string; confidence: number }>(
  candidates: T[],
  reranked: RerankResult[]
): (T & { finalScore: number })[] {
  return candidates.map((c) => {
    const rr = reranked.find((r) => r.faqId === c.faqId);
    if (!rr) return { ...c, finalScore: c.confidence };

    const finalScore = c.confidence * 0.4 + rr.rerankedScore * 0.6;
    return {
      ...c,
      finalScore: parseFloat(finalScore.toFixed(4)),
    };
  });
}
