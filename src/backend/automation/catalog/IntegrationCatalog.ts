/**
 * ============================================================================
 * QuickReply AI Automation Operating System — Integration Knowledge Catalog
 * src/backend/automation/catalog/IntegrationCatalog.ts
 *
 * Comprehensive catalog of verified integrations, input/output schemas,
 * n8n node mappings, authentication requirements, and side-effect classifications.
 * ============================================================================
 */

import { IntegrationDefinition } from "../types";

export class IntegrationCatalog {
  private static registry: Map<string, IntegrationDefinition> = new Map();

  static register(integration: IntegrationDefinition): void {
    this.registry.set(integration.appId, integration);
  }

  static get(appId: string): IntegrationDefinition | undefined {
    return this.registry.get(appId);
  }

  static getAll(): IntegrationDefinition[] {
    return Array.from(this.registry.values());
  }

  static getByCategory(category: IntegrationDefinition["category"]): IntegrationDefinition[] {
    return this.getAll().filter((app) => app.category === category);
  }

  static search(query: string): IntegrationDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.appId.toLowerCase().includes(q)
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Google Workspace — Gmail
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "gmail",
  name: "Gmail",
  category: "productivity",
  description: "Monitor inbound emails, extract invoice attachments, and send automated email notifications.",
  iconName: "Mail",
  authType: "oauth2",
  requiredScopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  docsUrl: "https://developers.google.com/gmail/api",
  triggers: [
    {
      id: "new_email_received",
      name: "New Email Received",
      description: "Triggers when a new email matching search criteria arrives in the mailbox.",
      type: "poll",
      inputSchema: {
        query: { type: "string", label: "Search Query", default: "has:attachment", required: false },
        labelIds: { type: "array", label: "Gmail Labels", default: ["INBOX"], required: false },
      },
      outputSchema: {
        messageId: { type: "string" },
        from: { type: "string" },
        subject: { type: "string" },
        date: { type: "string" },
        snippet: { type: "string" },
        hasAttachments: { type: "boolean" },
        attachments: { type: "array" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.gmailTrigger", typeVersion: 1 },
    },
  ],
  actions: [
    {
      id: "search_emails",
      name: "Search Emails",
      description: "Search emails by subject, sender, date range, or attachments.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        query: { type: "string", label: "Search Query", required: true, default: "subject:invoice" },
        maxResults: { type: "number", label: "Max Results", default: 10, required: false },
      },
      outputSchema: {
        messages: { type: "array" },
        totalFound: { type: "number" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.gmail", typeVersion: 2, resource: "message", operation: "getAll" },
    },
    {
      id: "send_email",
      name: "Send Email",
      description: "Send an email message to a specified recipient.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: true,
      inputSchema: {
        to: { type: "string", label: "Recipient Email", required: true },
        subject: { type: "string", label: "Subject", required: true },
        body: { type: "string", label: "Message Body", required: true },
      },
      outputSchema: {
        sentMessageId: { type: "string" },
        status: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.gmail", typeVersion: 2, resource: "message", operation: "send" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Google Workspace — Google Sheets
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "google_sheets",
  name: "Google Sheets",
  category: "productivity",
  description: "Log extracted data, update spreadsheet rows, and sync tabular records in real time.",
  iconName: "Table",
  authType: "oauth2",
  requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
  docsUrl: "https://developers.google.com/sheets/api",
  triggers: [],
  actions: [
    {
      id: "append_row",
      name: "Append Row",
      description: "Add a new row of data to the specified Google Sheet.",
      sideEffect: "REVERSIBLE",
      requiresApprovalByDefault: false,
      inputSchema: {
        spreadsheetId: { type: "string", label: "Spreadsheet ID", required: true },
        sheetName: { type: "string", label: "Sheet / Tab Name", default: "Sheet1", required: true },
        values: { type: "object", label: "Row Data (Key-Value)", required: true },
      },
      outputSchema: {
        updatedRange: { type: "string" },
        updatedRows: { type: "number" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.googleSheets", typeVersion: 2, resource: "sheet", operation: "append" },
    },
    {
      id: "read_sheet",
      name: "Read Rows",
      description: "Read rows from a Google Sheet matching criteria.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        spreadsheetId: { type: "string", label: "Spreadsheet ID", required: true },
        sheetName: { type: "string", label: "Sheet / Tab Name", default: "Sheet1", required: true },
      },
      outputSchema: {
        rows: { type: "array" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.googleSheets", typeVersion: 2, resource: "sheet", operation: "read" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Telegram Messenger
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "telegram",
  name: "Telegram",
  category: "channels",
  description: "Send instant priority alerts, rich formatted notifications, and interactive decision buttons via Telegram Bot.",
  iconName: "Send",
  authType: "api_key",
  docsUrl: "https://core.telegram.org/bots/api",
  triggers: [
    {
      id: "inbound_message",
      name: "Telegram Message Received",
      description: "Triggers on inbound Telegram direct message or group mention.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        chatId: { type: "string" },
        from: { type: "string" },
        text: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.telegramTrigger", typeVersion: 1 },
    },
  ],
  actions: [
    {
      id: "send_message",
      name: "Send Alert / Message",
      description: "Send a markdown or HTML message to a chat or channel.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        chatId: { type: "string", label: "Chat ID / Username", required: true },
        text: { type: "string", label: "Message Text", required: true },
        parseMode: { type: "string", label: "Format Mode", default: "Markdown", required: false },
      },
      outputSchema: {
        messageId: { type: "string" },
        delivered: { type: "boolean" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.telegram", typeVersion: 1, resource: "message", operation: "sendMessage" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Slack
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "slack",
  name: "Slack",
  category: "channels",
  description: "Broadcast team alerts, channel announcements, and incident notifications.",
  iconName: "Hash",
  authType: "oauth2",
  requiredScopes: ["chat:write", "channels:read"],
  docsUrl: "https://api.slack.com",
  triggers: [],
  actions: [
    {
      id: "post_message",
      name: "Post Channel Message",
      description: "Post a notification message to a Slack channel.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        channel: { type: "string", label: "Channel (#name or ID)", required: true },
        text: { type: "string", label: "Message Text", required: true },
      },
      outputSchema: {
        ts: { type: "string" },
        channel: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.slack", typeVersion: 2, resource: "chat", operation: "postMessage" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. WhatsApp Cloud Platform
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "whatsapp",
  name: "WhatsApp",
  category: "channels",
  description: "Enterprise WhatsApp messaging, order status alerts, and 2-way conversational support.",
  iconName: "MessageCircle",
  authType: "api_key",
  docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  triggers: [
    {
      id: "message_received",
      name: "WhatsApp Message Received",
      description: "Triggers on inbound customer message to WhatsApp business number.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        from: { type: "string" },
        text: { type: "string" },
        timestamp: { type: "string" },
      },
    },
  ],
  actions: [
    {
      id: "send_message",
      name: "Send WhatsApp Text",
      description: "Dispatch an automated WhatsApp reply or notification.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: true,
      inputSchema: {
        to: { type: "string", label: "Recipient Phone (+CountryCode)", required: true },
        text: { type: "string", label: "Message Body", required: true },
      },
      outputSchema: {
        messageId: { type: "string" },
        status: { type: "string" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.whatsApp",
        typeVersion: 1,
        resource: "message",
        operation: "send",
      },
    },
    {
      id: "send_template",
      name: "Send WhatsApp Template Message",
      description: "Dispatch an approved WhatsApp Cloud HSM pre-configured notification template.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        recipientPhone: { type: "string", label: "Recipient Phone Number (+CountryCode)", required: true },
        templateName: { type: "string", label: "Template Name", required: true },
        parameters: { type: "object", label: "Template Dynamic Variables", required: false },
      },
      outputSchema: {
        messageId: { type: "string" },
        status: { type: "string" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.whatsApp",
        typeVersion: 1,
        resource: "message",
        operation: "sendTemplate",
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Stripe Financial Platform
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "stripe",
  name: "Stripe",
  category: "finance",
  description: "Monitor payments, detect failed transactions, process subscriptions, and issue refunds.",
  iconName: "CreditCard",
  authType: "api_key",
  docsUrl: "https://stripe.com/docs/api",
  triggers: [
    {
      id: "payment_succeeded",
      name: "Payment Succeeded",
      description: "Fires when a customer payment intent succeeds.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        paymentIntentId: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        customerEmail: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.stripeTrigger", typeVersion: 1 },
    },
    {
      id: "payment_failed",
      name: "Payment Failed",
      description: "Fires when a charge or card payment fails.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        chargeId: { type: "string" },
        amount: { type: "number" },
        failureMessage: { type: "string" },
        customerEmail: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.stripeTrigger", typeVersion: 1 },
    },
  ],
  actions: [
    {
      id: "get_charge_details",
      name: "Get Charge Details",
      description: "Retrieve comprehensive customer details, payment status, amount, and receipt/invoice link for a Stripe charge.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        chargeId: { type: "string", label: "Charge ID (ch_xxx)", required: true },
      },
      outputSchema: {
        chargeId: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        customerName: { type: "string" },
        customerEmail: { type: "string" },
        status: { type: "string" },
        invoiceUrl: { type: "string" },
        paid: { type: "boolean" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.stripe",
        typeVersion: 1,
        resource: "charge",
        operation: "get",
      },
    },
    {
      id: "create_refund",
      name: "Issue Refund",
      description: "Process a refund for a payment charge. High-risk financial action.",
      sideEffect: "FINANCIAL",
      requiresApprovalByDefault: true,
      inputSchema: {
        chargeId: { type: "string", label: "Charge ID (ch_xxx)", required: true },
        amount: { type: "number", label: "Refund Amount in Cents (optional for full refund)", required: false },
        reason: { type: "string", label: "Reason", default: "requested_by_customer" },
      },
      outputSchema: {
        refundId: { type: "string" },
        status: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.stripe", typeVersion: 1, resource: "refund", operation: "create" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. HubSpot CRM
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "hubspot",
  name: "HubSpot",
  category: "crm",
  description: "Sync leads, create customer contacts, and update sales deals.",
  iconName: "Users",
  authType: "oauth2",
  requiredScopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
  docsUrl: "https://developers.hubspot.com",
  triggers: [],
  actions: [
    {
      id: "upsert_contact",
      name: "Upsert Contact",
      description: "Create or update a HubSpot CRM contact record, lifecycle stage, and custom attributes.",
      sideEffect: "REVERSIBLE",
      requiresApprovalByDefault: false,
      inputSchema: {
        email: { type: "string", label: "Contact Email Address", required: true },
        lifecycleStage: { type: "string", label: "Lifecycle Stage", required: false, default: "lead" },
        firstname: { type: "string", label: "First Name", required: false },
        lastname: { type: "string", label: "Last Name", required: false },
        company: { type: "string", label: "Company Name", required: false },
      },
      outputSchema: {
        contactId: { type: "string" },
        lifecycleStage: { type: "string" },
        status: { type: "string" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.hubspot",
        typeVersion: 2,
        resource: "contact",
        operation: "upsert",
      },
    },
    {
      id: "create_or_update_contact",
      name: "Create or Update Contact",
      description: "Upsert a contact record in HubSpot CRM.",
      sideEffect: "REVERSIBLE",
      requiresApprovalByDefault: false,
      inputSchema: {
        email: { type: "string", label: "Email Address", required: true },
        firstname: { type: "string", label: "First Name", required: false },
        lastname: { type: "string", label: "Last Name", required: false },
        company: { type: "string", label: "Company", required: false },
      },
      outputSchema: {
        contactId: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.hubspot", typeVersion: 2, resource: "contact", operation: "upsert" },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Clock / Scheduling Engine
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "clock",
  name: "Schedule & Timer",
  category: "utilities",
  description: "Trigger automations on recurring cron schedules, daily timers, or periodic intervals.",
  iconName: "Clock",
  authType: "none",
  triggers: [
    {
      id: "cron_schedule",
      name: "Recurring Schedule (Cron)",
      description: "Trigger at exact specified days and times.",
      type: "schedule",
      inputSchema: {
        cron: { type: "string", label: "Cron Expression", default: "0 9 * * *", required: true },
        timezone: { type: "string", label: "Timezone", default: "Asia/Kolkata", required: true },
      },
      outputSchema: {
        timestamp: { type: "string" },
        scheduledTime: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2 },
    },
  ],
  actions: [],
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. AI Intelligence & Document Extractor
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "ai_extractor",
  name: "AI Invoice & Document Intelligence",
  category: "utilities",
  description: "Extract structured JSON (vendor, amount, due date, invoice number) from unstructured PDFs or emails.",
  iconName: "Sparkles",
  authType: "none",
  triggers: [],
  actions: [
    {
      id: "apply_business_logic",
      name: "AI Business Logic & Transformation",
      description: "Execute cognitive prompt reasoning, business logic calculations, discount policies, or dynamic content synthesis.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        objective: { type: "string", label: "Business Objective / Prompt", required: true },
        context: { type: "object", label: "Input Data Context", required: false },
      },
      outputSchema: {
        result: { type: "object" },
        reasoning: { type: "string" },
        confidence: { type: "number" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.openAi",
        typeVersion: 1,
        resource: "chat",
        operation: "complete",
      },
    },
    {
      id: "extract_invoice",
      name: "Extract Invoice Fields",
      description: "Use an LLM model to extract structured invoice data.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        rawContent: { type: "string", label: "Email text or attachment content", required: true },
      },
      outputSchema: {
        vendor: { type: "string" },
        invoiceNumber: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        dueDate: { type: "string" },
        confidence: { type: "number" },
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Human-in-the-Loop Approval Gate
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "approval_gate",
  name: "Human-in-the-Loop Approval Gate",
  category: "utilities",
  description: "Pause workflow execution and alert the owner for explicit approval on high-risk actions.",
  iconName: "ShieldAlert",
  authType: "none",
  triggers: [],
  actions: [
    {
      id: "request_approval",
      name: "Request Human Approval",
      description: "Halt workflow and await manual owner confirmation.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        reason: { type: "string", label: "Reason for Review", required: true },
        actionSummary: { type: "string", label: "Action Summary", required: true },
        riskScore: { type: "number", label: "Calculated Risk (0-1)", default: 0.5 },
      },
      outputSchema: {
        decision: { type: "string" },
        approvedBy: { type: "string" },
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Custom Webhook Ingestion Engine
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "custom_webhook",
  name: "Custom Webhook Ingestion",
  category: "developer",
  description: "Ingest, validate, and parse arbitrary external webhook payloads from third-party platforms (Shopify, Stripe, custom backends).",
  iconName: "Webhook",
  authType: "webhook_secret",
  triggers: [
    {
      id: "webhook_received",
      name: "Inbound Webhook Received",
      description: "Fires when an external HTTP POST request delivers a JSON payload.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        payload: { type: "object" },
        headers: { type: "object" },
        timestamp: { type: "string" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.webhook", typeVersion: 1 },
    },
  ],
  actions: [
    {
      id: "parse_incoming_data",
      name: "Parse & Validate Payload",
      description: "Extract, sanitize, and validate structured JSON fields from inbound webhook payload.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        payload: { type: "string", label: "Payload Reference or JSON", required: true, default: "{{ $json }}" },
      },
      outputSchema: {
        data: { type: "object" },
        valid: { type: "boolean" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.set", typeVersion: 1 },
    },
    {
      id: "webhook_received",
      name: "Capture Webhook Event",
      description: "Action-compatible capture of incoming webhook payload.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        payload: { type: "string", label: "Event Payload", required: false },
      },
      outputSchema: {
        data: { type: "object" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.set", typeVersion: 1 },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Generic Outbound HTTP / Webhook Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "webhook",
  name: "Webhook & HTTP Dispatcher",
  category: "developer",
  description: "Dispatch outbound HTTP POST requests, trigger external webhooks, or post transformed event payloads to downstream services.",
  iconName: "Send",
  authType: "none",
  triggers: [
    {
      id: "inbound_webhook",
      name: "Inbound HTTP Webhook",
      description: "Triggers on inbound HTTP request.",
      type: "webhook",
      inputSchema: {},
      outputSchema: {
        body: { type: "object" },
        headers: { type: "object" },
      },
      n8nNodeMapping: { nodeType: "n8n-nodes-base.webhook", typeVersion: 1 },
    },
  ],
  actions: [
    {
      id: "post_transformed_result",
      name: "Post Transformed Result",
      description: "Deliver transformed payload or AI reasoning output to destination endpoint.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        destination: { type: "string", label: "Target System or Destination URL", required: true, default: "target_system" },
        payload: { type: "object", label: "Payload Data", required: false },
      },
      outputSchema: {
        statusCode: { type: "number" },
        delivered: { type: "boolean" },
        response: { type: "string" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        operation: "post",
      },
    },
    {
      id: "trigger_webhook",
      name: "Trigger Webhook",
      description: "Dispatch an outbound webhook notification or API callback.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        url: { type: "string", label: "Target Webhook URL", required: false },
        destination: { type: "string", label: "Destination Name", required: false, default: "external_service" },
        payload: { type: "object", label: "Payload", required: false },
      },
      outputSchema: {
        statusCode: { type: "number" },
        status: { type: "string" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        operation: "post",
      },
    },
    {
      id: "send_webhook",
      name: "Send Webhook",
      description: "Post JSON data to a configured webhook endpoint.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        url: { type: "string", label: "URL", required: false },
        data: { type: "object", label: "Data", required: false },
      },
      outputSchema: {
        success: { type: "boolean" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        operation: "post",
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Relational Database / PostgreSQL & MySQL
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "postgres",
  name: "PostgreSQL Database",
  category: "developer",
  description: "Execute SQL queries, aggregate sales metrics, and synchronize tabular records from PostgreSQL, MySQL, or cloud databases.",
  iconName: "Database",
  authType: "api_key",
  docsUrl: "https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/",
  triggers: [],
  actions: [
    {
      id: "execute_query",
      name: "Execute SQL Query",
      description: "Run custom SQL query to select, aggregate or mutate database records.",
      sideEffect: "SAFE_READ",
      requiresApprovalByDefault: false,
      inputSchema: {
        query: { type: "string", label: "SQL Query", required: true },
      },
      outputSchema: {
        rows: { type: "array" },
        rowCount: { type: "number" },
      },
      n8nNodeMapping: {
        nodeType: "n8n-nodes-base.postgres",
        typeVersion: 2.5,
        operation: "executeQuery",
      },
    },
  ],
});



// ─────────────────────────────────────────────────────────────────────────────
// 14. WhatsApp Business (Meta Cloud API)
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "whatsapp",
  name: "WhatsApp Business",
  category: "channels",
  description: "Send official WhatsApp notifications, order updates, and marketing messages to customers via Meta Cloud API.",
  iconName: "MessageCircle",
  authType: "oauth2",
  requiredScopes: ["whatsapp_business_messaging", "whatsapp_business_management"],
  docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  triggers: [],
  actions: [
    {
      id: "send_message",
      name: "Send WhatsApp Message",
      description: "Dispatch a direct text notification to a verified recipient phone number.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: true,
      inputSchema: {
        to: { type: "string", label: "Recipient Phone Number (+country_code)", required: true },
        message: { type: "string", label: "Message Content", required: true },
        senderPhoneNumberId: { type: "string", label: "Sender Phone Number ID", required: false },
      },
      outputSchema: {
        success: { type: "boolean" },
        messageId: { type: "string" },
        sentAt: { type: "string" },
      },
    },
    {
      id: "send_template",
      name: "Send WhatsApp Template",
      description: "Send an approved WhatsApp Business template message with dynamic parameter substitution.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: true,
      inputSchema: {
        to: { type: "string", label: "Recipient Phone Number (+country_code)", required: true },
        templateName: { type: "string", label: "Template Name", required: true },
        templateParameters: { type: "array", label: "Template Variables", required: false },
      },
      outputSchema: {
        success: { type: "boolean" },
        messageId: { type: "string" },
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Telegram Bot API
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "telegram",
  name: "Telegram",
  category: "channels",
  description: "Send instant notifications, documents, media, and priority alerts to Telegram users, groups, or channels.",
  iconName: "Send",
  authType: "api_key",
  docsUrl: "https://core.telegram.org/bots/api",
  triggers: [],
  actions: [
    {
      id: "send_message",
      name: "Send Telegram Message",
      description: "Send a Markdown/HTML formatted message to a target Telegram Chat ID or public Channel.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        chatId: { type: "string", label: "Target Chat ID or @Channel", required: true },
        text: { type: "string", label: "Message Content", required: true },
        parseMode: { type: "string", label: "Parse Mode (Markdown/HTML)", required: false, default: "Markdown" },
      },
      outputSchema: {
        ok: { type: "boolean" },
        messageId: { type: "number" },
        chatId: { type: "string" },
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Discord Webhooks & Bot
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "discord",
  name: "Discord",
  category: "channels",
  description: "Deliver alerts, markdown embeds, and announcements to Discord servers and channels.",
  iconName: "Hash",
  authType: "api_key",
  docsUrl: "https://discord.com/developers/docs/intro",
  triggers: [],
  actions: [
    {
      id: "send_message",
      name: "Send Discord Message",
      description: "Post a message or embed to a Discord channel or incoming webhook.",
      sideEffect: "EXTERNAL_COMMUNICATION",
      requiresApprovalByDefault: false,
      inputSchema: {
        channelId: { type: "string", label: "Channel ID or Webhook URL", required: true },
        content: { type: "string", label: "Message Content", required: true },
      },
      outputSchema: {
        id: { type: "string" },
        ok: { type: "boolean" },
      },
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Notion Workspace
// ─────────────────────────────────────────────────────────────────────────────
IntegrationCatalog.register({
  appId: "notion",
  name: "Notion",
  category: "productivity",
  description: "Create and update database items, pages, tasks, and project documentation in Notion.",
  iconName: "FileText",
  authType: "oauth2",
  docsUrl: "https://developers.notion.com/",
  triggers: [],
  actions: [
    {
      id: "create_page",
      name: "Create Database Page",
      description: "Add a new record to a designated Notion database.",
      sideEffect: "REVERSIBLE",
      requiresApprovalByDefault: false,
      inputSchema: {
        databaseId: { type: "string", label: "Database ID", required: true },
        title: { type: "string", label: "Page Title", required: true },
        properties: { type: "object", label: "Properties JSON", required: false },
      },
      outputSchema: {
        id: { type: "string" },
        ok: { type: "boolean" },
      },
    },
  ],
});
