/**
 * Vector Store for Quick Reply — Pinecone Integration
 *
 * Replaces the TF-IDF RAG engine with real vector embeddings
 * for semantic search. Uses OpenAI-compatible embeddings via
 * Pinecone for scalable, fast similarity search.
 *
 * Architecture:
 * 1. FAQ entries are embedded and stored in Pinecone
 * 2. Incoming comments are embedded in real-time
 * 3. Cosine similarity search finds the best matching FAQ
 * 4. Falls back to local TF-IDF when Pinecone is not configured
 *
 * Supports:
 * - Pinecone (primary)
 * - Local MongoDB vector search (fallback)
 * - TF-IDF (legacy fallback)
 */

import { Pinecone } from "@pinecone-database/pinecone";

// --- Configuration ---

const PINECONE_INDEX_NAME = "quick-reply-faqs";
const EMBEDDING_DIMENSION = 1536; // OpenAI text-embedding-3-small

let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;

/**
 * Get or create the Pinecone client.
 */
function getPinecone(): Pinecone | null {
  if (pineconeClient) return pineconeClient;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    return null; // Graceful fallback
  }

  try {
    pineconeClient = new Pinecone({ apiKey });
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
    console.log("[VectorStore] Pinecone connected");
    return pineconeClient;
  } catch (err) {
    console.error("[VectorStore] Failed to initialize Pinecone:", err);
    return null;
  }
}

// --- Embedding Generation ---

/**
 * Generate an embedding vector for text using OpenAI-compatible API.
 * Uses text-embedding-3-small for cost-effective, high-quality embeddings.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;
  const baseUrl = process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or EMBEDDING_API_KEY required for vector embeddings");
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text.substring(0, 8000), // Truncate to avoid token limits
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 */
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;
  const baseUrl = process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or EMBEDDING_API_KEY required for vector embeddings");
  }

  // Batch in groups of 20 (API limit)
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.substring(0, 8000));

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: batch,
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch embedding error: ${response.status}`);
    }

    const data = await response.json();
    allEmbeddings.push(...data.data.map((d: any) => d.embedding));
  }

  return allEmbeddings;
}

// --- Vector Store Operations ---

export interface VectorMatch {
  faqId: string;
  question: string;
  answer: string;
  confidence: number;
  category: string;
}

/**
 * Upsert FAQ embeddings into Pinecone.
 * Called when FAQs are created or updated.
 */
export async function upsertFAQEmbeddings(
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    keywords: string[];
    category: string;
    userId: string;
  }>
): Promise<{ upserted: number; errors: number }> {
  const pinecone = getPinecone();
  if (!pinecone || !pineconeIndex) {
    console.log("[VectorStore] Pinecone not available — skipping embedding upsert");
    return { upserted: 0, errors: 0 };
  }

  if (faqs.length === 0) return { upserted: 0, errors: 0 };

  try {
    // Build text to embed: question + keywords + answer
    const texts = faqs.map(
      (faq) =>
        `${faq.question} ${faq.keywords.join(" ")} ${faq.answer}`.substring(0, 8000)
    );

    const embeddings = await generateBatchEmbeddings(texts);

    // Upsert to Pinecone
    const vectors = faqs.map((faq, i) => ({
      id: `${faq.userId}_${faq.id}`,
      values: embeddings[i],
      metadata: {
        faqId: faq.id,
        userId: faq.userId,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        keywords: faq.keywords.join(","),
      },
    }));

    // Upsert in batches of 100
    for (let i = 0; i < vectors.length; i += 100) {
      await pineconeIndex.upsert(vectors.slice(i, i + 100));
    }

    console.log(`[VectorStore] Upserted ${faqs.length} FAQ embeddings`);
    return { upserted: faqs.length, errors: 0 };
  } catch (err) {
    console.error("[VectorStore] Upsert error:", err);
    return { upserted: 0, errors: faqs.length };
  }
}

/**
 * Delete FAQ embeddings from Pinecone.
 */
export async function deleteFAQEmbeddings(
  userId: string,
  faqIds: string[]
): Promise<void> {
  const pinecone = getPinecone();
  if (!pinecone || !pineconeIndex) return;

  try {
    const ids = faqIds.map((id) => `${userId}_${id}`);
    await pineconeIndex.deleteMany(ids);
    console.log(`[VectorStore] Deleted ${ids.length} FAQ embeddings`);
  } catch (err) {
    console.error("[VectorStore] Delete error:", err);
  }
}

/**
 * Search for similar FAQs using vector similarity.
 * Returns the top-K most similar FAQ entries.
 */
export async function searchFAQs(
  query: string,
  userId: string,
  topK: number = 5,
  minConfidence: number = 0.35
): Promise<VectorMatch[]> {
  const pinecone = getPinecone();
  if (!pinecone || !pineconeIndex) {
    return []; // Will fall back to TF-IDF
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const results = await pineconeIndex.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: { userId },
    });

    return results.matches
      .filter((match: any) => match.score >= minConfidence)
      .map((match: any) => ({
        faqId: match.metadata.faqId,
        question: match.metadata.question,
        answer: match.metadata.answer,
        confidence: parseFloat(match.score.toFixed(4)),
        category: match.metadata.category,
      }));
  } catch (err) {
    console.error("[VectorStore] Search error:", err);
    return [];
  }
}

// --- Hybrid Search (Vector + Keyword) ---

/**
 * Perform hybrid search: vector similarity + keyword matching.
 * Combines both signals for better accuracy.
 */
export async function hybridSearch(
  query: string,
  userId: string,
  faqs: Array<{ id: string; question: string; answer: string; keywords: string[]; category: string }>,
  topK: number = 5,
  minConfidence: number = 0.35
): Promise<VectorMatch[]> {
  // Try vector search first
  const vectorResults = await searchFAQs(query, userId, topK, minConfidence * 0.7);

  // Keyword matching fallback/supplement
  const queryLower = query.toLowerCase();
  const keywordMatches: VectorMatch[] = faqs
    .map((faq) => {
      const keywordHits = faq.keywords.filter((kw) =>
        queryLower.includes(kw.toLowerCase())
      );
      const questionMatch = faq.question.toLowerCase().includes(queryLower) ? 0.3 : 0;
      const confidence = Math.min(keywordHits.length * 0.15 + questionMatch, 1.0);

      return {
        faqId: faq.id,
        question: faq.question,
        answer: faq.answer,
        confidence: parseFloat(confidence.toFixed(4)),
        category: faq.category,
      };
    })
    .filter((m) => m.confidence >= minConfidence);

  // Merge and deduplicate results
  const allMatches = new Map<string, VectorMatch>();

  for (const match of vectorResults) {
    allMatches.set(match.faqId, match);
  }

  for (const match of keywordMatches) {
    const existing = allMatches.get(match.faqId);
    if (!existing || match.confidence > existing.confidence) {
      // Boost combined score if both vector and keyword match
      const vectorScore = existing?.confidence || 0;
      const keywordScore = match.confidence;
      const combinedScore = Math.min(
        vectorScore + keywordScore * 0.3 + (vectorScore > 0 && keywordScore > 0 ? 0.15 : 0),
        1.0
      );
      allMatches.set(match.faqId, {
        ...match,
        confidence: parseFloat(combinedScore.toFixed(4)),
      });
    }
  }

  return Array.from(allMatches.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topK);
}

// --- Health Check ---

/**
 * Check vector store connectivity.
 */
export async function vectorStoreHealth(): Promise<{
  pinecone: boolean;
  embeddings: boolean;
  indexStats?: any;
}> {
  const pinecone = getPinecone();
  let pineconeOk = false;
  let indexStats = null;

  if (pinecone && pineconeIndex) {
    try {
      indexStats = await pineconeIndex.describeIndexStats();
      pineconeOk = true;
    } catch {
      pineconeOk = false;
    }
  }

  // Check embedding API
  let embeddingsOk = false;
  const apiKey = process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;
  if (apiKey) {
    try {
      await generateEmbedding("health check");
      embeddingsOk = true;
    } catch {
      embeddingsOk = false;
    }
  }

  return {
    pinecone: pineconeOk,
    embeddings: embeddingsOk,
    indexStats,
  };
}
