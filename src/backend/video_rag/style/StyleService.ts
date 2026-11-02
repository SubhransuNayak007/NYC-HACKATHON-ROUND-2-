/**
 * ============================================================================
 * QuickReply — 3-Mode Style Engine with Situation-Driven Safety Overrides
 * src/backend/video_rag/style/StyleService.ts
 *
 * Implements:
 * 1. Exactly Three Styles: FUNNY, PROFESSIONAL, ROAST
 * 2. Facts Invariant Principle (Style changes phrasing, NEVER facts or claims)
 * 3. Strict Roast Safety Gate (Zero tolerance for protected traits or harassment)
 * 4. Situation-Driven Style Override Engine (Complaints -> PROFESSIONAL)
 * ============================================================================
 */

import {
  ResponseStyleType,
  CommentUnderstandingResult,
  VideoRAGConfig,
  StyleSafetyEvaluation,
} from "../types";

export class StyleService {
  /**
   * Protected characteristics keywords that must NEVER be roasted or attacked
   */
  private static readonly PROTECTED_KEYWORDS = [
    "race", "black", "white", "asian", "hispanic", "jew", "muslim", "christian", "hindu",
    "gay", "lesbian", "trans", "lgbt", "disabled", "autistic", "retard", "ugly", "fat",
    "poor", "immigrant", "kill", "die", "suicide"
  ];

  /**
   * Evaluate and resolve the effective response style with full safety boundaries
   */
  static evaluateStyle(params: {
    configuredStyle: ResponseStyleType;
    understanding: CommentUnderstandingResult;
    config: VideoRAGConfig;
  }): StyleSafetyEvaluation {
    const { configuredStyle, understanding, config } = params;
    const lowerText = understanding.text.toLowerCase();

    // ── 1. Check for Protected Characteristics in Comment or Context ────────
    let protectedTraitsDetected = false;
    for (const kw of this.PROTECTED_KEYWORDS) {
      if (lowerText.includes(kw)) {
        protectedTraitsDetected = true;
        break;
      }
    }

    // ── 2. Situation-Driven Style Override Engine ────────────────────────────
    // If customer reports a real problem, complaint, billing/refund, or distress:
    // ALWAYS override to PROFESSIONAL regardless of user configuration.
    const isSeriousSituation =
      understanding.classifications.includes("REAL_PROBLEM") ||
      understanding.sentiment === "negative" ||
      lowerText.includes("refund") ||
      lowerText.includes("stuck") ||
      lowerText.includes("crash") ||
      lowerText.includes("broken") ||
      lowerText.includes("order");

    if (isSeriousSituation && (configuredStyle === "FUNNY" || configuredStyle === "ROAST")) {
      return {
        configuredStyle,
        effectiveStyle: "PROFESSIONAL",
        styleOverridden: true,
        overrideReason: "Customer reported a serious issue/complaint. Style overridden to PROFESSIONAL for respectful resolution.",
        roastSafetyPassed: true,
        protectedTraitsDetected,
        humorIntensityScore: 0.0,
      };
    }

    // ── 3. Roast Safety Gate ────────────────────────────────────────────────
    if (configuredStyle === "ROAST") {
      if (protectedTraitsDetected || understanding.toxicityScore > 0.4) {
        return {
          configuredStyle: "ROAST",
          effectiveStyle: "PROFESSIONAL",
          styleOverridden: true,
          overrideReason: "Roast safety check triggered: protected characteristics or high hostility detected. Converted to safe PROFESSIONAL response.",
          roastSafetyPassed: false,
          protectedTraitsDetected: true,
          humorIntensityScore: 0.0,
        };
      }

      return {
        configuredStyle: "ROAST",
        effectiveStyle: "ROAST",
        styleOverridden: false,
        roastSafetyPassed: true,
        protectedTraitsDetected: false,
        humorIntensityScore: config.brandVoice?.roastIntensity ?? 0.6,
      };
    }

    // ── 4. Funny Mode ───────────────────────────────────────────────────────
    if (configuredStyle === "FUNNY") {
      return {
        configuredStyle: "FUNNY",
        effectiveStyle: "FUNNY",
        styleOverridden: false,
        roastSafetyPassed: true,
        protectedTraitsDetected,
        humorIntensityScore: config.brandVoice?.maxHumorIntensity ?? 0.7,
      };
    }

    // ── 5. Default Professional Mode ────────────────────────────────────────
    return {
      configuredStyle: "PROFESSIONAL",
      effectiveStyle: "PROFESSIONAL",
      styleOverridden: false,
      roastSafetyPassed: true,
      protectedTraitsDetected,
      humorIntensityScore: 0.0,
    };
  }

  /**
   * Get system prompt instructions for the resolved style
   */
  static getStylePromptInstructions(style: ResponseStyleType, brandVoice?: VideoRAGConfig["brandVoice"]): string {
    const lengthLimit = brandVoice?.responseLength === "detailed" ? "2-4 sentences" : "1-2 crisp sentences";

    switch (style) {
      case "FUNNY":
        return `[STYLE: FUNNY]
- Keep it lighthearted, playful, and human with mild witty warmth.
- Use 1 tasteful emoji maximum if emoji policy allows.
- Never use demeaning, sexually explicit, or offensive jokes.
- Length: ${lengthLimit}.
- STRICT FACTUAL INVARIANT: Humor modifies phrasing ONLY. All technical specs, prices, and facts must remain 100% exact.`;

      case "ROAST":
        return `[STYLE: ROAST / SITUATIONAL BANTER]
- Playfully tease the situation, the confusion, or the meme with sharp internet wit.
- Target the scenario or harmless confusion ONLY. NEVER attack personal traits, identity, appearance, or background.
- Keep it good-natured like friendly banter between friends.
- Length: ${lengthLimit}.
- STRICT FACTUAL INVARIANT: Roasting modifies phrasing ONLY. All technical facts, timestamps, and claims must remain 100% exact.`;

      case "PROFESSIONAL":
      default:
        return `[STYLE: PROFESSIONAL]
- Clear, respectful, knowledgeable, calm, and concise.
- Avoid robotic corporate clichés ("Thank you for reaching out") or unnecessary disclaimers.
- Directly deliver the answer with authority.
- Length: ${lengthLimit}.
- STRICT FACTUAL INVARIANT: Ensure 100% accurate grounded information.`;
    }
  }
}
