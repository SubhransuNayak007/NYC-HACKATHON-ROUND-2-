"use client";

/**
 * ============================================================
 *  QuickReply — Custom Cursor Field Layer
 *  src/frontend/components/auth/message-machine/interaction/CustomCursorField.tsx
 * ============================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { MM_COLORS } from "../tokens";

interface CustomCursorFieldProps {
  isReducedMotion?: boolean;
}

export function CustomCursorField({ isReducedMotion = false }: CustomCursorFieldProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    if (isReducedMotion) return;

    // Check if touch device
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let haloX = mouseX;
    let haloY = mouseY;
    let reqId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsVisible(true);

      // Check if hovering interactive target
      const target = e.target as HTMLElement | null;
      const isInteractive = !!target?.closest(
        "button, a, input, [data-interactive='true'], [role='button']"
      );
      setIsHovering(isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    const updateCursor = () => {
      // Direct update for center signal point
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }

      // Smooth spring lag for outer halo
      haloX += (mouseX - haloX) * 0.18;
      haloY += (mouseY - haloY) * 0.18;

      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${haloX}px, ${haloY}px, 0) translate(-50%, -50%)`;
      }

      reqId = requestAnimationFrame(updateCursor);
    };

    reqId = requestAnimationFrame(updateCursor);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isReducedMotion]);

  if (isReducedMotion || !isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Outer Halo */}
      <div
        ref={haloRef}
        className="absolute top-0 left-0 rounded-full border border-black/20 transition-[width,height,opacity] duration-150 ease-out"
        style={{
          width: isHovering ? 48 : isClicking ? 24 : 32,
          height: isHovering ? 48 : isClicking ? 24 : 32,
          backgroundColor: isHovering ? "rgba(243, 197, 21, 0.15)" : "transparent",
          borderColor: isHovering ? MM_COLORS.yellowPrimary : "rgba(17, 17, 17, 0.25)",
        }}
      />

      {/* Inner Signal Point */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full bg-[#111111] shadow-2xs transition-[width,height] duration-75"
        style={{
          width: isClicking ? 8 : isHovering ? 6 : 5,
          height: isClicking ? 8 : isHovering ? 6 : 5,
          backgroundColor: isHovering ? MM_COLORS.yellowPrimary : "#111111",
        }}
      />
    </div>
  );
}
