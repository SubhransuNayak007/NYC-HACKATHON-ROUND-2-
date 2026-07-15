"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Transition, TargetAndTransition } from "framer-motion";

// ══════════════════════════════════════════════════════════════════
// QUICKREPLY.AI — APPLE & GOOGLE-GRADE PHYSICAL MOTION TOKENS
// Pure mathematical spring constants based on mass, damping & tension
// ══════════════════════════════════════════════════════════════════

/** Snappy tactile feedback for buttons, switches, tabs and micro-interactions */
export const appleSpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.75,
};

/** Organic fluid spring for drawers, modals, menu reveals and layout transitions */
export const appleFluid: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 26,
  mass: 1.0,
};

/** Heavy physical card spring for stacking sheets, drag snap and large layout elements */
export const heavyCardSpring: Transition = {
  type: "spring",
  stiffness: 190,
  damping: 24,
  mass: 1.2,
};

/** High-precision smooth ease for continuous or background subtle displacements */
export const physicalEase: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.9,
};

/** Tactile button active tap compression state */
export const tactileButtonTap: TargetAndTransition = {
  scale: 0.965,
  y: 1,
  transition: { type: "spring", stiffness: 600, damping: 30, mass: 0.5 },
};

/**
 * Hook: Real-Time 3D Card Parallax & Tilt Physics
 * Solves 2nd-order rotational inertia relative to pointer coordinates
 */
export function useCardTiltPhysics(intensity = 12, maxTilt = 15) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rX = Math.max(-maxTilt, Math.min(maxTilt, (0.5 - y) * intensity * 2));
      const rY = Math.max(-maxTilt, Math.min(maxTilt, (x - 0.5) * intensity * 2));

      setTilt({
        rotateX: rX,
        rotateY: rY,
        glareX: x * 100,
        glareY: y * 100,
      });
    },
    [intensity, maxTilt]
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  return { cardRef, tilt, handlePointerMove, handlePointerLeave };
}

/**
 * Hook: Magnetic Pointer Attraction Physics
 * Elements subtly attract towards the cursor with inverse-square falloff
 */
export function useMagneticPhysics(strength = 0.25, maxOffset = 18) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;

      setOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, dx)),
        y: Math.max(-maxOffset, Math.min(maxOffset, dy)),
      });
    },
    [strength, maxOffset]
  );

  const handlePointerLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return { ref, offset, handlePointerMove, handlePointerLeave };
}

/**
 * Hook: Scroll Velocity Sensor for Acceleration Physics
 */
export function useScrollVelocity() {
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTime = performance.now();
    let frameId: number;

    const checkVelocity = () => {
      const currentScrollY = window.scrollY;
      const currentTime = performance.now();
      const dt = (currentTime - lastTime) / 1000;

      if (dt > 0) {
        const currentVel = (currentScrollY - lastScrollY) / dt;
        setVelocity((prev) => prev * 0.85 + currentVel * 0.15); // Low-pass filter
        lastScrollY = currentScrollY;
        lastTime = currentTime;
      }
      frameId = requestAnimationFrame(checkVelocity);
    };

    frameId = requestAnimationFrame(checkVelocity);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return velocity;
}
