/**
 * ============================================================================
 *  QuickReply — LinkedIn AI Studio & Content Generator API
 *  src/app/api/linkedin/ai/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, getCanonicalTenantId, type LinkedInAIGenerationRecord } from "@/database/db";
import { LinkedInContentEngine, type GeneratePostOptions } from "@/channels/linkedin/LinkedInContentEngine";

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const body = await req.json().catch(() => ({}));
  const {
    topic,
    format = "EDUCATIONAL",
    tone = "conversational",
    targetAudience,
    keyTakeaway,
    action = "GENERATE_VARIANT", // "GENERATE_VARIANT" | "REPURPOSE" | "QUALITY_GATE"
    repurposeType,
    rawContent,
    customText,
  } = body;

  const db = await getDB(session.email);
  const tenantId = getCanonicalTenantId(session.email);

  if (action === "QUALITY_GATE") {
    if (!customText || typeof customText !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAM", message: "customText is required for Quality Gate evaluation." } },
        { status: 400 }
      );
    }

    const existingTexts = (db.linkedinPosts || []).map((p) => p.content);
    const result = LinkedInContentEngine.evaluateQualityGate(customText, existingTexts);
    return NextResponse.json({ success: true, qualityGate: result });
  }

  if (action === "REPURPOSE") {
    if (!rawContent || !repurposeType) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAM", message: "rawContent and repurposeType are required." } },
        { status: 400 }
      );
    }

    const variants = LinkedInContentEngine.repurposeContent(repurposeType, rawContent, topic);
    return NextResponse.json({ success: true, variants });
  }

  // Standard Post Variant Generation
  if (!topic || typeof topic !== "string") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAM", message: "topic is required." } },
      { status: 400 }
    );
  }

  const options: GeneratePostOptions = {
    topic: topic.trim(),
    format,
    tone,
    targetAudience,
    keyTakeaway,
    brandVoice: {
      companyName: db.workspace?.name || "Our Company",
    },
  };

  const variant = LinkedInContentEngine.generateVariant(options);

  // Record generation telemetry
  const record: LinkedInAIGenerationRecord = {
    id: `li_ai_${crypto.randomBytes(6).toString("hex")}`,
    tenantId,
    promptHash: crypto.createHash("sha256").update(topic).digest("hex").slice(0, 16),
    formatType: format,
    tone,
    model: "claude-3-5-sonnet-v2",
    inputTokens: Math.ceil(topic.length / 4) + 150,
    outputTokens: Math.ceil(variant.fullText.length / 4),
    generatedText: variant.fullText,
    qualityScore: variant.qualityGate.score,
    approved: false,
    published: false,
    createdAt: new Date().toISOString(),
  };

  if (!db.linkedinAIGenerationRecords) db.linkedinAIGenerationRecords = [];
  db.linkedinAIGenerationRecords.push(record);
  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    variant,
    recordId: record.id,
  });
}
