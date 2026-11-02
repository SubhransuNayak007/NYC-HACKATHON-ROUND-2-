"use client";

import React, { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export interface SmoothScrollProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  // Enforce strict light-mode on public marketing and auth pages across all client navigations
  useEffect(() => {
    try {
      const isDashboard = pathname ? pathname.startsWith("/dashboard") : false;
      const saved = typeof window !== "undefined" ? localStorage.getItem("qr_theme_mode") : null;
      const isDark = isDashboard && saved === "dark";
      const d = document.documentElement;

      d.classList.remove("dark", "dark-mode", "light-mode");
      if (isDark) {
        d.classList.add("dark", "dark-mode");
        d.setAttribute("data-theme", "dark");
        d.style.colorScheme = "dark";
      } else {
        d.classList.add("light-mode");
        d.setAttribute("data-theme", "light");
        d.style.colorScheme = "light";
      }
    } catch (e) {
      // safe fallback
    }
  }, [pathname]);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.0,
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Delegated anchor link click handler with Lenis smooth scroll
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          const headerOffset = 88; // Floating glass nav height + clearance
          lenis.scrollTo(el as HTMLElement, {
            offset: -headerOffset,
            duration: prefersReducedMotion ? 0 : 1.15,
          });

          if (window.history.pushState) {
            window.history.pushState(null, "", href);
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, { passive: false });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", handleAnchorClick);
      lenis.destroy();
      delete window.__lenis;
      lenisRef.current = null;
    };
  }, []);

  // Route change: reset scroll position to top
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname]);

  return <>{children}</>;
}

export default SmoothScrollProvider;
