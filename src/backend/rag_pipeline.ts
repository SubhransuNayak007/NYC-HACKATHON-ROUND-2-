/**
 * ============================================================================
 *  QuickReply — Enterprise RAG Pipeline (LangChain + Neural Vector Index)
 *  src/backend/rag_pipeline.ts
 *
 *  Architecture:
 *   1. LangChain Document Chunking (@langchain/textsplitters)
 *   2. Neural Vector Embeddings (@xenova/transformers / OpenAI)
 *   3. Hybrid Retrieval:
 *      - Dense Semantic Vector Similarity (Cosine on 384-dim/1536-dim embeddings)
 *      - Sparse BM25 / Keyword Match
 *      - Reciprocal Rank Fusion (RRF) & Re-ranking
 *   4. Pinecone Vector DB integration + Fast Local Vector Index fallback
 * ============================================================================
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  generateTextEmbedding,
  generateBatchTextEmbeddings,
  cosineSimilarityDense,
  getEmbeddingDiagnostics,
} from "./embeddings";
import { FAQEntry } from "./rag";
import { ExpandedQueries, RAGSearchResult } from "./rag_types";
import Anthropic from "@anthropic-ai/sdk";

// --- Types ---
export interface RAGChunkMetadata {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  chunkIndex: number;
  totalChunks: number;
}

export interface VectorDocument {
  id: string;
  text: string;
  vector: number[];
  metadata: RAGChunkMetadata;
}

export interface HybridMatchResult {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  confidence: number;          // Combined RRF score (0.0 - 1.0)
  denseScore: number;          // Semantic vector cosine score
  sparseScore: number;         // BM25 / Keyword score
  matchedChunkText: string;
}

// In-memory Vector Index for blazing-fast local retrieval (synced with Pinecone when configured)
const localVectorIndex = new Map<string, VectorDocument[]>(); // keyed by user email / namespace

// --- Multi-Query Expansion ---
// Uses Claude Haiku to generate query variations for better FAQ retrieval

let _expansionClient: Anthropic | null = null;
function getExpansionClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_expansionClient) _expansionClient = new Anthropic({ apiKey });
  return _expansionClient;
}

/**
 * Expand a comment query into multiple variations for better FAQ retrieval.
 * This helps catch FAQ matches that a single query would miss.
 *
 * Example: "how to get my money back" → ["refund policy", "return for refund", "money back guarantee"]
 */
export async function expandQuery(
  commentText: string,
  videoTitle?: string
): Promise<ExpandedQueries> {
  const client = getExpansionClient();
  if (!client) {
    return { originalQuery: commentText, variations: [], intent: "question" };
  }

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 200,
      system: `You are a search query optimizer. Given a YouTube comment, generate 3 search queries that could match knowledge base FAQ entries.

Rules:
1. First query: Direct reformulation of the question/request
2. Second query: Broader topic-level query capturing the underlying need
3. Third query: Specific query assuming common terminology the FAQ might use

Return ONLY a JSON object: {"variations": ["query1", "query2", "query3"]}
No other text.`,
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
        ? response.content[0].text.trim()
        : "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        originalQuery: commentText,
        variations: Array.isArray(parsed.variations)
          ? parsed.variations.slice(0, 3)
          : [],
        intent: "question",
      };
    }
  } catch (err) {
    console.error("[RAG] Query expansion failed:", err);
  }

  return { originalQuery: commentText, variations: [], intent: "question" };
}

/**
 * Hybrid search using Reciprocal Rank Fusion (RRF) across multiple query variations.
 * This is the enhanced search that uses multi-query expansion for better recall.
 */
export async function searchHybridRAGMultiQuery(
  expanded: ExpandedQueries,
  userEmail: string,
  faqs: FAQEntry[],
  topK: number = 3,
  minConfidence: number = 0.38
): Promise<HybridMatchResult[]> {
  // Fallback: if no query variations (no ANTHROPIC_API_KEY), use single-query search
  if (!expanded.variations || expanded.variations.length === 0) {
    return searchHybridRAG(expanded.originalQuery, userEmail, faqs, topK, minConfidence);
  }

  // Collect all queries to search with
  const allQueries = [expanded.originalQuery, ...expanded.variations];

  // Ensure index is built
  let docs = localVectorIndex.get(userEmail);
  if (!docs || docs.length === 0) {
    await indexUserFAQs(userEmail, faqs);
    docs = localVectorIndex.get(userEmail) || [];
  }
  if (docs.length === 0) return [];

  // Embed all query vectors
  const queryVectors = await Promise.all(
    allQueries.map(async (q) => {
      const { vector } = await generateTextEmbedding(q);
      return { query: q, vector };
    })
  );

  // Score each chunk against ALL query vectors using RRF
  const chunkScores = new Map<
    string,
    { doc: VectorDocument; rrfScore: number; denseScore: number; sparseScore: number }
  >();

  for (const { vector: queryVector, query } of queryVectors) {
    const scored = docs.map((doc) => {
      const denseScore = cosineSimilarityDense(queryVector, doc.vector);
      const sparseScore = calculateSparseKeywordScore(query, doc.metadata);
      let combined = denseScore * 0.7 + sparseScore * 0.3;
      if (sparseScore > 0.4) combined = Math.min(combined + 0.12, 1.0);
      return { doc, denseScore, sparseScore, combinedScore: combined };
    });

    // Rank chunks and apply RRF: score += 1/(k + rank)
    const k = 60; // RRF constant
    const ranked = scored.sort((a, b) => b.combinedScore - a.combinedScore);

    ranked.forEach((item, rank) => {
      const existing = chunkScores.get(item.doc.id);
      const rrfContribution = 1 / (k + rank + 1);

      if (existing) {
        existing.rrfScore += rrfContribution;
        // Keep best dense/sparse scores
        existing.denseScore = Math.max(existing.denseScore, item.denseScore);
        existing.sparseScore = Math.max(existing.sparseScore, item.sparseScore);
      } else {
        chunkScores.set(item.doc.id, {
          doc: item.doc,
          rrfScore: rrfContribution,
          denseScore: item.denseScore,
          sparseScore: item.sparseScore,
        });
      }
    });
  }

  // Aggregate by FAQ ID and filter
  const faqScores = new Map<string, typeof chunkScores extends Map<string, infer V> ? V : never>();
  for (const [_, entry] of chunkScores) {
    const faqId = entry.doc.metadata.faqId;
    const existing = faqScores.get(faqId);
    if (!existing || entry.rrfScore > existing.rrfScore) {
      faqScores.set(faqId, entry);
    }
  }

  const matches: HybridMatchResult[] = Array.from(faqScores.values())
    .filter((item) => item.rrfScore >= minConfidence * 0.5) // Lower initial threshold for multi-query
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((item) => ({
      faqId: item.doc.metadata.faqId,
      question: item.doc.metadata.question,
      answer: item.doc.metadata.answer,
      category: item.doc.metadata.category,
      confidence: parseFloat(item.rrfScore.toFixed(4)),
      denseScore: parseFloat(item.denseScore.toFixed(4)),
      sparseScore: parseFloat(item.sparseScore.toFixed(4)),
      matchedChunkText: item.doc.text,
    }));

  return matches.slice(0, topK);
}

/**
 * Split FAQ entries into semantic chunks using LangChain's RecursiveCharacterTextSplitter.
 */
export async function chunkFAQsWithLangChain(
  faqs: FAQEntry[]
): Promise<Array<{ text: string; metadata: RAGChunkMetadata }>> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 75,
    separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
  });

  const allChunks: Array<{ text: string; metadata: RAGChunkMetadata }> = [];

  for (const faq of faqs) {
    // Combine question, keywords, and answer for rich semantic context
    const fullText = `Question: ${faq.question}\nKeywords: ${faq.keywords.join(", ")}\nAnswer: ${faq.answer}`;
    const docs = await splitter.createDocuments([fullText]);

    docs.forEach((doc, idx) => {
      allChunks.push({
        text: doc.pageContent,
        metadata: {
          faqId: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category || "general",
          keywords: faq.keywords || [],
          chunkIndex: idx,
          totalChunks: docs.length,
        },
      });
    });
  }

  return allChunks;
}

/**
 * Index a user's FAQs into the Local Vector Database (and Pinecone if configured).
 */
export async function indexUserFAQs(
  userEmail: string,
  faqs: FAQEntry[]
): Promise<{ indexedChunks: number; dimensions: number; provider: string }> {
  if (!faqs || faqs.length === 0) {
    localVectorIndex.set(userEmail, []);
    const diag = await getEmbeddingDiagnostics();
    return { indexedChunks: 0, dimensions: diag.dimensions, provider: diag.provider };
  }

  // 1. Chunk documents using LangChain
  const chunks = await chunkFAQsWithLangChain(faqs);

  // 2. Generate dense neural embeddings in batch
  const chunkTexts = chunks.map((c) => c.text);
  const vectors = await generateBatchTextEmbeddings(chunkTexts);

  // 3. Build indexed documents
  const indexedDocs: VectorDocument[] = chunks.map((c, i) => ({
    id: `${userEmail}_${c.metadata.faqId}_chunk_${i}`,
    text: c.text,
    vector: vectors[i],
    metadata: c.metadata,
  }));

  // 4. Store in fast local vector index
  localVectorIndex.set(userEmail, indexedDocs);

  // 5. Optionally sync to Pinecone in background
  syncToPineconeBackground(userEmail, indexedDocs).catch(() => {});

  const diag = await getEmbeddingDiagnostics();
  return {
    indexedChunks: indexedDocs.length,
    dimensions: diag.dimensions,
    provider: diag.provider,
  };
}

/**
 * Calculate BM25-like sparse keyword similarity between query and FAQ metadata.
 */
function calculateSparseKeywordScore(query: string, metadata: RAGChunkMetadata): number {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryWords.length === 0) return 0;

  let hits = 0;
  // Check keywords array
  for (const kw of metadata.keywords) {
    if (queryLower.includes(kw.toLowerCase())) {
      hits += 2; // Extra weight for explicit FAQ keywords
    }
  }

  // Check question words
  const qWords = metadata.question.toLowerCase().split(/\s+/);
  for (const qw of qWords) {
    if (queryWords.includes(qw)) hits += 1;
  }

  const maxPossible = Math.max(queryWords.length * 2, 4);
  return Math.min(hits / maxPossible, 1.0);
}

/**
 * Hybrid Vector Search using Reciprocal Rank Fusion (RRF).
 * Combines Dense Neural Embeddings (Cosine Similarity) with Sparse BM25 Keyword match.
 */
export async function searchHybridRAG(
  query: string,
  userEmail: string,
  faqs: FAQEntry[],
  topK: number = 3,
  minConfidence: number = 0.38
): Promise<HybridMatchResult[]> {
  if (!faqs || faqs.length === 0 || !query.trim()) return [];

  // Ensure user's FAQs are indexed
  let docs = localVectorIndex.get(userEmail);
  if (!docs || docs.length === 0) {
    await indexUserFAQs(userEmail, faqs);
    docs = localVectorIndex.get(userEmail) || [];
  }
  if (docs.length === 0) return [];

  // 1. Embed query vector
  const { vector: queryVector } = await generateTextEmbedding(query);

  // 2. Score each chunk (Dense + Sparse)
  const scoredChunks = docs.map((doc) => {
    const denseScore = cosineSimilarityDense(queryVector, doc.vector);
    const sparseScore = calculateSparseKeywordScore(query, doc.metadata);

    // Hybrid Reciprocal Rank Fusion (RRF) & linear weighting
    // Dense semantic similarity is weighted at 70%, explicit keyword matches at 30%
    let combinedScore = denseScore * 0.7 + sparseScore * 0.3;

    // Boost if exact keyword match occurs
    if (sparseScore > 0.4) {
      combinedScore = Math.min(combinedScore + 0.12, 1.0);
    }

    return {
      doc,
      denseScore: parseFloat(denseScore.toFixed(4)),
      sparseScore: parseFloat(sparseScore.toFixed(4)),
      combinedScore: parseFloat(combinedScore.toFixed(4)),
    };
  });

  // 3. Aggregate chunks by FAQ ID (take the best matching chunk for each FAQ)
  const faqScores = new Map<string, typeof scoredChunks[0]>();
  for (const item of scoredChunks) {
    const faqId = item.doc.metadata.faqId;
    const existing = faqScores.get(faqId);
    if (!existing || item.combinedScore > existing.combinedScore) {
      faqScores.set(faqId, item);
    }
  }

  // 4. Filter by minimum confidence threshold and sort descending
  const matches: HybridMatchResult[] = Array.from(faqScores.values())
    .filter((item) => item.combinedScore >= minConfidence)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .map((item) => ({
      faqId: item.doc.metadata.faqId,
      question: item.doc.metadata.question,
      answer: item.doc.metadata.answer,
      category: item.doc.metadata.category,
      confidence: item.combinedScore,
      denseScore: item.denseScore,
      sparseScore: item.sparseScore,
      matchedChunkText: item.doc.text,
    }));

  return matches.slice(0, topK);
}

/**
 * Personalize a generated RAG reply by replacing template tags.
 */
export function personalizeRAGReply(
  answerTemplate: string,
  commenterName: string,
  channelName: string,
  question: string = ""
): string {
  return answerTemplate
    .replace(/\{\{commenter_name\}\}/g, commenterName || "there")
    .replace(/\{\{channel_name\}\}/g, channelName || "our channel")
    .replace(/\{\{reply_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{question\}\}/g, question);
}

/**
 * End-to-End Enterprise RAG Pipeline Test & Diagnostic helper.
 */
export async function testRAGPipeline(
  query: string,
  userEmail: string,
  faqs: FAQEntry[],
  commenterName: string = "Alex",
  channelName: string = "QuickReply Official"
): Promise<{
  success: boolean;
  query: string;
  bestMatch: HybridMatchResult | null;
  reply: string | null;
  allMatches: HybridMatchResult[];
  diagnostics: {
    activeModel: string;
    provider: string;
    dimensions: number;
    indexedChunks: number;
  };
}> {
  const matches = await searchHybridRAG(query, userEmail, faqs, 3, 0.30);
  const best = matches.length > 0 ? matches[0] : null;
  const reply = best
    ? personalizeRAGReply(best.answer, commenterName, channelName, best.question)
    : null;

  const diag = await getEmbeddingDiagnostics();
  const chunks = localVectorIndex.get(userEmail) || [];

  return {
    success: Boolean(best),
    query,
    bestMatch: best,
    reply,
    allMatches: matches,
    diagnostics: {
      activeModel: diag.activeModel,
      provider: diag.provider,
      dimensions: diag.dimensions,
      indexedChunks: chunks.length,
    },
  };
}

/**
 * Optional background sync to Pinecone vector DB if PINECONE_API_KEY is present.
 */
async function syncToPineconeBackground(
  userEmail: string,
  docs: VectorDocument[]
): Promise<void> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey || docs.length === 0) return;

  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const client = new Pinecone({ apiKey });
    const index = client.index("quick-reply-faqs");

    const vectors = docs.map((d) => ({
      id: d.id,
      values: d.vector,
      metadata: {
        faqId: d.metadata.faqId,
        question: d.metadata.question,
        answer: d.metadata.answer,
        category: d.metadata.category,
        keywords: d.metadata.keywords.join(","),
        userEmail,
      },
    }));

    // Batch upsert 100 at a time
    for (let i = 0; i < vectors.length; i += 100) {
      await (index.upsert as any)(vectors.slice(i, i + 100));
    }
  } catch (err) {
    // Suppress error in background sync — local vector index handles search
  }
}
