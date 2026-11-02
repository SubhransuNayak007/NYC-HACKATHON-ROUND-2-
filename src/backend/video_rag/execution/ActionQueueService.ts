/**
 * ============================================================================
 * QuickReply — Video-Aware RAG Action Queue & Master Orchestration Service
 * src/backend/video_rag/execution/ActionQueueService.ts
 *
 * Orchestrates the full 12-stage selective decision pipeline:
 * Video Profile -> Ingestion -> Comment Understanding -> Reply-Worthiness ->
 * Knowledge Fusion -> Style Safety -> Generation -> Grounding -> Execution Trace
 * ============================================================================
 */

import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB } from "@/database/db";
import {
  CommentDecisionTrace,
  VideoRAGConfig,
  VideoContentProfile,
} from "../types";
import { VideoIngestionService } from "../services/VideoIngestionService";
import { CommentUnderstandingService } from "../intelligence/CommentUnderstandingService";
import { KnowledgeFusionService } from "../fusion/KnowledgeFusionService";
import { ReplyWorthinessService } from "../intelligence/ReplyWorthinessService";
import { StyleService } from "../style/StyleService";
import { GroundedResponseGenerator } from "../generation/GroundedResponseGenerator";
import { GroundingVerificationService } from "../generation/GroundingVerificationService";

export class ActionQueueService {
  /**
   * Process an incoming comment through the entire 12-stage Video RAG Pipeline
   */
  static async processComment(params: {
    commentId: string;
    videoId: string;
    channelId?: string;
    author: string;
    authorSubscribers?: string;
    text: string;
    parentCommentId?: string;
    videoTitle?: string;
    tenantId?: string;
  }): Promise<CommentDecisionTrace> {
    const startTime = Date.now();
    const tenantId = params.tenantId || "default_user";

    // 1. Get or Create Video Content Profile
    let profile = await VideoIngestionService.getContentProfile(params.videoId, tenantId);
    if (!profile) {
      profile = await VideoIngestionService.processVideo({
        videoId: params.videoId,
        title: params.videoTitle || `Video ${params.videoId}`,
        tenantId,
      });
    }

    // 2. Get Video RAG Configuration
    const config = await VideoIngestionService.getVideoRAGConfig(params.videoId, tenantId);

    // 3. Comment Understanding & Multi-Label Intent Extraction
    const understanding = CommentUnderstandingService.analyzeComment({
      commentId: params.commentId,
      text: params.text,
      author: params.author,
      authorSubscribers: params.authorSubscribers,
      parentCommentId: params.parentCommentId,
    });

    // 4. Multi-Source Knowledge Retrieval & Conflict Detection
    const db = await getDB(tenantId);
    const { chunks: retrievedKnowledge, conflict: knowledgeConflict } = KnowledgeFusionService.retrieveFusedKnowledge({
      query: params.text,
      profile,
      faqs: db.faqs || [],
      businessPolicies: [
        { id: "pol_1", rule: "Warranty Policy", content: "All products come with a verified 2-year warranty coverage." },
        { id: "pol_2", rule: "Shipping Policy", content: "Free domestic shipping on all orders over ₹999 with 3-5 business day delivery." }
      ],
      customerMemory: [],
    });

    // 5. Selective Reply-Worthiness Decision
    const replyWorthiness = ReplyWorthinessService.evaluateReplyWorthiness({
      understanding,
      config,
      retrievedChunks: retrievedKnowledge,
    });

    // 6. Style Engine & Situation Safety Evaluation
    const styleEvaluation = StyleService.evaluateStyle({
      configuredStyle: config.style,
      understanding,
      config,
    });

    let generatedDraft: string | undefined;
    let groundingResult: any | undefined;
    let finalResponseText: string | undefined;
    let finalDecision = replyWorthiness.decision;
    let finalReason = replyWorthiness.explanation;
    let actionStatus: CommentDecisionTrace["actionStatus"] = "SKIPPED";
    let modelUsed = "classifier-rule-v2";

    // If decision is to REPLY: Proceed to Grounded Generation
    if (replyWorthiness.decision === "REPLY") {
      const genResult = await GroundedResponseGenerator.generateResponse({
        comment: understanding,
        profile,
        retrievedChunks: retrievedKnowledge,
        style: styleEvaluation.effectiveStyle,
        config,
      });

      generatedDraft = genResult.responseText;
      modelUsed = genResult.model;

      // Grounding Verification & Hallucination Guard
      groundingResult = GroundingVerificationService.verifyGrounding({
        generatedDraft,
        retrievedChunks: retrievedKnowledge,
        profile,
      });

      if (groundingResult.passed) {
        finalResponseText = generatedDraft;
        actionStatus = config.autoSend ? "SENT" : "DRAFTED";
      } else {
        finalDecision = "REVIEW";
        finalReason = `Grounding verification flagged: ${groundingResult.unsupportedClaims.join("; ")}`;
        actionStatus = "QUEUED_FOR_APPROVAL";
      }
    }

    const executionLatencyMs = Date.now() - startTime;

    // 7. Assemble Complete Explainability Trace
    const trace: CommentDecisionTrace = {
      id: `trace_${uuidv4().slice(0, 10)}`,
      commentId: params.commentId,
      videoId: params.videoId,
      channelId: params.channelId || "default_channel",
      author: params.author,
      commentText: params.text,
      timestamp: new Date().toISOString(),
      understanding,
      replyWorthiness,
      retrievedKnowledge,
      knowledgeConflict,
      styleEvaluation,
      generatedDraft,
      groundingResult,
      finalDecision,
      finalReason,
      finalResponseText,
      actionStatus,
      executionLatencyMs,
      costEstimateUSD: replyWorthiness.decision === "REPLY" ? 0.0008 : 0.00005,
      modelsUsed: {
        classifier: "intent-radar-v2",
        retrieval: "hybrid-bm25-vector",
        generator: modelUsed,
      },
    };

    // 8. Persist Trace into Database
    if (!db.commentDecisionTraces) db.commentDecisionTraces = [];
    db.commentDecisionTraces.unshift(trace);
    if (db.commentDecisionTraces.length > 500) {
      db.commentDecisionTraces = db.commentDecisionTraces.slice(0, 500);
    }
    await saveDB(db, tenantId);

    return trace;
  }
}
