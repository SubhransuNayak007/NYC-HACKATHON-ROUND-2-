/**
 * ============================================================================
 *  QuickReply — SSRF Guard
 *  src/backend/ssrf-guard.ts
 *
 *  Purpose:
 *    Validate any user-provided or provider-provided URL before performing
 *    a server-side fetch, preventing Server-Side Request Forgery (SSRF).
 *
 *  Approach:
 *    • Block known-dangerous IP ranges (RFC1918, loopback, link-local, metadata)
 *    • Resolve DNS and re-validate the resolved IP
 *    • Allowlist approach for external provider calls
 *
 *  OWASP: API7:2023 — Server-Side Request Forgery
 * ============================================================================
 */

import dns from "dns/promises";
import net from "net";

export class SsrfError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = "SsrfError";
  }
}

// IP ranges that must never be fetched as a server-side target
const BLOCKED_CIDRS: Array<{ network: bigint; mask: bigint; label: string }> = [
  // Loopback
  { network: ipToBigInt("127.0.0.0"), mask: cidrMask(8),   label: "loopback" },
  // RFC1918 private
  { network: ipToBigInt("10.0.0.0"),   mask: cidrMask(8),   label: "RFC1918-10" },
  { network: ipToBigInt("172.16.0.0"), mask: cidrMask(12),  label: "RFC1918-172" },
  { network: ipToBigInt("192.168.0.0"),mask: cidrMask(16),  label: "RFC1918-192" },
  // Link-local (AWS/GCP/Azure metadata endpoint lives here)
  { network: ipToBigInt("169.254.0.0"),mask: cidrMask(16),  label: "link-local" },
  // APIPA / Shared Address Space
  { network: ipToBigInt("100.64.0.0"), mask: cidrMask(10),  label: "shared-address" },
  // Multicast
  { network: ipToBigInt("224.0.0.0"),  mask: cidrMask(4),   label: "multicast" },
  // Reserved / broadcast
  { network: ipToBigInt("240.0.0.0"),  mask: cidrMask(4),   label: "reserved" },
];

// Known metadata endpoint hostnames (deny regardless of IP resolution)
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "169.254.169.254",
  "metadata",
  "localhost",
  "::1",
]);

// Allowed provider URL prefixes for server-side fetches
// Extend this list as new providers are integrated.
const ALLOWED_PROVIDER_PREFIXES = [
  "https://graph.facebook.com/",
  "https://api.instagram.com/",
  "https://api.linkedin.com/",
  "https://api.telegram.org/",
  "https://api.openai.com/",
  "https://api.anthropic.com/",
  "https://youtube.googleapis.com/",
  "https://www.googleapis.com/",
  "https://oauth2.googleapis.com/",
  "https://accounts.google.com/",
  "https://api.stripe.com/",
  "https://fonts.googleapis.com/",
  "https://fonts.gstatic.com/",
];

function ipToBigInt(ip: string): bigint {
  const parts = ip.split(".").map(Number);
  return parts.reduce((acc, part) => (acc << BigInt(8)) | BigInt(part), BigInt(0));
}

function cidrMask(bits: number): bigint {
  return ((BigInt(1) << BigInt(bits)) - BigInt(1)) << BigInt(32 - bits);
}

function isBlockedIp(ip: string): { blocked: boolean; label?: string } {
  if (!net.isIPv4(ip)) {
    // For IPv6, conservatively allow only if it's a known public range
    // Block loopback and link-local IPv6
    if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
      return { blocked: true, label: "ipv6-private" };
    }
    return { blocked: false };
  }
  const ipBig = ipToBigInt(ip);
  for (const { network, mask, label } of BLOCKED_CIDRS) {
    if ((ipBig & mask) === network) {
      return { blocked: true, label };
    }
  }
  return { blocked: false };
}

/**
 * Validate a URL for server-side fetch.
 *
 * @throws {SsrfError} if the URL is unsafe
 *
 * Usage:
 *   import { validateFetchUrl } from "@/backend/ssrf-guard";
 *   await validateFetchUrl(userProvidedUrl);
 *   const res = await fetch(userProvidedUrl);
 */
export async function validateFetchUrl(
  rawUrl: string,
  options: { allowedProviderOnly?: boolean } = { allowedProviderOnly: false }
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError(`Invalid URL format: ${rawUrl}`, rawUrl);
  }

  // 1. Protocol enforcement — only https allowed for provider calls
  if (parsed.protocol !== "https:") {
    throw new SsrfError(`Unsafe protocol "${parsed.protocol}" — only https: is permitted`, rawUrl);
  }

  // 2. Block known metadata hostnames by name
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfError(`Blocked hostname: ${hostname}`, rawUrl);
  }

  // 3. If the hostname is a raw IP, validate it immediately
  if (net.isIP(hostname)) {
    const { blocked, label } = isBlockedIp(hostname);
    if (blocked) {
      throw new SsrfError(`Blocked IP address (${label}): ${hostname}`, rawUrl);
    }
  }

  // 4. Provider allowlist check (optional strict mode)
  if (options.allowedProviderOnly) {
    const isAllowed = ALLOWED_PROVIDER_PREFIXES.some((prefix) => rawUrl.startsWith(prefix));
    if (!isAllowed) {
      throw new SsrfError(`URL not in provider allowlist: ${hostname}`, rawUrl);
    }
    return; // Allowlisted providers — trust their DNS
  }

  // 5. DNS resolution — resolve and re-validate the IP
  try {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    for (const { address } of addresses) {
      const { blocked, label } = isBlockedIp(address);
      if (blocked) {
        throw new SsrfError(
          `DNS resolved to blocked IP (${label}): ${hostname} -> ${address}`,
          rawUrl
        );
      }
    }
  } catch (err) {
    if (err instanceof SsrfError) throw err;
    // DNS failure is not itself an SSRF — let the fetch handle it
  }
}

/**
 * Safely fetch a URL after SSRF validation.
 * Throws SsrfError for blocked destinations; throws FetchError for network errors.
 *
 * Usage:
 *   const res = await safeFetch(userUrl, { method: "GET" });
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
  options?: { allowedProviderOnly?: boolean }
): Promise<Response> {
  await validateFetchUrl(rawUrl, options);
  return fetch(rawUrl, init);
}
