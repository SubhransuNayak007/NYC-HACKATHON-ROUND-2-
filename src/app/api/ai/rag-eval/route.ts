/**
 * ============================================================================
 *  QuickReply — Enterprise RAG Evaluation & Diagnostics API
 *  src/app/api/ai/rag-eval/route.ts
 *
 *  POST /api/ai/rag-eval
 *  Allows testing and evaluating the Enterprise ML RAG Stack:
 *  - Data Ingestion (PDF / HTML / FAQs)
 *  - Embedding Model Diagnostics (Sentence-Transformers / OpenAI / Cohere)
 *  - Vector Store Hybrid Search (Pinecone / Qdrant / Weaviate / Chroma / HNSW)
 *  - LLM Inference (OpenAI / Anthropic / Ollama / Llama.cpp)
 *  - Observability Metrics (Ragas / TruLens / LangSmith Triad)
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import {
  executeEnterpriseRAG,
  ingestFAQEntries,
  ingestHTMLDocument,
  enterpriseVectorStore,
} from "@/backend/enterprise_rag";
import { getEmbeddingDiagnostics } from "@/backend/embeddings";

export async function GET(req: NextRequest) {
  try {
    const diag = await getEmbeddingDiagnostics();
    return NextResponse.json({
      status: "active",
      architecture: "Enterprise ML RAG (LangChain + Transformers + Hybrid Vector DB)",
      embeddings: {
        model: diag.activeModel,
        provider: diag.provider,
        dimensions: diag.dimensions,
        cacheSize: diag.cacheSize,
        localModelLoaded: diag.localModelLoaded,
      },
      vectorStore: {
        supportedAdapters: [
          "Pinecone",
          "Qdrant",
          "Weaviate",
          "ChromaDB",
          "Pgvector",
          "Local HNSW (In-Memory)",
        ],
        activeAdapter: process.env.PINECONE_API_KEY
          ? "Pinecone Cloud Vector Database"
          : process.env.QDRANT_URL
          ? "Qdrant Vector Engine"
          : "Local HNSW Vector Index (In-Memory / File-backed)",
        retrievalMethod: "Reciprocal Rank Fusion (RRF) — Dense Neural Cosine + Sparse BM25 Keyword",
      },
      llmInference: {
        supportedProviders: [
          "OpenAI API (gpt-4o / gpt-4o-mini)",
          "Anthropic API (claude-3-5-sonnet)",
          "Ollama Local REST API (http://localhost:11434)",
          "Llama.cpp Local Server (http://localhost:8080)",
        ],
        defaultProvider: process.env.OPENAI_API_KEY
          ? "OpenAI API"
          : process.env.ANTHROPIC_API_KEY
          ? "Anthropic API"
          : process.env.OLLAMA_URL
          ? "Ollama Local REST"
          : "OpenAI API",
      },
      observability: {
        frameworks: ["Ragas", "TruLens", "Phoenix", "LangSmith Tracing"],
        metricsComputed: [
          "Context Relevance (0-100%)",
          "Groundedness / Faithfulness (0-100%)",
          "Answer Relevance (0-100%)",
          "Overall RAG Quality Grade (A+, A, B, C, F)",
        ],
        langSmithTracingEnabled:
          process.env.LANGCHAIN_TRACING_V2 === "true" || Boolean(process.env.LANGSMITH_API_KEY),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      commentText = "What is your return policy and do you offer refunds?",
      commenterName = "Sarah",
      channelName = "QuickReply Official",
      minConfidence = 0.15,
      ingestSampleHtml = false,
      customHtml = "",
      faqs: clientFaqs = null,
    } = body;

    const db = await getDB();
    const userEmail = db.userSession?.email || "default_user";
    
    // Merge client-provided FAQs (e.g. from localStorage) with server FAQs, or fallback to default sample FAQs
    const teamRuthlessFaq = {
      id: "team_ruthless_faq",
      question: "What is your team name? Who built this project?",
      answer: "Our team is Team Ruthless.",
      keywords: ["team", "ruthless", "name", "who", "built", "quickreply", "channel", "bro", "creators", "hackathon"],
      category: "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let combinedFaqs = (clientFaqs && clientFaqs.length > 0)
      ? clientFaqs
      : (db.faqs && db.faqs.length > 0)
      ? db.faqs
      : [
          {
            id: "default_1",
            question: "What is your return policy?",
            answer: "We offer 30-day no-questions-asked returns and full refunds on all QuickReply plans.",
            keywords: ["return", "refund", "policy", "guarantee"],
            category: "returns",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          teamRuthlessFaq,
          {
            id: "default_3",
            question: "How does the RAG system work?",
            answer: "QuickReply uses LangChain chunking and Sentence-Transformers neural embeddings with Reciprocal Rank Fusion.",
            keywords: ["rag", "ai", "how", "work", "system"],
            category: "technical",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

    // Ensure Team Ruthless FAQ is present in knowledge base even if custom FAQs were loaded
    if (!combinedFaqs.some((f: any) => String(f.answer || "").toLowerCase().includes("ruthless") || String(f.question || "").toLowerCase().includes("team name"))) {
      combinedFaqs = [teamRuthlessFaq, ...combinedFaqs];
    }

    // 1. Ingest FAQs into Enterprise Vector Store
    const faqChunks = await ingestFAQEntries(combinedFaqs, userEmail);
    await enterpriseVectorStore.upsert(userEmail, faqChunks);

    // 2. Optional HTML Web Page ingestion test
    if (ingestSampleHtml || customHtml) {
      const htmlToIngest =
        customHtml ||
        `<article><h1>Shipping & Refund Policy</h1><p>We offer a 30-day money-back guarantee on all QuickReply subscription plans. If you are not satisfied within 30 days, contact support for a full refund. Shipping for hardware is free worldwide.</p></article>`;
      const htmlChunks = await ingestHTMLDocument(
        htmlToIngest,
        "policy_doc",
        "policy",
        ["refund", "policy", "shipping", "guarantee"]
      );
      faqChunks.push(...htmlChunks);
      await enterpriseVectorStore.upsert(userEmail, faqChunks);
    }

    // 3. Execute Enterprise RAG (with 0.15 threshold so eval testing always grades the closest chunk)
    const ragResult = await executeEnterpriseRAG(
      commentText,
      userEmail,
      commenterName,
      channelName,
      minConfidence
    );

    const diag = await getEmbeddingDiagnostics();

    return NextResponse.json({
      success: true,
      query: {
        commentText,
        commenterName,
        channelName,
      },
      retrieval: {
        totalIndexedChunks: faqChunks.length,
        embeddingModel: diag.activeModel,
        embeddingDimensions: diag.dimensions,
        provider: diag.provider,
        matchedChunks: ragResult?.matchedChunks || [],
      },
      inference: {
        provider: ragResult?.inference?.provider || "Local Context Grounding",
        model: ragResult?.inference?.model || "Extracted RAG Chunk",
        generatedReply: ragResult?.replyText || "No matching FAQ found above threshold.",
      },
      evaluationTriad: ragResult?.evalMetrics || {
        contextRelevance: 0,
        faithfulness: 0,
        answerRelevance: 0,
        overallGrade: "F",
        traceId: "no-match",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
