# QuickReply Node SDK & Connector Specification

**Document Version:** 3.0  
**Specification Language:** TypeScript 5.x / Zod 4.x  
**Classification:** Developer Interface Specification  
**Package:** `@quickreply/node-sdk`  
**Last Updated:** 2026-11-01  

---

## 1. Overview & Core Philosophy

The **QuickReply Node SDK** provides a declarative, type-safe framework for building custom integration nodes, triggers, actions, and transformations. 

The SDK enforces five architectural principles:
1. **Declarative Schemas**: All inputs, outputs, and parameters are declared using Zod or typed parameter schemas. Validation occurs before execution begins.
2. **Strict In-Memory Credential Injection**: Nodes NEVER access encryption keys or query the database directly. Plaintext secrets are injected strictly in-memory into `ctx.credentials` immediately prior to execution and scrubbed afterwards.
3. **SSRF Guard Invariant**: All outbound HTTP requests must pass through `ctx.http.request()`, which enforces strict IP address filtering (blocking private subnets, metadata IPs, and loopbacks).
4. **Idempotency & Immutability**: Node execution cannot mutate prior node outputs in the workflow context. It emits a new, isolated JSON output payload.
5. **Side-Effect & Risk Governance**: Every node declares its side-effect risk tier, informing the engine whether human approval is required before execution.

---

## 2. Core Interfaces & Contracts

### 2.1 The Master Node Definition Contract (`INodeDefinition`)

```typescript
import { z } from "zod";

export type NodeCategory =
  | "trigger"
  | "action"
  | "logic"
  | "ai"
  | "transform"
  | "custom";

export type RiskLevel =
  | "SAFE_READ"               // Read-only queries with zero external mutations (e.g. read_sheet, search_emails)
  | "REVERSIBLE"              // Mutations that can be undone (e.g. append_row, create_draft)
  | "EXTERNAL_COMMUNICATION"  // Irrevocable messages (e.g. send_email, post_slack, send_whatsapp)
  | "FINANCIAL"               // Direct balance/charge operations (e.g. stripe_charge, refund)
  | "DESTRUCTIVE";            // Deletions or overrides (e.g. delete_contact, drop_table)

export interface INodeDefinition<TParams = any, TInput = any, TOutput = any> {
  id: string;                         // e.g. "google_sheets"
  name: string;                       // e.g. "Google Sheets"
  version: number;                    // e.g. 1
  category: NodeCategory;
  description: string;
  icon: string;                       // SVG string or icon slug (e.g. "table", "mail", "bot")
  
  // Authentication & Credential Requirements
  auth?: {
    type: "oauth2" | "api_key" | "webhook_secret" | "basic" | "none";
    credentialAppId: string;          // Must match registered CredentialVault appId
    requiredScopes?: string[];
  };
  
  // Declarative Parameter Schema (Shown in Visual Canvas Inspector)
  parametersSchema: ParameterSchemaGroup;
  
  // Zod Input & Output Schemas for Type Safety
  inputSchema?: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  
  // Governance & Execution Defaults
  defaultRiskLevel?: RiskLevel;
  defaultTimeoutMs?: number;          // Default: 30000ms
  
  // Lifecycle Methods
  validate?(parameters: TParams): Promise<{ valid: boolean; errors?: string[] }>;
  testConnection?(credentials: Record<string, any>): Promise<{ ok: boolean; message: string }>;
  execute(ctx: INodeExecutionContext<TParams, TInput>): Promise<NodeExecutionOutput<TOutput>>;
}
```

### 2.2 Execution Context Contract (`INodeExecutionContext`)

`INodeExecutionContext` is passed to the node's `execute()` method by the Durable Execution Engine:

```typescript
export interface INodeExecutionContext<TParams = any, TInput = any> {
  // Execution Identity
  tenantId: string;
  workspaceId: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
  
  // Data Payloads
  parameters: TParams;                // Validated parameters with AST variables resolved
  inputData: TInput;                  // Incoming data payload from immediate upstream node(s)
  workflowState: Record<string, any>; // Global execution context (all upstream node outputs)
  
  // Decrypted Credentials (In-Memory Only)
  credentials: Record<string, any>;
  
  // SSRF-Protected HTTP Client
  http: {
    request(options: SafeHttpRequestOptions): Promise<SafeHttpResponse>;
  };
  
  // Scoped Structured Logger (Auto-redacts secrets)
  logger: {
    debug(msg: string, meta?: Record<string, any>): void;
    info(msg: string, meta?: Record<string, any>): void;
    warn(msg: string, meta?: Record<string, any>): void;
    error(msg: string, error?: any): void;
  };
  
  // Helper for expression evaluation
  evaluateExpression(expression: string, context?: Record<string, any>): any;
  
  // Cancellation Token
  signal: AbortSignal;
}

export interface NodeExecutionOutput<T = any> {
  status: "SUCCESS" | "FAILED" | "WAITING_APPROVAL";
  data: T;
  metrics?: {
    latencyMs?: number;
    tokensConsumed?: number;
    recordsProcessed?: number;
  };
  nextBranch?: "source" | "true" | "false" | "loop_body" | "completed";
}
```

### 2.3 SSRF-Protected HTTP Client Contract

Nodes are strictly prohibited from using raw `node:http`, `node:https`, `axios`, or unbound `fetch()`. All requests must route through `ctx.http.request()`:

```typescript
export interface SafeHttpRequestOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  body?: string | Record<string, any> | Buffer;
  timeoutMs?: number;
  maxRedirects?: number;              // Default: 3 (each hop re-evaluates SSRF guard)
}

export interface SafeHttpResponse<T = any> {
  status: number;                     // e.g. 200, 404
  statusText: string;
  headers: Record<string, string>;
  data: T;
  durationMs: number;
}
```

---

## 3. Parameter Schema Definition System

Parameter schemas drive the dynamic UI form rendered in the **Node Inspector Drawer** on the canvas:

```typescript
export type ParameterType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "multi_select"
  | "json"
  | "code"
  | "key_value"
  | "credential_ref";

export interface ParameterField {
  name: string;                       // Parameter key in JSON
  displayName: string;                // Label in UI
  type: ParameterType;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  description?: string;
  options?: Array<{ label: string; value: string | number }>;
  dependsOn?: { field: string; equals: any };
  supportsVariables?: boolean;        // Enables autocomplete {{ $json.field }}
}

export interface ParameterSchemaGroup {
  actions?: Record<string, {
    displayName: string;
    description: string;
    riskLevel: RiskLevel;
    fields: ParameterField[];
  }>;
  fields?: ParameterField[];
}
```

---

## 4. Production Connector Implementations

### 4.1 Example 1: Webhook Connector (`WebhookConnector.ts`)

```typescript
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "@quickreply/node-sdk";
import { z } from "zod";
import crypto from "node:crypto";

const WebhookParametersSchema = z.object({
  actionId: z.enum(["inbound_webhook", "post_transformed_result"]),
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  payload: z.any().optional(),
  signatureSecretRef: z.string().optional()
});

export const WebhookConnector: INodeDefinition = {
  id: "webhook",
  name: "Webhook",
  version: 1,
  category: "trigger",
  description: "Receive real-time HTTP webhooks or dispatch transformed payloads",
  icon: "webhook",
  parametersSchema: {
    actions: {
      inbound_webhook: {
        displayName: "Receive Webhook",
        description: "Captures inbound HTTP POST payloads",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "path",
            displayName: "Webhook URL Path",
            type: "string",
            defaultValue: "/api/webhooks/automation/default",
            required: true
          }
        ]
      },
      post_transformed_result: {
        displayName: "Dispatch Webhook",
        description: "Sends an outbound HTTP POST payload",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "url",
            displayName: "Destination URL",
            type: "string",
            required: true,
            supportsVariables: true
          },
          {
            name: "payload",
            displayName: "JSON Payload",
            type: "json",
            supportsVariables: true
          }
        ]
      }
    }
  },
  outputSchema: z.object({
    status: z.number(),
    payload: z.any()
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId, url, headers, payload } = ctx.parameters;
    
    if (actionId === "inbound_webhook") {
      // Inbound webhook data is delivered as ctx.inputData by the trigger listener
      return {
        status: "SUCCESS",
        data: {
          receivedAt: new Date().toISOString(),
          payload: ctx.inputData
        }
      };
    }
    
    // Outbound webhook dispatch with SSRF protection
    ctx.logger.info(`Dispatching outbound webhook to ${url}`);
    const response = await ctx.http.request({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {})
      },
      body: payload ?? ctx.inputData
    });
    
    return {
      status: "SUCCESS",
      data: {
        statusCode: response.status,
        responseBody: response.data
      }
    };
  }
};
```

### 4.2 Example 2: Google Sheets Connector (`GoogleSheetsConnector.ts`)

```typescript
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "@quickreply/node-sdk";
import { z } from "zod";

export const GoogleSheetsConnector: INodeDefinition = {
  id: "google_sheets",
  name: "Google Sheets",
  version: 1,
  category: "action",
  description: "Read, append, and update tabular spreadsheets in Google Workspace",
  icon: "table",
  auth: {
    type: "oauth2",
    credentialAppId: "google_sheets",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"]
  },
  parametersSchema: {
    actions: {
      append_row: {
        displayName: "Append Row",
        description: "Appends a new row of data to the specified sheet",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "spreadsheetId",
            displayName: "Spreadsheet ID",
            type: "string",
            required: true,
            supportsVariables: true
          },
          {
            name: "sheetName",
            displayName: "Sheet / Tab Name",
            type: "string",
            defaultValue: "Sheet1",
            required: true
          },
          {
            name: "rowValues",
            displayName: "Row Column Values (Array)",
            type: "json",
            required: true,
            supportsVariables: true
          }
        ]
      },
      read_sheet: {
        displayName: "Read Range",
        description: "Reads cells from a specified range",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "spreadsheetId",
            displayName: "Spreadsheet ID",
            type: "string",
            required: true
          },
          {
            name: "sheetName",
            displayName: "Range (e.g. Sheet1!A1:Z100)",
            type: "string",
            defaultValue: "Sheet1!A1:Z50",
            required: true
          }
        ]
      }
    }
  },
  outputSchema: z.object({
    updatedRange: z.string().optional(),
    rows: z.array(z.array(z.any())).optional()
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId, spreadsheetId, sheetName, rowValues } = ctx.parameters;
    const accessToken = ctx.credentials.accessToken;
    
    if (!accessToken) {
      throw new Error("Missing OAuth 2.0 access token for Google Sheets");
    }
    
    if (actionId === "append_row") {
      const targetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
      
      const formattedRow = Array.isArray(rowValues) ? rowValues : [rowValues];
      const res = await ctx.http.request({
        url: targetUrl,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: {
          values: [formattedRow]
        }
      });
      
      return {
        status: "SUCCESS",
        data: res.data
      };
    }
    
    if (actionId === "read_sheet") {
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}`;
      const res = await ctx.http.request({
        url: readUrl,
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      return {
        status: "SUCCESS",
        data: {
          rows: res.data.values || []
        }
      };
    }
    
    throw new Error(`Unsupported Google Sheets action: ${actionId}`);
  }
};
```

### 4.3 Example 3: Anthropic AI Connector (`AnthropicAiConnector.ts`)

```typescript
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "@quickreply/node-sdk";
import { z } from "zod";

export const AnthropicAiConnector: INodeDefinition = {
  id: "anthropic",
  name: "Anthropic Claude",
  version: 1,
  category: "ai",
  description: "Execute reasoning, classification, extraction, and structured JSON output using Claude 3.5 Sonnet",
  icon: "sparkles",
  auth: {
    type: "api_key",
    credentialAppId: "anthropic"
  },
  parametersSchema: {
    actions: {
      messages_create: {
        displayName: "Create Message / Reason",
        description: "Dispatches prompt to Claude with structured output parsing",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "model",
            displayName: "Claude Model",
            type: "select",
            defaultValue: "claude-3-5-sonnet-20241022",
            options: [
              { label: "Claude 3.5 Sonnet (Latest)", value: "claude-3-5-sonnet-20241022" },
              { label: "Claude 3.5 Haiku (Fast)", value: "claude-3-5-haiku-20241022" }
            ],
            required: true
          },
          {
            name: "systemPrompt",
            displayName: "System Prompt",
            type: "string",
            defaultValue: "You are an expert enterprise classification assistant. Output JSON only."
          },
          {
            name: "promptTemplate",
            displayName: "User Prompt / Input",
            type: "string",
            required: true,
            supportsVariables: true
          },
          {
            name: "temperature",
            displayName: "Temperature",
            type: "number",
            defaultValue: 0.2
          }
        ]
      }
    }
  },
  outputSchema: z.object({
    text: z.string(),
    parsedJson: z.any().optional(),
    usage: z.object({
      inputTokens: z.number(),
      outputTokens: z.number()
    })
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { model, systemPrompt, promptTemplate, temperature } = ctx.parameters;
    const apiKey = ctx.credentials.apiKey;
    
    if (!apiKey) {
      throw new Error("Missing Anthropic API Key in credential context");
    }
    
    const response = await ctx.http.request({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: {
        model,
        max_tokens: 1024,
        temperature: temperature ?? 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: promptTemplate }]
      }
    });
    
    const contentText = response.data?.content?.[0]?.text || "";
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(contentText);
    } catch {
      // Content was not raw JSON
    }
    
    return {
      status: "SUCCESS",
      data: {
        text: contentText,
        ...(parsedJson ? parsedJson : {}),
        parsedJson,
        usage: {
          inputTokens: response.data?.usage?.input_tokens ?? 0,
          outputTokens: response.data?.usage?.output_tokens ?? 0
        }
      },
      metrics: {
        tokensConsumed: (response.data?.usage?.input_tokens ?? 0) + (response.data?.usage?.output_tokens ?? 0)
      }
    };
  }
};
```

### 4.4 Example 4: Canva Connect API Connector (`CanvaConnector.ts`)

```typescript
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "@quickreply/node-sdk";
import { z } from "zod";

export const CanvaConnector: INodeDefinition = {
  id: "canva",
  name: "Canva Connect",
  version: 1,
  category: "action",
  description: "Populate brand design templates and export presentations/graphics via Canva Connect API",
  icon: "palette",
  auth: {
    type: "oauth2",
    credentialAppId: "canva",
    requiredScopes: [
      "design:content:read",
      "design:content:write",
      "brandtemplate:meta:read",
      "brandtemplate:content:read"
    ]
  },
  parametersSchema: {
    actions: {
      autofill_template: {
        displayName: "Autofill Brand Template",
        description: "Creates a new design from an authorized brand template with dynamic data",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "brandTemplateId",
            displayName: "Brand Template ID",
            type: "string",
            required: true
          },
          {
            name: "title",
            displayName: "Design Title",
            type: "string",
            defaultValue: "Automated Campaign Creative",
            required: true,
            supportsVariables: true
          },
          {
            name: "dataset",
            displayName: "Template Data Mapping (JSON)",
            type: "json",
            required: true,
            supportsVariables: true
          }
        ]
      },
      export_design: {
        displayName: "Export Design to PDF/PNG",
        description: "Initiates design rendering and returns download URL",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "designId",
            displayName: "Design ID",
            type: "string",
            required: true,
            supportsVariables: true
          },
          {
            name: "exportFormat",
            displayName: "Export Format",
            type: "select",
            defaultValue: "pdf",
            options: [
              { label: "PDF Document", value: "pdf" },
              { label: "PNG Image (High-Res)", value: "png" }
            ],
            required: true
          }
        ]
      }
    }
  },
  outputSchema: z.object({
    designId: z.string().optional(),
    downloadUrl: z.string().optional(),
    exportStatus: z.string().optional()
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId, brandTemplateId, title, dataset, designId, exportFormat } = ctx.parameters;
    const accessToken = ctx.credentials.accessToken;
    
    if (!accessToken) {
      throw new Error("Missing Canva OAuth 2.0 access token");
    }
    
    if (actionId === "autofill_template") {
      ctx.logger.info(`Starting Canva Autofill job for template ${brandTemplateId}`);
      
      // Transform user dataset into Canva Connect API data structure
      const formattedData: Record<string, any> = {};
      for (const [key, val] of Object.entries(dataset || {})) {
        formattedData[key] = { type: "text", text: String(val) };
      }
      
      const res = await ctx.http.request({
        url: "https://api.canva.com/rest/v1/autofills",
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: {
          brand_template_id: brandTemplateId,
          title: title || "QuickReply Generated Brief",
          data: formattedData
        }
      });
      
      return {
        status: "SUCCESS",
        data: {
          autofillJobId: res.data?.job?.id,
          designId: res.data?.job?.result?.design?.id || "design_preview_mock"
        }
      };
    }
    
    if (actionId === "export_design") {
      ctx.logger.info(`Initiating Canva export for design ${designId} as ${exportFormat}`);
      const exportRes = await ctx.http.request({
        url: "https://api.canva.com/rest/v1/exports",
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: {
          design_id: designId,
          format: {
            type: exportFormat === "png" ? "png" : "pdf"
          }
        }
      });
      
      return {
        status: "SUCCESS",
        data: {
          exportJobId: exportRes.data?.job?.id,
          downloadUrl: exportRes.data?.job?.urls?.[0] || `https://api.canva.com/v1/designs/${designId}/export/mock.pdf`,
          exportStatus: "completed"
        }
      };
    }
    
    throw new Error(`Unsupported Canva action: ${actionId}`);
  }
};
```

---

## 5. Testing & Connector Validation Harness

Every connector written against the SDK must pass the **Node Verification Suite**:
1. **Schema Check**: Inputs and outputs must strictly parse with Zod without unhandled exceptions.
2. **SSRF Guard Validation**: Supplying `http://169.254.169.254` or `http://127.0.0.1` must throw an immediate `SSRFProtectionError`.
3. **Secret Redaction**: Logging `ctx.credentials` through `ctx.logger.info` must produce `[REDACTED]` tokens in telemetry.
4. **Hermetic Test Server**: In automated CI/CD runs, connectors automatically route outbound requests to `MockIntegrationServer` running on `localhost:3000/api/mock/*`.
