/**
 * QuickReply Webhook Connector
 * src/backend/nodes/connectors/WebhookConnector.ts
 */

import crypto from "node:crypto";
import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const WebhookConnector: INodeDefinition = {
  id: "webhook",
  name: "Webhook",
  version: 1,
  category: "trigger",
  description: "Receive real-time HTTP webhooks with signature verification or dispatch outbound payloads",
  icon: "webhook",
  auth: {
    type: "webhook_secret",
    credentialAppId: "webhook",
  },
  parametersSchema: {
    actions: {
      inbound_webhook: {
        displayName: "Receive Inbound Webhook",
        description: "Captures and validates inbound HTTP webhooks",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "path",
            displayName: "Webhook Endpoint Path",
            type: "string",
            defaultValue: "/api/webhooks/automation/default",
            required: true,
          },
          {
            name: "verifySignature",
            displayName: "Verify HMAC Signature",
            type: "boolean",
            defaultValue: false,
          },
          {
            name: "signatureHeader",
            displayName: "Signature Header Name",
            type: "string",
            defaultValue: "X-QuickReply-Signature",
          },
        ],
      },
      post_transformed_result: {
        displayName: "Dispatch Outbound Webhook",
        description: "Sends an HTTP POST payload to an external destination",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "url",
            displayName: "Destination URL",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "payload",
            displayName: "JSON Payload",
            type: "json",
            supportsVariables: true,
          },
          {
            name: "headers",
            displayName: "Custom Headers",
            type: "key_value",
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    status: z.number().optional(),
    statusCode: z.number().optional(),
    receivedAt: z.string().optional(),
    payload: z.any().optional(),
    responseBody: z.any().optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const actionId = ctx.parameters.actionId || "inbound_webhook";

    if (actionId === "inbound_webhook") {
      const { verifySignature, signatureHeader } = ctx.parameters;
      const inputHeaders = ctx.inputData?.headers || {};
      const rawBody = ctx.inputData?.rawBody || JSON.stringify(ctx.inputData?.body || ctx.inputData);

      // Verify HMAC-SHA256 signature if requested
      if (verifySignature) {
        const secret = ctx.credentials?.secret || ctx.credentials?.webhookSecret;
        if (!secret) {
          throw new Error("Signature verification enabled but no webhook secret found in credentials");
        }

        const headerName = (signatureHeader || "X-QuickReply-Signature").toLowerCase();
        const incomingSignature = inputHeaders[headerName] || inputHeaders["x-hub-signature-256"] || inputHeaders["x-signature"];
        if (!incomingSignature) {
          throw new Error(`Missing signature header '${signatureHeader}' in incoming webhook request`);
        }

        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest("hex")}`;

        const cleanIncoming = incomingSignature.startsWith("sha256=") ? incomingSignature : `sha256=${incomingSignature}`;
        if (cleanIncoming !== expectedSignature) {
          throw new Error("Invalid webhook HMAC signature: signature mismatch");
        }
      }

      ctx.logger.info("Inbound webhook successfully processed");
      return {
        status: "SUCCESS",
        data: {
          receivedAt: new Date().toISOString(),
          payload: ctx.inputData?.body || ctx.inputData || {},
          headers: inputHeaders,
        },
      };
    }

    if (actionId === "post_transformed_result" || actionId === "send_webhook") {
      const { url, payload, headers } = ctx.parameters;
      if (!url) {
        throw new Error("Missing required 'url' parameter for outbound webhook");
      }

      const bodyToSend = payload !== undefined ? payload : ctx.inputData;
      ctx.logger.info(`Dispatching outbound webhook to ${url}`);

      const res = await ctx.http.request({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers || {}),
        },
        body: bodyToSend,
      });

      return {
        status: "SUCCESS",
        data: {
          statusCode: res.status,
          responseBody: res.data,
        },
      };
    }

    throw new Error(`Unsupported Webhook action: '${actionId}'`);
  },
};
