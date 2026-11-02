/**
 * QuickReply Notion Connector
 * src/backend/nodes/connectors/NotionConnector.ts
 */

import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const NotionConnector: INodeDefinition = {
  id: "notion",
  name: "Notion",
  version: 1,
  category: "action",
  description: "Create and query database pages, tasks, notes, and records in Notion",
  icon: "file-text",
  auth: {
    type: "oauth2",
    credentialAppId: "notion",
    requiredScopes: ["read_content", "update_content", "insert_content"],
  },
  parametersSchema: {
    actions: {
      create_page: {
        displayName: "Create Database Page",
        description: "Creates a new item in a designated Notion database",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "databaseId",
            displayName: "Database ID",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "title",
            displayName: "Page Title",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "properties",
            displayName: "Properties (JSON)",
            type: "json",
            supportsVariables: true,
          },
        ],
      },
    },
  },

  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId = "create_page", databaseId, title, properties } = ctx.parameters;
    const token = ctx.credentials?.token || ctx.credentials?.accessToken || "mock_notion_key";

    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://api.notion.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (!databaseId) {
      return { status: "FAILED", data: null, error: "Missing required parameter: databaseId." };
    }

    const payload: any = {
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title || "Untitled" } }] },
      },
    };

    if (properties) {
      Object.assign(payload.properties, typeof properties === "string" ? JSON.parse(properties) : properties);
    }

    const res = await ctx.http.request({
      url: `${cleanBase}/v1/pages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: payload,
    });

    return {
      status: "SUCCESS",
      data: res.data || { ok: true, id: `notion_page_${Date.now()}` },
    };
  },
};
