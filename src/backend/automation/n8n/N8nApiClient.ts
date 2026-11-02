/**
 * ============================================================================
 * QuickReply AI Automation Operating System — n8n REST API Client
 * src/backend/automation/n8n/N8nApiClient.ts
 *
 * Provides:
 * 1. SSRF-defended instance URL normalization & DNS/IP filtering
 * 2. Real Public REST API connection verification (GET /api/v1/workflows?limit=1)
 * 3. Real workflow deployment (POST /api/v1/workflows) with X-N8N-API-KEY
 * 4. Idempotency key forwarding
 * 5. Deterministic editor URL construction (https://<instance>/workflow/<id>)
 * ============================================================================
 */

import dns from "dns/promises";
import net from "net";
import { N8nCompiledWorkflow } from "../compiler/WorkflowCompiler";

export interface N8nConnectionTestResult {
  ok: boolean;
  instanceUrl: string;
  error?: string;
  statusText?: string;
  workflowCount?: number;
}

export interface N8nWorkflowCreationResult {
  success: boolean;
  workflowId: string;
  name: string;
  editorUrl: string;
  nodesCount: number;
  active: boolean;
  rawResponse?: any;
  error?: string;
}

export class N8nApiClient {
  /**
   * SSRF Protection & URL Sanitizer
   * Validates instance URL against private IP blocks, AWS metadata service, and loopbacks in production.
   */
  static async validateAndNormalizeUrl(rawUrl: string): Promise<string> {
    if (!rawUrl || typeof rawUrl !== "string") {
      throw new Error("n8n instance URL must be a non-empty string.");
    }

    const trimmed = rawUrl.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error(`Invalid URL format: "${trimmed}". Please provide a valid URL like https://workspace.app.n8n.cloud`);
    }

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`);
    }

    const isProduction = process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_N8N !== "true";
    const hostname = parsed.hostname.toLowerCase();

    // Check if host is raw IP or hostname
    if (isProduction) {
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") {
        throw new Error("Access to local loopback addresses is prohibited in production.");
      }

      // Check for AWS/GCP/Azure link-local metadata endpoints
      if (hostname === "169.254.169.254" || hostname.startsWith("169.254.")) {
        throw new Error("Access to link-local and cloud metadata addresses is prohibited.");
      }

      // If hostname is an IPv4 address, inspect RFC 1918 private ranges
      if (net.isIPv4(hostname)) {
        if (this.isPrivateIPv4(hostname)) {
          throw new Error("Access to private RFC1918 IP addresses is prohibited in production.");
        }
      } else {
        // Resolve DNS and check resulting IP
        try {
          const resolved = await dns.lookup(hostname);
          if (this.isPrivateIPv4(resolved.address)) {
            throw new Error(`Hostname "${hostname}" resolves to private network address ${resolved.address}. Access denied.`);
          }
        } catch (err: any) {
          if (err.message && err.message.includes("Access denied")) {
            throw err;
          }
          // If DNS fails to resolve
          throw new Error(`Unable to resolve hostname "${hostname}": ${err.message || "DNS lookup failed"}`);
        }
      }
    }

    // Normalize: remove trailing slashes
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
    return normalized;
  }

  /**
   * Helper to identify private/loopback IPv4 addresses
   */
  private static isPrivateIPv4(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) return false;

    // Loopback 127.0.0.0/8
    if (parts[0] === 127) return true;
    // Current network (0.0.0.0/8)
    if (parts[0] === 0) return true;
    // Private 10.0.0.0/8
    if (parts[0] === 10) return true;
    // Private 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // Private 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // Link-local 169.254.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true;

    return false;
  }

  /**
   * Constructs the direct editor URL for an n8n workflow
   */
  static constructEditorUrl(instanceUrl: string, workflowId: string): string {
    const cleanBase = instanceUrl.replace(/\/+$/, "");
    return `${cleanBase}/workflow/${encodeURIComponent(workflowId)}`;
  }

  /**
   * Test connection to user's n8n instance using official REST API
   * GET /api/v1/workflows?limit=1 with X-N8N-API-KEY
   */
  static async testConnection(rawInstanceUrl: string, apiKey: string): Promise<N8nConnectionTestResult> {
    try {
      const normalizedUrl = await this.validateAndNormalizeUrl(rawInstanceUrl);
      if (!apiKey || !apiKey.trim()) {
        return {
          ok: false,
          instanceUrl: normalizedUrl,
          error: "API key is required. Obtain it from n8n Settings > n8n API > Create an API Key.",
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const targetEndpoint = `${normalizedUrl}/api/v1/workflows?limit=1`;
      const response = await fetch(targetEndpoint, {
        method: "GET",
        headers: {
          "X-N8N-API-KEY": apiKey.trim(),
          "Accept": "application/json",
          "User-Agent": "QuickReply-AI-Automation-OS/2.0",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        const count = Array.isArray(body?.data) ? body.data.length : undefined;
        return {
          ok: true,
          instanceUrl: normalizedUrl,
          statusText: "Connection verified successfully.",
          workflowCount: count,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          instanceUrl: normalizedUrl,
          error: `Authentication failed (HTTP ${response.status}). Verify your n8n API key is active with adequate permissions.`,
        };
      }

      if (response.status === 404) {
        return {
          ok: false,
          instanceUrl: normalizedUrl,
          error: `Endpoint not found (HTTP 404). Ensure n8n Public API is enabled and your instance URL is correct: "${normalizedUrl}".`,
        };
      }

      const errorText = await response.text().catch(() => "");
      return {
        ok: false,
        instanceUrl: normalizedUrl,
        error: `n8n responded with error status HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          ok: false,
          instanceUrl: rawInstanceUrl,
          error: "Connection timed out after 7 seconds. Ensure your n8n instance is publicly accessible and responsive.",
        };
      }
      return {
        ok: false,
        instanceUrl: rawInstanceUrl,
        error: err.message || "Unable to connect to n8n instance.",
      };
    }
  }

  /**
   * Create Workflow in user's n8n instance via official REST API
   * POST /api/v1/workflows
   *
   * Workflows are intentionally created in an inactive draft state (`active: false`)
   * so users can configure credentials and review mappings before turning them on.
   */
  static async createWorkflow(
    rawInstanceUrl: string,
    apiKey: string,
    workflow: N8nCompiledWorkflow,
    options?: { idempotencyKey?: string }
  ): Promise<N8nWorkflowCreationResult> {
    const normalizedUrl = await this.validateAndNormalizeUrl(rawInstanceUrl);

    if (!apiKey || !apiKey.trim()) {
      throw new Error("Missing n8n API key.");
    }

    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || { executionOrder: "v1" },
      active: false, // Strict safety: created as inactive draft for user review
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey.trim(),
      "Accept": "application/json",
      "User-Agent": "QuickReply-AI-Automation-OS/2.0",
    };

    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${normalizedUrl}/api/v1/workflows`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errJson = await response.json();
          errorDetails = errJson.message || errJson.error || JSON.stringify(errJson);
        } catch {
          errorDetails = await response.text();
        }
        throw new Error(
          `n8n workflow creation failed (HTTP ${response.status}): ${errorDetails || response.statusText}`
        );
      }

      const responseData = await response.json();
      const workflowId = String(responseData.id || responseData.data?.id);

      if (!workflowId || workflowId === "undefined") {
        throw new Error("n8n API succeeded but did not return a valid workflow ID.");
      }

      const editorUrl = this.constructEditorUrl(normalizedUrl, workflowId);

      return {
        success: true,
        workflowId,
        name: responseData.name || workflow.name,
        editorUrl,
        nodesCount: workflow.nodes.length,
        active: Boolean(responseData.active),
        rawResponse: responseData,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Request to n8n instance timed out after 12 seconds.");
      }
      throw err;
    }
  }
}
