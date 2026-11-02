"use client";

/**
 * ============================================================================
 *  QuickReply — Dashboard Ultra-Smooth Container Scroll Provider
 *  src/frontend/components/providers/DashboardScrollProvider.tsx
 * ============================================================================
 */

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { motionClock } from "@/frontend/lib/motion/MotionClock";

interface DashboardScrollProviderProps {
  children: React.ReactNode;
}

export function DashboardScrollProvider({
  children,
}: DashboardScrollProviderProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    // Respect reduced motion accessibility
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    // Initialize Lenis bound specifically to the dashboard container
    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      autoResize: true,
    });

    lenisRef.current = lenis;

    // Hook into centralized master motion clock
    const unsubscribe = motionClock.subscribe((_, timestamp) => {
      lenis.raf(timestamp);
    });

    // ResizeObserver for dynamic data widgets & accordion updates
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
      unsubscribe();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll to top on dashboard sub-route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else if (wrapperRef.current) {
      wrapperRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <main
      ref={wrapperRef}
      id="dashboard-main-scroll"
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar min-w-0 scroll-smooth transform-gpu"
    >
      <div ref={contentRef} className="max-w-[1400px] w-full min-w-0 mx-auto page-enter pb-24">
        {children}
      </div>
    </main>
  );
}

export default DashboardScrollProvider;
