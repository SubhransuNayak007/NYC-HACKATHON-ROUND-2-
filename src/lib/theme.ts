"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Theme bootstrap script — shared between the root layout (which renders it
 * as the first inline <script> in <body>, so it runs before first paint) and
 * the middleware (which whitelists it in the CSP via its SHA-256 hash).
 *
 * NOTE: If you edit this string, the CSP hash computed in src/middleware.ts
 * automatically follows (it is derived at runtime from this same constant),
 * so there is nothing else to keep in sync.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("qr_theme");var d=document.documentElement;var dark=t==="dark";d.classList.toggle("dark-mode",dark);d.classList.toggle("light-mode",!dark);d.setAttribute("data-theme",dark?"dark":"light");d.style.colorScheme=dark?"dark":"light";}catch(e){document.documentElement.classList.remove("dark-mode");document.documentElement.classList.add("light-mode");document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light";}})();`;

export type Theme = "dark" | "light";

/**
 * Read the theme the layout's FOUC script already applied to <html>, so the
 * first client render matches the saved theme (no flash/flip).
 */
export function getInitialDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/**
 * Apply a theme to the DOM + localStorage. Runs inside a View Transition when
 * available so the cross-fade captures the fully-updated page in its "new"
 * snapshot.
 */
function applyTheme(theme: Theme, setIsDark: (v: boolean) => void) {
  flushSync(() => setIsDark(theme === "dark"));
  localStorage.setItem("qr_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove("light-mode", "dark-mode");
  document.documentElement.classList.add(
    theme === "dark" ? "dark-mode" : "light-mode"
  );
  document.documentElement.style.colorScheme = theme;
}

/**
 * Central theme hook. The DOM (<html data-theme="...">) is the single source
 * of truth:
 *
 *  1. Initial state is read from `document.documentElement.getAttribute("data-theme")`
 *     via `getInitialDark()` — whatever the FOUC script in <body> applied.
 *  2. `toggleTheme()` reads the *current* DOM theme (not possibly-stale React
 *     state), flips it, sets `data-theme` + `dark-mode`/`light-mode` classes
 *     on <html>, persists to localStorage (`qr_theme`) and broadcasts a
 *     `qr-theme-change` event so every subscribed component re-renders.
 *  3. Falls back to `document.startViewTransition()` for a native cross-fade
 *     when the browser supports it (Chrome 111+, Firefox 144+, Safari 18+).
 */
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  // Re-sync from localStorage on mount, and follow external theme changes
  // (another tab, another toggle on the page, the ThemeTaskbar, etc.).
  useEffect(() => {
    const saved = localStorage.getItem("qr_theme");
    if (saved === "light") setIsDark(false);
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setIsDark(detail !== "light");
    };
    window.addEventListener("qr-theme-change", onThemeChange);
    return () => window.removeEventListener("qr-theme-change", onThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    // Read the current theme straight from the DOM — the source of truth.
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme = current === "light" ? "dark" : "light";

    const doApply = () => applyTheme(next, setIsDark);

    const doc = document as Document & {
      startViewTransition?: (update?: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(doApply);
    } else {
      doApply();
    }

    window.dispatchEvent(new CustomEvent("qr-theme-change", { detail: next }));
  }, []);

  return { isDark, toggleTheme };
}
