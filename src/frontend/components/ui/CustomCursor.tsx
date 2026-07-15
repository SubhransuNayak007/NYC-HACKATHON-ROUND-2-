"use client";

import React, { useEffect, useState, useRef } from "react";

interface CursorState {
  variant: "default" | "cta" | "link";
  size: number;
}

export default function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(true);
  const [cursorState, setCursorState] = useState<CursorState>({ variant: "default", size: 32 });
  const [visible, setVisible] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmall = window.innerWidth < 768;
    setIsTouch(hasTouch || isSmall);
    if (hasTouch || isSmall) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setVisible(true);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    };

    const render = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role='button'], [data-cursor='cta']")) {
        setCursorState({ variant: "cta", size: 48 });
      } else {
        setCursorState({ variant: "default", size: 32 });
      }
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  if (!mounted || isTouch) return null;

  return (
    <>
      {/* Center dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full bg-white transition-opacity duration-200"
        style={{
          width: 8,
          height: 8,
          opacity: visible ? 1 : 0,
          mixBlendMode: "difference",
          willChange: "transform",
        }}
      />
      {/* Outer glow ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[99998] rounded-full transition-all duration-300"
        style={{
          width: cursorState.size,
          height: cursorState.size,
          opacity: visible ? 1 : 0,
          background: "radial-gradient(circle, rgba(232, 185, 49, 0.45) 0%, transparent 70%)",
          willChange: "transform",
        }}
      />
    </>
  );
}
