/**
 * MockIntegrationServer.ts
 * Deterministic local mock server simulating third-party OAuth, Google Sheets,
 * Gmail, Slack, HubSpot, Canva Connect API, Google Drive, AI Providers, and Billing.
 * 
 * Used for hermetic, repeatable opaque-box E2E scenario execution.
 */

import http from "node:http";
import { URL } from "node:url";

export interface RecordedRequest {
  id: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: http.IncomingHttpHeaders;
  body: any;
  timestamp: number;
  service: string;
}

export interface MockServerOptions {
  port?: number;
  host?: string;
  billingFailuresBeforeSuccess?: number;
}

export class MockIntegrationServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private host: string = "127.0.0.1";
  private requests: RecordedRequest[] = [];
  private billingAttemptCounter: number = 0;
  private billingFailuresBeforeSuccess: number = 2;
  private approvals: Map<string, { status: "PENDING" | "APPROVED" | "REJECTED"; payload: any }> = new Map();
  private tokenStore: Map<string, { refreshToken: string; clientSecret: string; expiresAt: number }> = new Map();

  constructor(options: MockServerOptions = {}) {
    this.port = options.port || 0;
    this.host = options.host || "127.0.0.1";
    this.billingFailuresBeforeSuccess = options.billingFailuresBeforeSuccess ?? 2;
  }

  public getBaseUrl(): string {
    if (!this.server || !this.port) {
      throw new Error("MockIntegrationServer is not running. Call start() first.");
    }
    return `http://${this.host}:${this.port}`;
  }

  public getPort(): number {
    return this.port;
  }

  public getRecordedRequests(service?: string): RecordedRequest[] {
    if (!service) return [...this.requests];
    return this.requests.filter((r) => r.service === service);
  }

  public getLastRequest(service?: string): RecordedRequest | undefined {
    const list = this.getRecordedRequests(service);
    return list.length > 0 ? list[list.length - 1] : undefined;
  }

  public reset(): void {
    this.requests = [];
    this.billingAttemptCounter = 0;
    this.approvals.clear();
    this.tokenStore.clear();
  }

  public setBillingFailuresBeforeSuccess(count: number): void {
    this.billingFailuresBeforeSuccess = count;
    this.billingAttemptCounter = 0;
  }

  public async start(requestedPort?: number): Promise<number> {
    if (this.server) {
      return this.port;
    }

    const portToUse = requestedPort !== undefined ? requestedPort : this.port;

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Mock server internal error", details: err.message }));
        }
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(portToUse, this.host, () => {
        const addr = this.server?.address();
        if (addr && typeof addr === "object") {
          this.port = addr.port;
        }
        resolve(this.port);
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;
    return new Promise((resolve, reject) => {
      this.server!.close((err) => {
        this.server = null;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        if (!data.trim()) {
          return resolve({});
        }
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams(data);
          const obj: Record<string, string> = {};
          params.forEach((val, key) => {
            obj[key] = val;
          });
          resolve(obj);
        } else {
          resolve({ raw: data });
        }
      });
      req.on("error", reject);
    });
  }

  private detectService(path: string): string {
    if (path.startsWith("/oauth")) return "oauth";
    if (path.includes("/spreadsheets")) return "google_sheets";
    if (path.includes("/gmail")) return "gmail";
    if (path.includes("/api/chat.") || path.includes("/api/conversations.")) return "slack";
    if (path.includes("/crm/v3/")) return "hubspot";
    if (path.includes("/v1/templates") || path.includes("/v1/autofills") || path.includes("/v1/exports")) return "canva";
    if (path.includes("/drive/v3/") || path.includes("/upload/drive")) return "google_drive";
    if (path.includes("/v1/chat/completions")) return "openai";
    if (path.includes("/v1/messages")) return "anthropic";
    if (path.includes("/api/mock/billing")) return "billing";
    if (path.includes("/api/approvals")) return "approval";
    return "general";
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const rawUrl = req.url || "/";
    const parsedUrl = new URL(rawUrl, `http://${this.host}:${this.port || 80}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || "GET").toUpperCase();
    const service = this.detectService(pathname);

    const query: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    const body = method !== "GET" && method !== "HEAD" ? await this.parseBody(req) : {};

    const recorded: RecordedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      method,
      path: pathname,
      query,
      headers: req.headers,
      body,
      timestamp: Date.now(),
      service,
    };
    this.requests.push(recorded);

    // Common CORS headers for local testing
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, X-Hub-Signature-256");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (pathname === "/health" || pathname === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", timestamp: Date.now(), recordedRequests: this.requests.length }));
      return;
    }

    // ==========================================
    // 1. OAuth 2.0 Auth & Token Service
    // ==========================================
    if (pathname === "/oauth/token") {
      const grantType = body.grant_type || query.grant_type;
      if (grantType === "authorization_code") {
        const code = body.code || query.code;
        const clientId = body.client_id || query.client_id;
        const accessToken = `mock_access_${Math.random().toString(36).substring(2, 10)}`;
        const refreshToken = `mock_refresh_${Math.random().toString(36).substring(2, 10)}`;
        
        this.tokenStore.set(refreshToken, {
          refreshToken,
          clientSecret: body.client_secret || "",
          expiresAt: Date.now() + 3600 * 1000,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: "full_access",
          })
        );
        return;
      }

      if (grantType === "refresh_token") {
        const refreshToken = body.refresh_token || query.refresh_token;
        if (!refreshToken || refreshToken === "invalid_token" || refreshToken === "expired_token") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_grant", error_description: "Refresh token is invalid or revoked" }));
          return;
        }

        const newAccessToken = `mock_access_rotated_${Math.random().toString(36).substring(2, 10)}`;
        const newRefreshToken = `mock_refresh_rotated_${Math.random().toString(36).substring(2, 10)}`;
        this.tokenStore.set(newRefreshToken, {
          refreshToken: newRefreshToken,
          clientSecret: body.client_secret || "",
          expiresAt: Date.now() + 3600 * 1000,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: newAccessToken,
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: newRefreshToken,
            scope: "full_access",
          })
        );
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unsupported_grant_type" }));
      return;
    }

    // ==========================================
    // 2. Google Sheets API v4 Mock
    // ==========================================
    if (pathname.includes("/v4/spreadsheets/")) {
      const authHeader = req.headers["authorization"] || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: 401, message: "Unauthorized: Missing Bearer Token" } }));
        return;
      }

      // Append row
      if (pathname.endsWith(":append")) {
        const values = body.values || [["Default Row Value"]];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            spreadsheetId: "mock_sheet_12345",
            tableRange: "Sheet1!A1:Z100",
            updates: {
              spreadsheetId: "mock_sheet_12345",
              updatedRange: "Sheet1!A2:E2",
              updatedRows: values.length,
              updatedColumns: Array.isArray(values[0]) ? values[0].length : 1,
              updatedCells: values.length * (Array.isArray(values[0]) ? values[0].length : 1),
            },
          })
        );
        return;
      }

      // Read values
      if (method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            range: "Sheet1!A1:D10",
            majorDimension: "ROWS",
            values: [
              ["Week", "Metric", "Value", "Notes"],
              ["Week 42", "ARR Growth", "$120,000", "Top performance"],
              ["Week 43", "User Signups", "1,450", "Exceeded target"],
              ["Week 44", "Net Retention", "118%", "Best in Q3"],
            ],
          })
        );
        return;
      }

      // Update values
      if (method === "PUT") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            spreadsheetId: "mock_sheet_12345",
            updatedRange: "Sheet1!A2:E2",
            updatedRows: 1,
          })
        );
        return;
      }
    }

    // ==========================================
    // 3. Gmail API Mock
    // ==========================================
    if (pathname.includes("/gmail/v1/users/me/messages")) {
      const authHeader = req.headers["authorization"] || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: 401, message: "Unauthorized" } }));
        return;
      }

      // Send email
      if (pathname.endsWith("/send") && method === "POST") {
        const msgId = `gmail_${Date.now()}`;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: msgId,
            threadId: `thread_${msgId}`,
            labelIds: ["SENT"],
            status: "DELIVERED",
          })
        );
        return;
      }

      // Get single message
      if (method === "GET" && pathname.match(/\/messages\/[\w\d_-]+$/)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "msg_quote_req_001",
            threadId: "th_001",
            labelIds: ["INBOX", "UNREAD"],
            snippet: "Quote Request for Enterprise Automation License (500 seats)",
            payload: {
              headers: [
                { name: "From", value: "sarah.connor@cyberdyne.org" },
                { name: "Subject", value: "Quote request: 500 Enterprise seats" },
                { name: "Date", value: new Date().toUTCString() },
              ],
              body: {
                data: Buffer.from("Hi Team, We need a formal quote for 500 Enterprise seats with 24/7 SLA. Target budget is $85,000. Please expedite approval.").toString("base64"),
              },
            },
          })
        );
        return;
      }

      // List messages
      if (method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            messages: [
              { id: "msg_quote_req_001", threadId: "th_001" },
            ],
            resultSizeEstimate: 1,
          })
        );
        return;
      }
    }

    // ==========================================
    // 4. Slack API Mock
    // ==========================================
    if (pathname === "/api/chat.postMessage" || pathname === "/api/chat.postEphemeral") {
      const authHeader = req.headers["authorization"] || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "not_authed" }));
        return;
      }

      const channel = body.channel || "general";
      const ts = `${Date.now() / 1000}.000100`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          channel,
          ts,
          message: {
            text: body.text || "",
            blocks: body.blocks || [],
            user: "U_QUICKREPLY_BOT",
            ts,
          },
        })
      );
      return;
    }

    if (pathname === "/api/conversations.list") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          channels: [
            { id: "C100_SALES_ENT", name: "sales-enterprise" },
            { id: "C101_SALES_SMB", name: "sales-smb" },
            { id: "C102_APPROVALS", name: "deals-approval" },
          ],
        })
      );
      return;
    }

    // ==========================================
    // 5. HubSpot CRM API Mock
    // ==========================================
    if (pathname.includes("/crm/v3/objects/contacts")) {
      const authHeader = req.headers["authorization"] || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Unauthorized" }));
        return;
      }

      const contactId = `hub_contact_${Date.now()}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: contactId,
          properties: {
            email: body.properties?.email || "lead@acme.corp",
            firstname: body.properties?.firstname || "Lead",
            lastname: body.properties?.lastname || "User",
            company: body.properties?.company || "Acme Corp",
            lifecyclestage: body.properties?.lifecyclestage || "lead",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
      return;
    }

    if (pathname.includes("/crm/v3/objects/deals")) {
      const dealId = `hub_deal_${Date.now()}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: dealId,
          properties: body.properties || {},
          createdAt: new Date().toISOString(),
        })
      );
      return;
    }

    // ==========================================
    // 6. Canva Connect API Mock
    // ==========================================
    if (pathname === "/v1/templates") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          items: [
            {
              id: "tpl_workflow_brief_01",
              title: "Executive Workflow Presentation Brief 16:9",
              thumbnail: "https://mock.canva.com/thumb/brief01.png",
              dataset_fields: ["headline", "subheadline", "metric_highlight", "author_summary"],
            },
            {
              id: "tpl_social_card_02",
              title: "Social Automation Metrics Square",
              thumbnail: "https://mock.canva.com/thumb/social02.png",
              dataset_fields: ["headline", "caption", "hashtags"],
            },
          ],
        })
      );
      return;
    }

    if (pathname.startsWith("/v1/templates/")) {
      const tplId = pathname.split("/").pop() || "tpl_workflow_brief_01";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: tplId,
          title: "Executive Workflow Presentation Brief 16:9",
          dataset_fields: ["headline", "subheadline", "metric_highlight", "author_summary"],
        })
      );
      return;
    }

    if (pathname === "/v1/autofills") {
      const jobId = `canva_job_autofill_${Date.now()}`;
      const designId = `dsg_canva_${Date.now()}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          job: {
            id: jobId,
            status: "success",
            result: {
              design: {
                id: designId,
                title: "Generated Workflow Showcase Presentation",
                edit_url: `https://canva.com/design/${designId}/edit`,
              },
            },
          },
        })
      );
      return;
    }

    if (pathname === "/v1/exports") {
      const format = body.format || "png";
      const exportJobId = `canva_export_${Date.now()}`;
      const downloadUrl = `http://${this.host}:${this.port}/mock/download/design.${format}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          job: {
            id: exportJobId,
            status: "success",
            urls: [downloadUrl],
          },
        })
      );
      return;
    }

    if (pathname.startsWith("/mock/download/")) {
      const fileContent = "MOCK_CANVA_BINARY_IMAGE_DATA_STREAM";
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": Buffer.byteLength(fileContent),
      });
      res.end(fileContent);
      return;
    }

    // ==========================================
    // 7. Google Drive API Mock
    // ==========================================
    if (pathname.includes("/upload/drive/v3/files") || pathname.includes("/drive/v3/files")) {
      const fileId = `drive_file_${Date.now()}`;
      const fileName = body.name || query.name || "Workflow_Export.png";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: fileId,
          name: fileName,
          mimeType: "image/png",
          webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          webContentLink: `https://drive.google.com/uc?id=${fileId}&export=download`,
        })
      );
      return;
    }

    // ==========================================
    // 8. AI Provider Mocks (OpenAI & Anthropic)
    // ==========================================
    if (pathname === "/v1/chat/completions") {
      const promptText = JSON.stringify(body.messages || []);
      
      // AI prompt intent matching
      let replyContent = "Default AI completion response";
      if (promptText.includes("summarize") || promptText.includes("quote request")) {
        replyContent = JSON.stringify({
          clientName: "Cyberdyne Systems",
          requestedItem: "Enterprise Automation License (500 seats)",
          targetBudget: 85000,
          riskScore: 25,
          recommendedAction: "APPROVE",
          summary: "Customer requested formal quote for 500 Enterprise seats ($85,000 budget). High strategic value.",
        });
      } else if (promptText.includes("classify") || promptText.includes("Classify") || promptText.includes("budget")) {
        const isEnterprise = promptText.includes("25000") || promptText.includes("Enterprise") || (body.temperature === 0 && !promptText.includes("500"));
        replyContent = JSON.stringify({
          classification: isEnterprise ? "Enterprise" : "SMB",
          score: isEnterprise ? 95 : 60,
          rationale: isEnterprise ? "Budget exceeds $10,000 Enterprise qualification threshold." : "SMB tier lead.",
        });
      } else if (promptText.includes("Canva") || promptText.includes("social")) {
        replyContent = JSON.stringify({
          headline: "Accelerate Growth with Visual Automation",
          subheadline: "Q3 ARR up 120% through intelligent workflows",
          caption: "How we scaled enterprise operations without adding headcount.",
          hashtags: ["#Automation", "#EnterpriseAI", "#NoCode"],
        });
      } else if (promptText.includes("patch") || promptText.includes("workflow")) {
        replyContent = JSON.stringify({
          patchType: "INSERT_BRANCH",
          condition: "amount > 500",
          nodeToAdd: {
            id: "slack_vip_notify",
            type: "slack",
            parameters: { channel: "#vip-customers" },
          },
        });
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: `chatcmpl_${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: body.model || "gpt-4o",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: replyContent,
              },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 35, completion_tokens: 28, total_tokens: 63 },
        })
      );
      return;
    }

    if (pathname === "/v1/messages") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: `msg_claude_${Date.now()}`,
          type: "message",
          role: "assistant",
          model: body.model || "claude-3-5-sonnet",
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "success", reasoning: "Deterministic Anthropic mock output." }),
            },
          ],
          usage: { input_tokens: 40, output_tokens: 25 },
        })
      );
      return;
    }

    // ==========================================
    // 9. Simulated Failure & Retry Endpoint (Scenario D)
    // ==========================================
    if (pathname === "/api/mock/billing") {
      this.billingAttemptCounter++;
      if (this.billingAttemptCounter <= this.billingFailuresBeforeSuccess) {
        res.writeHead(503, {
          "Content-Type": "application/json",
          "Retry-After": "1",
        });
        res.end(
          JSON.stringify({
            error: "Temporary billing service unavailable",
            attempt: this.billingAttemptCounter,
            status: 503,
          })
        );
        return;
      }

      // Success after retries
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "paid",
          transactionId: "txn_success_789",
          amount: body.amount || 250,
          attempt: this.billingAttemptCounter,
          message: "Payment successfully processed after retry",
        })
      );
      return;
    }

    // ==========================================
    // 10. Human Approval Gate Endpoint (Scenario B)
    // ==========================================
    if (pathname.startsWith("/api/approvals/")) {
      const parts = pathname.split("/");
      const approvalId = parts[3];
      const action = parts[4]; // "approve" or "reject"

      if (action === "approve") {
        this.approvals.set(approvalId, { status: "APPROVED", payload: body });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            approvalId,
            status: "APPROVED",
            resumedAt: new Date().toISOString(),
          })
        );
        return;
      }

      if (action === "reject") {
        this.approvals.set(approvalId, { status: "REJECTED", payload: body });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            approvalId,
            status: "REJECTED",
            reason: body.reason || "Rejected by reviewer",
          })
        );
        return;
      }

      const existing = this.approvals.get(approvalId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          approvalId,
          status: existing ? existing.status : "PENDING",
        })
      );
      return;
    }

    // Default Fallback
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: true, path: pathname, method }));
  }
}

// Standalone execution support
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4040;
  const server = new MockIntegrationServer({ port });
  server.start().then((boundPort) => {
    console.log(`[MockIntegrationServer] Listening on http://127.0.0.1:${boundPort}`);
  });
}
