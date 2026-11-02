"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Theme bootstrap script — shared between the root layout (which renders it
 * as the first inline <script> in <body>, so it runs before first paint) and
 * the middleware.
 *
 * Strict Light-First Architecture:
 * - Default theme is ALWAYS 'light'.
 * - Public marketing and auth routes (/, /register, /login, /pricing, etc.) are
 *   strictly light mode.
 * - Any legacy stale 'dark' localStorage setting is cleared so the app
 *   cleanly defaults to light mode across all devices.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=window.location.pathname||"";var isDashboard=p.startsWith("/dashboard");var t=localStorage.getItem("qr_theme_mode");var dark=isDashboard&&t==="dark";var d=document.documentElement;d.classList.remove("dark","dark-mode","light-mode");if(dark){d.classList.add("dark","dark-mode");d.setAttribute("data-theme","dark");d.style.colorScheme="dark";}else{d.classList.add("light-mode");d.setAttribute("data-theme","light");d.style.colorScheme="light";}}catch(e){var doc=document.documentElement;doc.classList.remove("dark","dark-mode");doc.classList.add("light-mode");doc.setAttribute("data-theme","light");doc.style.colorScheme="light";}})();`;

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
  try {
    localStorage.setItem("qr_theme_mode", theme);
    localStorage.setItem("qr_theme", theme);
  } catch (err) {}
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove("light-mode", "dark-mode", "dark");
  document.documentElement.classList.add(
    theme === "dark" ? "dark-mode" : "light-mode"
  );
  if (theme === "dark") document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = theme;
}

/**
 * Central theme hook. Default is light mode.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    const saved = localStorage.getItem("qr_theme_mode") || localStorage.getItem("qr_theme");
    if (saved === "light" || !saved) {
      setIsDark(false);
    } else if (saved === "dark") {
      setIsDark(true);
    }
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setIsDark(detail === "dark");
    };
    window.addEventListener("qr-theme-change", onThemeChange);
    return () => window.removeEventListener("qr-theme-change", onThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme = current === "dark" ? "light" : "dark";

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
