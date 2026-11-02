/**
 * QuickReply Slack Connector
 * src/backend/nodes/connectors/SlackConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const SlackConnector: INodeDefinition = {
  id: "slack",
  name: "Slack",
  version: 1,
  category: "action",
  description: "Send messages, block kit interactive cards, thread replies, and manage channels in Slack",
  icon: "message-square",
  auth: {
    type: "oauth2",
    credentialAppId: "slack",
    requiredScopes: ["chat:write", "channels:read", "channels:manage"],
  },
  parametersSchema: {
    actions: {
      post_message: {
        displayName: "Post Message",
        description: "Sends a markdown or Block Kit message to a channel or DM",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "channel",
            displayName: "Channel Name or ID (e.g. #sales-alerts)",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "text",
            displayName: "Message Text / Markdown",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "blocks",
            displayName: "Block Kit Blocks (JSON)",
            type: "json",
            supportsVariables: true,
          },
          {
            name: "threadTs",
            displayName: "Thread Timestamp (for thread replies)",
            type: "string",
            supportsVariables: true,
          },
        ],
      },
      post_ephemeral: {
        displayName: "Post Ephemeral Message",
        description: "Sends a temporary message visible only to a specific user",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "channel",
            displayName: "Channel ID",
            type: "string",
            required: true,
          },
          {
            name: "userId",
            displayName: "User ID",
            type: "string",
            required: true,
          },
          {
            name: "text",
            displayName: "Message Text",
            type: "string",
            required: true,
          },
        ],
      },
      create_channel: {
        displayName: "Create Channel",
        description: "Creates a new public or private Slack channel",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "channelName",
            displayName: "Channel Name",
            type: "string",
            required: true,
          },
          {
            name: "isPrivate",
            displayName: "Is Private Channel?",
            type: "boolean",
            defaultValue: false,
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    ok: z.boolean().optional(),
    ts: z.string().optional(),
    channel: z.string().optional(),
    message: z.any().optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId = "post_message", channel, text, message, blocks, threadTs, userId, channelName, isPrivate } = ctx.parameters;
    const botToken =
      ctx.credentials?.token ||
      ctx.credentials?.accessToken ||
      ctx.credentials?.botToken ||
      "mock_slack_bot_token";

    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://slack.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (actionId === "post_message") {
      const targetChannel = channel || "#general";
      const messageText = text || message || "";

      ctx.logger.info(`Posting message to Slack channel ${targetChannel}`);

      const payload: Record<string, any> = {
        channel: targetChannel,
        text: messageText,
      };

      if (blocks) {
        payload.blocks = typeof blocks === "string" ? JSON.parse(blocks) : blocks;
      }
      if (threadTs) {
        payload.thread_ts = threadTs;
      }

      const res = await ctx.http.request({
        url: `${cleanBase}/api/chat.postMessage`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: payload,
      });

      return {
        status: "SUCCESS",
        data: res.data || { ok: true, ts: `${Date.now()}.000100`, channel: targetChannel },
      };
    }

    if (actionId === "post_ephemeral") {
      const res = await ctx.http.request({
        url: `${cleanBase}/api/chat.postEphemeral`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: {
          channel,
          user: userId,
          text,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || { ok: true },
      };
    }

    if (actionId === "create_channel") {
      const res = await ctx.http.request({
        url: `${cleanBase}/api/conversations.create`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: {
          name: channelName,
          is_private: Boolean(isPrivate),
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || { ok: true, channel: { id: "C_MOCK_123", name: channelName } },
      };
    }

    throw new Error(`Unsupported Slack action: '${actionId}'`);
  },
};
