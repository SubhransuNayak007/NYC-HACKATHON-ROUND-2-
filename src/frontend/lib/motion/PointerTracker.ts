/**
 * ============================================================================
 *  QuickReply — High-Performance Pointer Tracker & Compositor Controller
 *  src/frontend/lib/motion/PointerTracker.ts
 * ============================================================================
 *  Direct compositor transform updates with sub-frame spring interpolation.
 *  Zero React re-render cycles during pointer movement.
 */

import { motionClock } from "./MotionClock";
import { SpringValue, SPRING_PRESETS } from "./SpringSolver";

export interface TiltBounds {
  maxRotateX: number; // in degrees, e.g. 7
  maxRotateY: number; // in degrees, e.g. 9
  maxTranslateZ?: number; // in px
}

export function bindCompositorTilt(
  container: HTMLElement,
  targetElement: HTMLElement,
  bounds: TiltBounds = { maxRotateX: 7, maxRotateY: 9, maxTranslateZ: 10 }
): () => void {
  const springX = new SpringValue(0, SPRING_PRESETS.interactiveCard);
  const springY = new SpringValue(0, SPRING_PRESETS.interactiveCard);

  let isHovered = false;

  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to +1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to +1

    springY.setTarget(nx * bounds.maxRotateY);
    springX.setTarget(-ny * bounds.maxRotateX);
  };

  const onPointerEnter = () => {
    isHovered = true;
  };

  const onPointerLeave = () => {
    isHovered = false;
    springX.setTarget(0);
    springY.setTarget(0);
  };

  const unsubscribe = motionClock.subscribe((dt) => {
    const currentRotX = springX.update(dt);
    const currentRotY = springY.update(dt);

    if (!springX.isSettled() || !springY.isSettled() || isHovered) {
      targetElement.style.transform = `perspective(1000px) rotateX(${currentRotX.toFixed(3)}deg) rotateY(${currentRotY.toFixed(3)}deg) translateZ(${isHovered ? (bounds.maxTranslateZ || 0) : 0}px)`;
    }
  });

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerenter", onPointerEnter, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });

  return () => {
    unsubscribe();
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerenter", onPointerEnter);
    container.removeEventListener("pointerleave", onPointerLeave);
  };
}
