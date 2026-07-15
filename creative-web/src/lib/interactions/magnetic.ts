/**
 * Magnetic Button / Cursor Attraction Effect
 * GSAP-powered magnetic interaction with configurable strength and elastic return
 */

import { gsap } from 'gsap';
import { motion } from '@/lib/tokens';

export interface MagneticConfig {
  /** Attraction strength (0-1) */
  strength: number;
  /** Maximum distance for attraction to activate (pixels) */
  radius: number;
  /** Elastic return stiffness */
  stiffness: number;
  /** Elastic return damping */
  damping: number;
  /** GSAP ease for return animation */
  ease: gsap.EaseString | gsap.CustomEase;
  /** Whether to apply magnetic effect to child elements */
  affectChildren: boolean;
  /** Elements to exclude from magnetic effect (CSS selectors) */
  excludeSelectors: string[];
  /** Callback when magnetic attraction starts */
  onAttract?: (progress: number) => void;
  /** Callback when magnetic attraction ends */
  onRelease?: () => void;
}

export interface MagneticState {
  x: number;
  y: number;
  isAttracting: boolean;
  progress: number;
}

const DEFAULT_CONFIG: MagneticConfig = {
  strength: 0.3,
  radius: 80,
  stiffness: 400,
  damping: 20,
  ease: 'magnetic' as gsap.EaseString,
  affectChildren: false,
  excludeSelectors: ['.no-magnetic', '[data-magnetic-ignore]'],
};

/**
 * Creates a magnetic interaction controller for an element
 */
export function createMagnetic(
  element: HTMLElement,
  config: Partial<MagneticConfig> = {}
): {
  state: MagneticState;
  update: (mouseX: number, mouseY: number) => void;
  destroy: () => void;
  setConfig: (config: Partial<MagneticConfig>) => void;
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let animationFrame: number | null = null;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let isAttracting = false;
  let progress = 0;

  const state: MagneticState = {
    x: 0,
    y: 0,
    isAttracting: false,
    progress: 0,
  };

  // Check if element should be excluded
  const isExcluded = (el: HTMLElement): boolean => {
    return finalConfig.excludeSelectors.some((selector) => el.matches(selector));
  };

  // Calculate distance from element center
  const getDistance = (mouseX: number, mouseY: number): number => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.hypot(mouseX - centerX, mouseY - centerY);
  };

  // Update magnetic position
  const update = (mouseX: number, mouseY: number): void => {
    if (isExcluded(element)) return;

    const distance = getDistance(mouseX, mouseY);
    const maxDistance = finalConfig.radius;

    if (distance < maxDistance) {
      isAttracting = true;
      progress = 1 - distance / maxDistance;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (mouseX - centerX) * finalConfig.strength * progress;
      const deltaY = (mouseY - centerY) * finalConfig.strength * progress;

      targetX = deltaX;
      targetY = deltaY;

      if (finalConfig.onAttract) {
        finalConfig.onAttract(progress);
      }
    } else if (isAttracting) {
      isAttracting = false;
      targetX = 0;
      targetY = 0;
      progress = 0;

      if (finalConfig.onRelease) {
        finalConfig.onRelease();
      }
    }

    state.isAttracting = isAttracting;
    state.progress = progress;
  };

  // Animation loop for smooth elastic return
  const animate = (): void => {
    const springConfig = {
      stiffness: finalConfig.stiffness,
      damping: finalConfig.damping,
    };

    currentX += (targetX - currentX) * 0.15; // Simplified spring for performance
    currentY += (targetY - currentY) * 0.15;

    // Apply transform
    element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    state.x = currentX;
    state.y = currentY;

    // Continue animation if moving or attracting
    if (Math.abs(currentX - targetX) > 0.1 || Math.abs(currentY - targetY) > 0.1 || isAttracting) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  // Start animation loop
  animate();

  // Handle reduced motion
  const handleReducedMotion = (): void => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      element.style.transition = 'transform 0.01s linear';
    }
  };

  handleReducedMotion();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', handleReducedMotion);

  const destroy = (): void => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    element.style.transform = '';
    element.style.transition = '';
    window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', handleReducedMotion);
  };

  const setConfig = (newConfig: Partial<MagneticConfig>): void => {
    Object.assign(finalConfig, newConfig);
  };

  return { state, update, destroy, setConfig };
}

/**
 * React hook for magnetic interaction
 */
export function useMagnetic(config: Partial<MagneticConfig> = {}) {
  const elementRef = React.useRef<HTMLElement | null>(null);
  const magneticRef = React.useRef<ReturnType<typeof createMagnetic> | null>(null);

  React.useEffect(() => {
    if (elementRef.current) {
      magneticRef.current = createMagnetic(elementRef.current, config);
    }

    return () => {
      magneticRef.current?.destroy();
    };
  }, []);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      magneticRef.current?.update(e.clientX, e.clientY);
    },
    []
  );

  return { ref: elementRef, onMouseMove: handleMouseMove, state: magneticRef.current?.state };
}

// Need to import React for the hook
import * as React from 'react';

/**
 * GSAP-based magnetic with more sophisticated spring physics
 */
export function createMagneticGSAP(
  element: HTMLElement,
  config: Partial<MagneticConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let isAttracting = false;

  const state: MagneticState = {
    x: 0,
    y: 0,
    isAttracting: false,
    progress: 0,
  };

  const update = (mouseX: number, mouseY: number): void => {
    const distance = getDistance(element, mouseX, mouseY);
    const maxDistance = finalConfig.radius;

    if (distance < maxDistance) {
      isAttracting = true;
      const progress = 1 - distance / maxDistance;
      state.progress = progress;
      state.isAttracting = true;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (mouseX - centerX) * finalConfig.strength * progress;
      const deltaY = (mouseY - centerY) * finalConfig.strength * progress;

      gsap.to(element, {
        x: deltaX,
        y: deltaY,
        duration: 0.3,
        ease: finalConfig.ease,
        overwrite: true,
      });

      finalConfig.onAttract?.(progress);
    } else if (isAttracting) {
      isAttracting = false;
      state.isAttracting = false;
      state.progress = 0;

      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
        overwrite: true,
      });

      finalConfig.onRelease?.();
    }
  };

  const destroy = (): void => {
    gsap.killTweensOf(element);
    gsap.set(element, { x: 0, y: 0 });
  };

  const setConfig = (newConfig: Partial<MagneticConfig>): void => {
    Object.assign(finalConfig, newConfig);
  };

  return { state, update, destroy, setConfig };
}

function getDistance(element: HTMLElement, mouseX: number, mouseY: number): number {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.hypot(mouseX - centerX, mouseY - centerY);
}

export type { MagneticConfig, MagneticState };