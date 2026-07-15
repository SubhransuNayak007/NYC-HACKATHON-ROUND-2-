"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Auto-refresh JWT access token before it expires.
 *
 * The JWT expires in 15 minutes. This hook runs a background
 * refresh at the 13-minute mark (120s before expiry) so the
 * user never experiences a login loop.
 *
 * Call once in the root layout or dashboard layout.
 */
export function useAutoRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        // Refresh token expired — force re-login
        console.warn("[Auth] Refresh failed, redirecting to login");
        window.location.href = "/login";
      }
    } catch {
      // Network error — silently retry on next interval
      console.warn("[Auth] Refresh network error, will retry");
    }
  }, []);

  useEffect(() => {
    // Refresh every 13 minutes (JWT is 15 min, so this gives 2 min buffer)
    const TWELVE_MINUTES = 12 * 60 * 1000;
    intervalRef.current = setInterval(refresh, TWELVE_MINUTES);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);
}
