/**
 * ============================================================
 *  QuickReply — Multi-Provider AI Router & Circuit Breaker
 *  src/backend/ai/router.ts
 *
 *  Features:
 *   1. Multi-Provider Fallback Cascade:
 *      Gemini (Primary) ↔ Anthropic Claude (Secondary) ↔ OpenAI (Fallback)
 *   2. Resilient Circuit Breaker: Automatically detects outages per provider
 *   3. Prompt Injection Shield: Intercepts malicious inputs
 *   4. Output Moderation & Formatting
 * ============================================================
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { constructEnclosedPrompt, scanForPromptInjection, validateOutputSafety } from "./safety";

export interface AIReplyRequest {
  commentText: string;
  commenterName?: string;
  videoOrPostTitle?: string;
  channelName?: string;
  brandVoiceTone?: "friendly" | "professional" | "enthusiastic" | "witty" | "empathetic";
  brandKnowledge?: string;
  maxTokens?: number;
}

export interface AIReplyResult {
  reply: string;
  confidence: number;
  provider: "gemini" | "anthropic" | "openai" | "rule_fallback";
  model: string;
  latencyMs: number;
  tokensUsed?: { input?: number; output?: number };
}

// ─────────────────────────────────────────────────────────────
//  CIRCUIT BREAKER STATE
// ─────────────────────────────────────────────────────────────

interface ProviderHealth {
  consecutiveFailures: number;
  circuitOpenUntil: number; // timestamp
}

const circuitState: Record<string, ProviderHealth> = {
  gemini: { consecutiveFailures: 0, circuitOpenUntil: 0 },
  anthropic: { consecutiveFailures: 0, circuitOpenUntil: 0 },
  openai: { consecutiveFailures: 0, circuitOpenUntil: 0 },
};

function isCircuitHealthy(provider: string): boolean {
  const state = circuitState[provider];
  if (!state) return true;
  if (state.circuitOpenUntil > Date.now()) {
    return false; // Circuit is open (tripped)
  }
  return true;
}

function recordSuccess(provider: string) {
  if (circuitState[provider]) {
    circuitState[provider].consecutiveFailures = 0;
    circuitState[provider].circuitOpenUntil = 0;
  }
}

function recordFailure(provider: string) {
  if (!circuitState[provider]) {
    circuitState[provider] = { consecutiveFailures: 0, circuitOpenUntil: 0 };
  }
  circuitState[provider].consecutiveFailures += 1;
  if (circuitState[provider].consecutiveFailures >= 3) {
    // Trip circuit for 60 seconds
    circuitState[provider].circuitOpenUntil = Date.now() + 60_000;
    console.warn(`[AI Router] Circuit tripped for provider "${provider}" for 60s`);
  }
}

// ─────────────────────────────────────────────────────────────
//  INDIVIDUAL PROVIDER CALLERS
// ─────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ reply: string; confidence: number; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { reply: text, confidence: 0.85 };
  }

  return {
    reply: parsed.reply || text,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
    model: modelName,
  };
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<{ reply: string; confidence: number; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const anthropic = new Anthropic({ apiKey });
  const modelName = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";

  const message = await anthropic.messages.create({
    model: modelName,
    max_tokens: 300,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : "";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { reply: content, confidence: 0.9 };
  }

  return {
    reply: parsed.reply || content,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
    model: modelName,
  };
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<{ reply: string; confidence: number; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { reply: raw, confidence: 0.85 };
  }

  return {
    reply: parsed.reply || raw,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
    model: modelName,
  };
}

// ─────────────────────────────────────────────────────────────
//  MAIN MULTI-PROVIDER AI ROUTER
// ─────────────────────────────────────────────────────────────

export async function generateSocialReply(
  req: AIReplyRequest
): Promise<AIReplyResult> {
  const startTime = Date.now();

  // 1. Prompt injection safety scan
  const injectionCheck = scanForPromptInjection(req.commentText);
  if (!injectionCheck.isSafe) {
    console.warn("[AI Router] Prompt injection attempt blocked:", injectionCheck.flaggedReason);
    return {
      reply: "Thank you for sharing your thoughts!",
      confidence: 0.5,
      provider: "rule_fallback",
      model: "safety_interception",
      latencyMs: Date.now() - startTime,
    };
  }

  // 2. Build secure prompt with XML boundaries
  const systemInstructions = `You are an AI assistant helping a creator/brand reply to social media comments.
Tone: ${req.brandVoiceTone || "friendly and genuine"}.
Keep your reply short (1 to 2 sentences), natural, authentic, and polite. Avoid corporate buzzwords or generic robotic phrasing.
Return a valid JSON object with format:
{"reply": "your generated reply here", "confidence": 0.95}`;

  const { systemPrompt, userPrompt } = constructEnclosedPrompt({
    systemInstructions,
    brandContext: req.brandKnowledge,
    commenterName: req.commenterName || "Viewer",
    commentText: req.commentText,
    videoOrPostTitle: req.videoOrPostTitle,
    channelName: req.channelName,
  });

  // 3. Try Provider Cascade: Gemini -> Anthropic -> OpenAI
  const providers = [
    { name: "gemini" as const, fn: () => callGemini(systemPrompt, userPrompt) },
    { name: "anthropic" as const, fn: () => callAnthropic(systemPrompt, userPrompt) },
    { name: "openai" as const, fn: () => callOpenAI(systemPrompt, userPrompt) },
  ];

  for (const { name, fn } of providers) {
    if (!isCircuitHealthy(name)) {
      continue;
    }

    try {
      const result = await fn();
      recordSuccess(name);

      const safety = validateOutputSafety(result.reply);
      const cleanReply = safety.isSafe ? safety.cleanedOutput : "Thank you for reaching out!";

      return {
        reply: cleanReply,
        confidence: result.confidence,
        provider: name,
        model: result.model,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.warn(`[AI Router] Provider ${name} failed:`, err.message);
      recordFailure(name);
    }
  }

  // 4. Ultimate graceful fallback if all providers fail or are unconfigured
  return {
    reply: "Thank you for your comment! We appreciate your support.",
    confidence: 0.6,
    provider: "rule_fallback",
    model: "static_template",
    latencyMs: Date.now() - startTime,
  };
}
