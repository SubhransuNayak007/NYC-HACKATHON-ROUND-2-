/**
 * QuickReply Universal HTTP Request Connector
 * src/backend/nodes/connectors/HttpConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const HttpConnector: INodeDefinition = {
  id: "http",
  name: "HTTP Request",
  version: 1,
  category: "action",
  description: "Universal REST/JSON client with SSRF guard, custom authentication, and retry policies",
  icon: "globe",
  auth: {
    type: "none",
    credentialAppId: "http",
  },
  parametersSchema: {
    actions: {
      request: {
        displayName: "Send HTTP Request",
        description: "Executes an HTTP request to any external REST endpoint",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "url",
            displayName: "Endpoint URL",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "method",
            displayName: "HTTP Method",
            type: "select",
            defaultValue: "GET",
            options: [
              { label: "GET", value: "GET" },
              { label: "POST", value: "POST" },
              { label: "PUT", value: "PUT" },
              { label: "PATCH", value: "PATCH" },
              { label: "DELETE", value: "DELETE" },
            ],
            required: true,
          },
          {
            name: "headers",
            displayName: "Headers",
            type: "key_value",
          },
          {
            name: "queryParams",
            displayName: "Query Parameters",
            type: "key_value",
          },
          {
            name: "body",
            displayName: "Request Body",
            type: "json",
            supportsVariables: true,
          },
          {
            name: "authType",
            displayName: "Authentication Type",
            type: "select",
            defaultValue: "none",
            options: [
              { label: "None", value: "none" },
              { label: "Bearer Token", value: "bearer" },
              { label: "Basic Auth", value: "basic" },
              { label: "Header Key", value: "api_key" },
            ],
          },
          {
            name: "expectedStatusCodes",
            displayName: "Expected Status Codes",
            type: "json",
            defaultValue: [200, 201, 202, 204],
          },
          {
            name: "timeoutMs",
            displayName: "Timeout (ms)",
            type: "number",
            defaultValue: 30000,
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    status: z.number(),
    statusText: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    data: z.any(),
    durationMs: z.number().optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const {
      url,
      method = "GET",
      headers = {},
      queryParams,
      body,
      authType = "none",
      expectedStatusCodes = [200, 201, 202, 204],
      timeoutMs = 30000,
    } = ctx.parameters;

    if (!url) {
      throw new Error("Missing required 'url' parameter for HTTP Request");
    }

    const requestHeaders: Record<string, string> = { ...headers };

    // Inject credentials based on authType
    if (authType === "bearer" && ctx.credentials?.accessToken) {
      requestHeaders["Authorization"] = `Bearer ${ctx.credentials.accessToken}`;
    } else if (authType === "bearer" && ctx.credentials?.token) {
      requestHeaders["Authorization"] = `Bearer ${ctx.credentials.token}`;
    } else if (authType === "basic" && ctx.credentials?.username && ctx.credentials?.password) {
      const basicStr = Buffer.from(`${ctx.credentials.username}:${ctx.credentials.password}`).toString("base64");
      requestHeaders["Authorization"] = `Basic ${basicStr}`;
    } else if (authType === "api_key" && ctx.credentials?.apiKey) {
      const headerName = ctx.credentials.headerName || "X-API-Key";
      requestHeaders[headerName] = ctx.credentials.apiKey;
    }

    ctx.logger.info(`Sending ${method} request to ${url}`);

    // Retry loop for retryable transient errors (500, 502, 503, 504, 429)
    const maxRetries = 2;
    let attempt = 0;
    let lastError: any = null;
    let response: any = null;

    while (attempt <= maxRetries) {
      try {
        response = await ctx.http.request({
          url,
          method: method as any,
          headers: requestHeaders,
          queryParams,
          body,
          timeoutMs,
        });

        const retryableStatuses = [429, 500, 502, 503, 504];
        if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
          attempt++;
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
          ctx.logger.warn(`Received HTTP ${response.status}. Retrying in ${backoffDelay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, backoffDelay));
          continue;
        }

        break;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          attempt++;
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
          ctx.logger.warn(`HTTP request network failure: ${err.message}. Retrying in ${backoffDelay}ms...`);
          await new Promise((r) => setTimeout(r, backoffDelay));
        } else {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError || new Error(`HTTP request failed after ${maxRetries} retries`);
    }

    // Assert status codes
    const allowedCodes = Array.isArray(expectedStatusCodes) ? expectedStatusCodes : [200, 201, 202, 204];
    if (allowedCodes.length > 0 && !allowedCodes.includes(response.status)) {
      throw new Error(`HTTP request returned unexpected status ${response.status} (expected: ${allowedCodes.join(", ")})`);
    }

    return {
      status: "SUCCESS",
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        durationMs: response.durationMs,
      },
    };
  },
};
