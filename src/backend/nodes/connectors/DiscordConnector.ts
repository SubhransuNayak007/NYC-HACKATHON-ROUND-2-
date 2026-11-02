/**
 * QuickReply Discord Connector
 * src/backend/nodes/connectors/DiscordConnector.ts
 */

import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const DiscordConnector: INodeDefinition = {
  id: "discord",
  name: "Discord",
  version: 1,
  category: "action",
  description: "Send notifications, webhook alerts, and embeds to Discord servers and channels",
  icon: "hash",
  auth: {
    type: "api_key",
    credentialAppId: "discord",
    requiredScopes: ["bot", "webhook.incoming"],
  },
  parametersSchema: {
    actions: {
      send_message: {
        displayName: "Send Channel Message / Webhook",
        description: "Post a notification or embed to a Discord channel",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "channelId",
            displayName: "Channel ID or Webhook URL",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "content",
            displayName: "Message Content",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "embedTitle",
            displayName: "Embed Title",
            type: "string",
            required: false,
          },
        ],
      },
    },
  },

  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId = "send_message", channelId, content, text, embedTitle } = ctx.parameters;
    const bodyContent = content || text || "";
    const target = channelId || ctx.parameters?.webhookUrl || "";

    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://discord.com/api";

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const token = ctx.credentials?.token || ctx.credentials?.botToken || "mock_discord_token";

    if (!target) {
      return { status: "FAILED", data: null, error: "Missing required parameter: channelId or webhook URL." };
    }

    const payload: any = { content: bodyContent };
    if (embedTitle) {
      payload.embeds = [{ title: embedTitle, description: bodyContent, color: 0x5865f2 }];
    }

    const isWebhook = target.startsWith("http://") || target.startsWith("https://");
    const targetUrl = isWebhook ? target : `${cleanBase}/v10/channels/${target}/messages`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!isWebhook) {
      headers["Authorization"] = `Bot ${token}`;
    }

    const res = await ctx.http.request({
      url: targetUrl,
      method: "POST",
      headers,
      body: payload,
    });

    return {
      status: "SUCCESS",
      data: res.data || { ok: true, id: `discord_msg_${Date.now()}` },
    };
  },
};
