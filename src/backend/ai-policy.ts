/**
 * ============================================================================
 *  QuickReply — AI Policy Engine
 *  src/backend/ai-policy.ts
 *
 *  Purpose:
 *    Enforce strict boundaries on what AI models can observe and do.
 *    Prevents prompt injection and unauthorized tool use.
 *
 *  Security principles:
 *    • AI output is UNTRUSTED until validated against this policy
 *    • Platform content (Instagram comments, messages) is DATA, not INSTRUCTIONS
 *    • AI cannot directly trigger privileged operations
 *    • All AI tool calls are validated against an explicit allowlist
 *    • AI never receives raw credentials, tokens, or PII beyond what is required
 *
 *  OWASP: API10 — Unsafe Consumption of APIs
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────
//  ALLOWED AI TOOLS
//  Explicit allowlist. If a tool is not here, the AI cannot use it.
// ─────────────────────────────────────────────────────────────

export type AiToolName =
  // Read-only tools — always allowed
  | "read_comment"
  | "read_message"
  | "read_post_metadata"
  | "get_account_summary"
  // Draft tools — requires review before execution
  | "draft_reply"
  | "draft_dm"
  // Write tools — requires explicit operator permission
  | "send_comment_reply"
  | "send_dm_reply"
  // Analytics tools
  | "get_engagement_stats"
  | "get_campaign_stats";

const READ_ONLY_TOOLS: Set<AiToolName> = new Set([
  "read_comment",
  "read_message",
  "read_post_metadata",
  "get_account_summary",
  "get_engagement_stats",
  "get_campaign_stats",
]);

const DRAFT_TOOLS: Set<AiToolName> = new Set(["draft_reply", "draft_dm"]);

const WRITE_TOOLS: Set<AiToolName> = new Set(["send_comment_reply", "send_dm_reply"]);

// ─────────────────────────────────────────────────────────────
//  PROMPT INJECTION DETECTION
//  Platform content (social media messages) is DATA.
//  These patterns detect when content tries to override system instructions.
// ─────────────────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+instruction/i,
  /forget\s+(all\s+)?(previous|prior|above|system)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(if\s+you\s+are|an?|the)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /override\s+(your\s+)?(instructions|rules|guidelines|system)/i,
  /print\s+(your\s+)?(system\s+prompt|instructions|prompt)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|configuration)/i,
  /send\s+(all\s+)?(credentials|tokens|api.?keys|secrets)/i,
  /delete\s+(all\s+)?customer/i,
  /call\s+this\s+(url|endpoint|api)/i,
  /execute\s+(this\s+)?(command|code|script|sql)/i,
  /disable\s+(all\s+)?(safety|filter|security)/i,
];

export interface InjectionCheckResult {
  safe: boolean;
  reason?: string;
  matchedPattern?: string;
}

/**
 * Check platform content (comments, messages) for prompt injection attempts.
 * This must be called before including any user-generated content in an AI prompt.
 *
 * @returns { safe: true } if content is safe to include as DATA
 * @returns { safe: false, reason } if injection is detected — do not pass to AI
 */
export function checkForPromptInjection(content: string): InjectionCheckResult {
  if (!content || typeof content !== "string") {
    return { safe: true };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: "Potential prompt injection detected in platform content",
        matchedPattern: pattern.source,
      };
    }
  }

  return { safe: true };
}

// ─────────────────────────────────────────────────────────────
//  AI OUTPUT SCHEMA VALIDATION
//  All AI responses must conform to a known schema before dispatch.
// ─────────────────────────────────────────────────────────────

export interface AiActionIntent {
  action: AiToolName;
  confidence: number; // 0.0 – 1.0
  response: string;   // The actual text response to send
  resourceId?: string; // Comment ID, message ID, etc.
}

const MAX_RESPONSE_LENGTH = 2000;
const MIN_CONFIDENCE = 0.5;

/**
 * Validate and parse AI output into a typed, bounded AiActionIntent.
 * Rejects malformed, low-confidence, or out-of-policy responses.
 *
 * @throws Error if the AI output is invalid or out-of-policy
 */
export function parseAiOutput(raw: unknown): AiActionIntent {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI output is not an object");
  }

  const obj = raw as Record<string, unknown>;

  // Validate action
  const action = obj.action;
  if (typeof action !== "string") {
    throw new Error("AI output missing action field");
  }
  if (!isAllowedTool(action as AiToolName)) {
    throw new Error(`AI requested unauthorized tool: ${action}`);
  }

  // Validate confidence
  const confidence = Number(obj.confidence);
  if (isNaN(confidence) || confidence < MIN_CONFIDENCE || confidence > 1.0) {
    throw new Error(`AI confidence ${confidence} below threshold ${MIN_CONFIDENCE}`);
  }

  // Validate response text
  const response = obj.response;
  if (typeof response !== "string" || response.trim().length === 0) {
    throw new Error("AI output missing response text");
  }
  if (response.length > MAX_RESPONSE_LENGTH) {
    throw new Error(`AI response exceeds maximum length of ${MAX_RESPONSE_LENGTH}`);
  }

  // Resource ID (optional)
  const resourceId = typeof obj.resourceId === "string" ? obj.resourceId : undefined;

  return {
    action: action as AiToolName,
    confidence,
    response: response.trim(),
    resourceId,
  };
}

/**
 * Check if a tool name is in the allowed tool set.
 */
export function isAllowedTool(tool: AiToolName): boolean {
  return READ_ONLY_TOOLS.has(tool) || DRAFT_TOOLS.has(tool) || WRITE_TOOLS.has(tool);
}

/**
 * Check if a tool requires write permissions.
 */
export function isWriteTool(tool: AiToolName): boolean {
  return WRITE_TOOLS.has(tool);
}

/**
 * Sanitize platform content for safe inclusion in AI prompts.
 * Wraps content in explicit DATA markers to prevent context confusion.
 */
export function sanitizePlatformContentForAi(content: string, context: string): string {
  const check = checkForPromptInjection(content);
  if (!check.safe) {
    console.warn(`[AI Policy] Prompt injection detected in ${context}: ${check.reason}`);
    // Return a safe placeholder — never pass the injected content
    return "[Content flagged for security review]";
  }
  // Wrap in explicit DATA delimiters to separate from system instructions
  return `<platform_data context="${context}">\n${content}\n</platform_data>`;
}
