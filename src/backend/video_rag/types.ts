/**
 * ============================================================================
 * QuickReply — Video-Aware RAG & Selective Reply Engine Data Contracts
 * src/backend/video_rag/types.ts
 * ============================================================================
 */

export type VideoRAGStatus =
  | "not_processed"
  | "processing"
  | "transcribing"
  | "understanding"
  | "indexing"
  | "ready"
  | "needs_reprocessing"
  | "failed";

export type ClaimCategory =
  | "FACT"
  | "OPINION"
  | "DEMONSTRATION"
  | "ESTIMATE"
  | "SPECULATION"
  | "EXPERIENCE"
  | "MARKETING_CLAIM"
  | "UNCERTAIN";

export type SourceAuthorityLevel = 100 | 95 | 85 | 60 | 30;

export type ResponseStyleType = "FUNNY" | "PROFESSIONAL" | "ROAST";

export type ReplyPolicyType =
  | "ONLY_GENUINE_CONCERNS"
  | "ONLY_QUESTIONS"
  | "QUESTIONS_AND_FEEDBACK"
  | "HIGH_VALUE_ONLY"
  | "ALL_ELIGIBLE";

export type CommentClassificationLabel =
  | "GENUINE_QUESTION"
  | "REAL_PROBLEM"
  | "USEFUL_FEEDBACK"
  | "PRODUCT_FEEDBACK"
  | "CORRECTION"
  | "CLARIFICATION"
  | "PURCHASE_INTENT"
  | "SUPPORT_REQUEST"
  | "CONSTRUCTIVE_CRITICISM"
  | "POSITIVE_FEEDBACK"
  | "PRAISE"
  | "THANKS"
  | "JOKE"
  | "MEME"
  | "CASUAL_REACTION"
  | "LOW_INFORMATION"
  | "SPAM"
  | "ABUSE"
  | "PROMOTION"
  | "BOT_LIKE"
  | "DUPLICATE";

export type ReplyDecisionType = "REPLY" | "SKIP" | "REVIEW";

export type ReplyDecisionReason =
  | "GENUINE_CONCERN"
  | "REAL_PROBLEM"
  | "HELPFUL_FEEDBACK"
  | "QUESTION"
  | "MISUNDERSTANDING"
  | "CORRECTION"
  | "PURCHASE_INTENT"
  | "SUPPORT_REQUEST"
  | "HIGH_VALUE_DISCUSSION"
  | "CREATOR_OPPORTUNITY"
  | "VIP_CUSTOMER"
  | "GENERIC_PRAISE"
  | "ONE_WORD"
  | "EMOJI_ONLY"
  | "LOW_INFORMATION"
  | "DUPLICATE"
  | "SPAM"
  | "BAIT"
  | "ALREADY_ANSWERED"
  | "AUTOMATION_SELF_REPLY"
  | "UNCERTAIN_KB_MATCH"
  | "CONFLICTING_KNOWLEDGE"
  | "SAFETY_VIOLATION";

export type ReplyPriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "IGNORE";

// ─── 1. Transcript & Multimodal Representations ──────────────────────────────

export interface TranscriptSegment {
  segment: number;
  start: number;       // seconds e.g. 43.2
  end: number;         // seconds e.g. 49.8
  text: string;
  confidence: number;  // 0.0 - 1.0
  speaker?: string;
  language?: string;
}

export interface VisualScene {
  id: string;
  startSec: number;
  endSec: number;
  timeRangeFormatted: string; // e.g. "01:22–01:45"
  description: string;
  keyEntities: string[];
  detectedObjects: string[];
  visualDemonstrations?: string[];
  onScreenText?: string;
}

export interface OCRSnippet {
  id: string;
  timeSec: number;
  timeFormatted: string;      // e.g. "03:15"
  text: string;
  category:
    | "price"
    | "specification"
    | "product_name"
    | "discount_code"
    | "url"
    | "comparison"
    | "heading"
    | "general";
  confidence: number;
}

export interface StructuredClaim {
  id: string;
  text: string;
  type: ClaimCategory;
  confidence: number;
  timestampRange?: string;    // e.g. "02:15–02:41"
  visualSupport?: boolean;
  sourceSpeaker?: string;
}

export interface VideoProductEntity {
  id: string;
  name: string;
  description?: string;
  specs: Record<string, string>;
  priceMentioned?: string;
  timestamps: string[];
}

export interface CandidateFAQ {
  id: string;
  question: string;
  answer: string;
  timestamp: string;          // e.g. "01:15"
  confidence: number;
}

export interface VideoContentProfile {
  id: string;
  videoId: string;
  platform: "youtube" | "instagram" | "tiktok" | "linkedin";
  title: string;
  description: string;
  durationSeconds?: number;
  language: string;
  transcriptLanguage: string;
  status: VideoRAGStatus;
  statusDetail?: string;
  processingProgress: number; // 0 to 100
  version: number;
  checksum: string;
  processedAt: string;

  // Segmented Content
  transcriptSegments: TranscriptSegment[];
  visualScenes: VisualScene[];
  ocrSnippets: OCRSnippet[];

  // Knowledge & Claims
  topics: Array<{ name: string; description: string; timeRanges: string[] }>;
  claims: StructuredClaim[];
  products: VideoProductEntity[];
  opinions: string[];
  demonstrations: string[];
  caveats: string[];
  candidateFAQs: CandidateFAQ[];
  summary: {
    hook: string;
    coreWalkthrough: string;
    verdictAndCTA: string;
  };

  // Telemetry & Indexing
  indexingStatus: {
    vectorCount: number;
    bm25Indexed: boolean;
    lastIndexedAt: string;
  };
}

// ─── 2. Video RAG Configuration ─────────────────────────────────────────────

export interface BrandVoiceConfig {
  tone: "friendly" | "professional" | "premium" | "casual" | "luxury" | "witty";
  responseLength: "short" | "medium" | "detailed"; // default: "short" (1-3 sentences)
  emojiPolicy: "none" | "minimal" | "moderate";
  casualness: "low" | "moderate" | "high";
  maxHumorIntensity: number;  // 0.0 - 1.0
  roastIntensity: number;     // 0.0 - 1.0
  forbiddenPhrases: string[];
  preferredLanguage?: string;
}

export interface SafetyPolicyConfig {
  blockProtectedCharacteristics: boolean;
  blockProfanity: boolean;
  enforceFactualGrounding: boolean;
  autoDowngradeToProfessionalOnComplaint: boolean;
  minGroundingConfidence: number; // default: 0.75
}

export interface VideoRAGConfig {
  videoId: string;
  channelId?: string;
  enabled: boolean;
  style: ResponseStyleType;         // default: "PROFESSIONAL"
  replyPolicy: ReplyPolicyType;     // default: "ONLY_GENUINE_CONCERNS"
  autoSend: boolean;                // default: false (draft-first mode initially)
  maxRepliesPerHour: number;        // default: 15
  maxRepliesPerDay: number;         // default: 50
  customerCooldownMinutes: number;  // default: 30
  brandVoice: BrandVoiceConfig;
  safetyPolicy: SafetyPolicyConfig;
  isPaused: boolean;
  pausedReason?: string;
}

// ─── 3. Knowledge Layer & Multi-Source Fusion ────────────────────────────────

export interface RetrievedKnowledgeChunk {
  chunkId: string;
  sourceType: "business_policy" | "verified_product_db" | "video_transcript" | "video_ocr" | "customer_memory" | "general_faq";
  sourceId: string;
  content: string;
  timestampRange?: string;    // e.g. "02:15–02:41"
  relevanceScore: number;     // 0.0 - 1.0 (vector / BM25 fusion)
  authorityScore: SourceAuthorityLevel;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeConflict {
  detected: boolean;
  description: string;
  authoritativeSource: string;
  conflictingSource: string;
  resolutionStrategy: "override_with_authority" | "clarify_policy" | "route_to_review";
}

// ─── 4. Comment Intelligence & Explainability Trace ─────────────────────────

export interface CommentUnderstandingResult {
  commentId: string;
  text: string;
  author: string;
  authorSubscribers?: string;
  parentCommentId?: string;
  threadDepth: number;
  classifications: CommentClassificationLabel[];
  primaryClassification: CommentClassificationLabel;
  sentiment: "positive" | "neutral" | "negative";
  spamProbability: number;
  toxicityScore: number;
  isSelfResponse: boolean;
  isAlreadyAnswered: boolean;
  extractedQuestion?: string;
  extractedConcern?: string;
  detectedEntities: string[];
  timestampReferenceRequested?: boolean; // e.g. "at 3:20", "which timestamp"
}

export interface ReplyWorthinessResult {
  decision: ReplyDecisionType;
  reason: ReplyDecisionReason;
  score: number;              // 0.0 - 1.0
  priority: ReplyPriorityLevel;
  explanation: string;
  criteriaMatched: string[];
}

export interface StyleSafetyEvaluation {
  configuredStyle: ResponseStyleType;
  effectiveStyle: ResponseStyleType;
  styleOverridden: boolean;
  overrideReason?: string;
  roastSafetyPassed: boolean;
  protectedTraitsDetected: boolean;
  humorIntensityScore: number;
}

export interface GroundingVerificationResult {
  passed: boolean;
  groundingScore: number;     // 0.0 - 1.0
  unsupportedClaims: string[];
  hallucinationDetected: boolean;
  timestampCitationsValid: boolean;
  citations: string[];
}

export interface CommentDecisionTrace {
  id: string;
  commentId: string;
  videoId: string;
  channelId: string;
  author: string;
  commentText: string;
  timestamp: string;

  // Pipeline Tracing
  understanding: CommentUnderstandingResult;
  replyWorthiness: ReplyWorthinessResult;
  retrievedKnowledge: RetrievedKnowledgeChunk[];
  knowledgeConflict?: KnowledgeConflict;
  styleEvaluation: StyleSafetyEvaluation;
  generatedDraft?: string;
  groundingResult?: GroundingVerificationResult;
  
  // Final Decision & Execution
  finalDecision: ReplyDecisionType;
  finalReason: string;
  finalResponseText?: string;
  actionStatus: "SENT" | "DRAFTED" | "SKIPPED" | "QUEUED_FOR_APPROVAL" | "FAILED" | "PAUSED";
  executionLatencyMs: number;
  costEstimateUSD: number;
  modelsUsed: {
    classifier?: string;
    retrieval?: string;
    generator?: string;
  };
}

// ─── 5. Evaluation & Golden Test Set ─────────────────────────────────────────

export interface GoldenTestCase {
  id: string;
  name: string;
  commentText: string;
  author: string;
  videoTitle: string;
  expectedClassifications: CommentClassificationLabel[];
  expectedDecision: ReplyDecisionType;
  expectedReason: ReplyDecisionReason;
  expectedEffectiveStyle: ResponseStyleType;
  expectedTimestampRef?: boolean;
  shouldDetectConflict?: boolean;
}

export interface EvaluationReport {
  timestamp: string;
  totalCases: number;
  passedCases: number;
  accuracyScore: number;
  selectivityPrecision: number;
  safetyViolationRate: number;
  groundingScoreAverage: number;
  details: Array<{
    caseId: string;
    name: string;
    passed: boolean;
    actualDecision: ReplyDecisionType;
    actualReason: string;
    actualStyle: ResponseStyleType;
    errors: string[];
  }>;
}
