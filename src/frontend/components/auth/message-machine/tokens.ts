/**
 * ============================================================
 *  QuickReply — The Message Machine Design Tokens
 *  src/frontend/components/auth/message-machine/tokens.ts
 * ============================================================
 */

export const MM_COLORS = {
  background: "#F7F7F3",
  backgroundAlt: "#EFEFEA",
  textPrimary: "#111111",
  textSecondary: "#6C6C65",
  textMuted: "#9C9C94",
  border: "#DFDFD7",
  borderLight: "#ECECE6",
  surface: "#FFFFFF",
  
  // Instrument Yellow (Sparse & High-Contrast)
  yellowPrimary: "#F3C515",
  yellowDeep: "#DFAE00",
  yellowSoft: "#FFF2A8",
  yellowGlow: "rgba(243, 197, 21, 0.4)",
  
  // System Signals
  success: "#218A61",
  error: "#D34848",
  pulseActive: "#F3C515",
} as const;

export const MM_CHANNELS = [
  {
    id: "instagram",
    name: "INSTAGRAM",
    label: "COMMENTS → DMS",
    angle: 0.35, // radians position around core
    distance: 260,
    color: "#E1306C",
    leadTime: "112ms",
  },
  {
    id: "whatsapp",
    name: "WHATSAPP",
    label: "CATALOG & SUPPORT",
    angle: 1.55,
    distance: 280,
    color: "#25D366",
    leadTime: "134ms",
  },
  {
    id: "linkedin",
    name: "LINKEDIN",
    label: "INBOUND LEADS",
    angle: 2.75,
    distance: 250,
    color: "#0077B5",
    leadTime: "148ms",
  },
  {
    id: "youtube",
    name: "YOUTUBE",
    label: "VIDEO INTENTS",
    angle: 4.15,
    distance: 270,
    color: "#FF0000",
    leadTime: "120ms",
  },
  {
    id: "telegram",
    name: "TELEGRAM",
    label: "INSTANT BROADCASTS",
    angle: 5.35,
    distance: 240,
    color: "#229ED9",
    leadTime: "96ms",
  },
] as const;

export const MM_MESSAGE_SNIPPETS = [
  "price?",
  "how much?",
  "available?",
  "send link",
  "interested",
  "where to buy?",
  "live demo?",
  "shipping time?",
  "catalog pdf",
  "discount code",
] as const;

export const MM_MOTION = {
  fast: 0.18,
  medium: 0.35,
  slow: 0.7,
  cinematic: 1.1,
  springDamping: 0.82,
  springStiffness: 0.08,
} as const;
