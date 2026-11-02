/**
 * ============================================================
 *  QuickReply — Device Capability Detector
 *  src/frontend/components/auth/message-machine/graphics/CapabilityDetector.ts
 * ============================================================
 */

export type GPUTier = "HIGH" | "MEDIUM" | "LOW" | "FALLBACK";

export interface CapabilityInfo {
  tier: GPUTier;
  particleCount: number;
  hasWebGL: boolean;
  maxDpr: number;
  prefersReducedMotion: boolean;
}

export function detectDeviceCapabilities(): CapabilityInfo {
  if (typeof window === "undefined") {
    return {
      tier: "MEDIUM",
      particleCount: 500,
      hasWebGL: false,
      maxDpr: 1,
      prefersReducedMotion: false,
    };
  }

  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hasWebGL = false;
  try {
    const canvas = document.createElement("canvas");
    hasWebGL = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    hasWebGL = false;
  }

  if (!hasWebGL) {
    return {
      tier: "FALLBACK",
      particleCount: 120,
      hasWebGL: false,
      maxDpr: 1,
      prefersReducedMotion,
    };
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const concurrency = navigator.hardwareConcurrency || 4;

  if (isMobile) {
    return {
      tier: concurrency >= 8 ? "MEDIUM" : "LOW",
      particleCount: concurrency >= 8 ? 450 : 250,
      hasWebGL: true,
      maxDpr: 1.5,
      prefersReducedMotion,
    };
  }

  if (concurrency >= 8) {
    return {
      tier: "HIGH",
      particleCount: 900,
      hasWebGL: true,
      maxDpr: 2,
      prefersReducedMotion,
    };
  } else if (concurrency >= 4) {
    return {
      tier: "MEDIUM",
      particleCount: 550,
      hasWebGL: true,
      maxDpr: 1.5,
      prefersReducedMotion,
    };
  } else {
    return {
      tier: "LOW",
      particleCount: 300,
      hasWebGL: true,
      maxDpr: 1,
      prefersReducedMotion,
    };
  }
}
