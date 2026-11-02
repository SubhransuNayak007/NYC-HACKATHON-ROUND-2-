/**
 * ============================================================================
 * QuickReply — Automation Intelligence Engine Types & Domain Models
 * src/backend/rules/types.ts
 *
 * Defines complete data structures for Scope, Context, Matching Modes (TAG, RAG, HYBRID),
 * Intent Library, Expression AST, Priority Resolution, and Policy Verification.
 * ============================================================================
 */

import { NormalizedEvent } from "@/backend/events/EventNormalizer";
import { CustomerProfile } from "@/backend/crm/CustomerMemoryService";

export type ExecutionMode = "TAG" | "RAG" | "HYBRID";

export type RuleStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";

export type ScopeTargetType =
  | "ALL_CONTENT"
  | "ALL_VIDEOS"
  | "ALL_POSTS"
  | "SELECTED_VIDEOS"
  | "SELECTED_POSTS"
  | "SELECTED_CHANNELS"
  | "SELECTED_ACCOUNTS"
  | "SELECTED_TAGS"
  | "SELECTED_CAMPAIGNS";

export interface AutomationScope {
  targetType: ScopeTargetType;
  targetIds: string[];        // Array of video IDs, post IDs, channel IDs, or campaign IDs
  platforms: ("youtube" | "instagram" | "whatsapp" | "telegram" | "linkedin" | "webhook")[];
  requiredTags?: string[];
  excludedTags?: string[];
}

export type ConditionOperator =
  | "contains"
  | "equals"
  | "starts_with"
  | "ends_with"
  | "regex"
  | "contains_any"
  | "contains_all"
  | "contains_none"
  | "tag_match"
  | "intent_match"
  | "sentiment_match"
  | "numeric_gt"
  | "numeric_lt"
  | "numeric_eq"
  | "always_pass";

export interface ConditionLeaf {
  type: "leaf";
  field: "comment.text" | "customer.tag" | "customer.lead_score" | "content.tag" | "intent" | "sentiment" | string;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface ConditionBranch {
  type: "branch";
  logicalOperator: "AND" | "OR";
  children: ConditionNode[];
}

export type ConditionNode = ConditionLeaf | ConditionBranch;

export interface IntentMatchConfig {
  expectedIntent?: string;          // e.g. "BUYING_INTENT", "PRICE_QUESTION"
  minimumConfidence: number;        // e.g. 0.85
  allowCustomIntents?: boolean;
}

export interface RAGContextConfig {
  useCustomerMemory: boolean;
  useConversationHistory: boolean;
  useProductCatalog: boolean;
  useDocumentation: boolean;
  useBrandFAQ: boolean;
  confidenceThreshold: number;      // e.g. 0.88
  fallbackToHumanApproval: boolean;
}

export interface ActionPlanConfig {
  actionType:
    | "reply_comment"
    | "reply_dm"
    | "like_comment"
    | "add_tag"
    | "remove_tag"
    | "create_lead"
    | "update_lead_score"
    | "assign_customer"
    | "send_webhook"
    | "notify_team"
    | "require_approval"
    | "challenge_participation";
  templateText?: string;
  dynamicTags?: string[];
  leadScoreAdjustment?: number;
  webhookUrl?: string;
  conditionalBranches?: {
    condition: ConditionNode;
    action: ActionPlanConfig;
  }[];
}

export interface ScheduleConfig {
  enabled: boolean;
  timezone: string;
  daysOfWeek: number[];             // 0 = Sunday, 1 = Monday, etc.
  startHour: string;                // "09:00"
  endHour: string;                  // "18:00"
  behaviorOutsideSchedule: "SKIP" | "QUEUE";
}

export interface DelayConfig {
  delayType: "IMMEDIATE" | "FIXED_SECONDS" | "RANDOM_JITTER" | "NEXT_BUSINESS_DAY";
  seconds: number;
}

export interface StopConditionConfig {
  stopAfterMatch: boolean;
  stopIfActionSucceeds: boolean;
  stopIfHighRisk: boolean;
  maxActionsPerComment: number;
}

export interface AutomationRule {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  description?: string;
  mode: ExecutionMode;              // "TAG" | "RAG" | "HYBRID"
  status: RuleStatus;
  version: number;
  priority: number;                 // 1 (Lowest) to 100 (Highest)
  scope: AutomationScope;
  conditions: ConditionNode;
  intentConfig?: IntentMatchConfig;
  ragConfig?: RAGContextConfig;
  actionPlan: ActionPlanConfig;
  schedule?: ScheduleConfig;
  delays?: DelayConfig;
  safetyPolicy?: {
    prohibitedKeywords?: string[];
    maxRepliesPerUserPerDay?: number;
    requireApprovalAboveRisk?: number;
  };
  stopConditions: StopConditionConfig;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  executionStats: {
    timesEvaluated: number;
    timesMatched: number;
    actionsExecuted: number;
    actionsBlocked: number;
    avgLatencyMs: number;
    lastExecutedAt?: string;
  };
}

export interface AssembledContext {
  event: NormalizedEvent;
  customer?: CustomerProfile;
  contentMetadata: {
    id: string;
    title?: string;
    description?: string;
    tags?: string[];
    platform: string;
    publishedAt?: string;
    isAutomatedTagMode?: boolean;
    isAutomatedRAGMode?: boolean;
  };
  productData?: Record<string, any>[];
  relevantKnowledge?: {
    id: string;
    question: string;
    answer: string;
    confidence: number;
  }[];
  conversationHistory?: {
    sender: "customer" | "bot" | "agent";
    text: string;
    timestamp: string;
  }[];
}

export interface MatchDecision {
  matched: boolean;
  ruleId: string;
  ruleName: string;
  rulePriority: number;
  executionModeUsed: ExecutionMode;
  matchReasons: string[];
  intentDetected?: string;
  intentConfidence?: number;
  ragMatches?: AssembledContext["relevantKnowledge"];
  riskScore: number;
  requiresHumanApproval: boolean;
  actionPayload?: Record<string, any>;
  latencyMs: number;
}
