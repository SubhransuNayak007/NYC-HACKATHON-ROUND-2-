/**
 * QuickReply Google Sheets Connector
 * src/backend/nodes/connectors/GoogleSheetsConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const GoogleSheetsConnector: INodeDefinition = {
  id: "google_sheets",
  name: "Google Sheets",
  version: 1,
  category: "action",
  description: "Read, append, update, and manage tabular spreadsheets in Google Sheets",
  icon: "table",
  auth: {
    type: "oauth2",
    credentialAppId: "google_sheets",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
  },
  parametersSchema: {
    actions: {
      append_row: {
        displayName: "Append Row(s)",
        description: "Appends rows to a spreadsheet tab",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "spreadsheetId",
            displayName: "Spreadsheet ID",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "sheetName",
            displayName: "Sheet Name / Range (e.g. Leads!A1)",
            type: "string",
            defaultValue: "Sheet1",
            required: true,
            supportsVariables: true,
          },
          {
            name: "rowValues",
            displayName: "Row Column Values (Array or Array of Arrays)",
            type: "json",
            required: true,
            supportsVariables: true,
          },
        ],
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
            required: true,
            supportsVariables: true,
          },
          {
            name: "sheetName",
            displayName: "Range (e.g. Sheet1!A1:Z100)",
            type: "string",
            defaultValue: "Sheet1!A1:Z50",
            required: true,
            supportsVariables: true,
          },
        ],
      },
      update_row: {
        displayName: "Update Range / Cells",
        description: "Updates values within a specific range",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "spreadsheetId",
            displayName: "Spreadsheet ID",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "range",
            displayName: "Target Range",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "values",
            displayName: "New Values (Array of Arrays)",
            type: "json",
            required: true,
            supportsVariables: true,
          },
        ],
      },
      clear_rows: {
        displayName: "Clear Range",
        description: "Clears values from a range",
        riskLevel: "DESTRUCTIVE",
        fields: [
          {
            name: "spreadsheetId",
            displayName: "Spreadsheet ID",
            type: "string",
            required: true,
          },
          {
            name: "range",
            displayName: "Range to Clear",
            type: "string",
            required: true,
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    updatedRange: z.string().optional(),
    updatedRows: z.number().optional(),
    rows: z.array(z.any()).optional(),
    values: z.array(z.any()).optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const { actionId = "append_row", spreadsheetId, sheetName, range, rowValues, values } = ctx.parameters;
    const accessToken = ctx.credentials?.accessToken || ctx.credentials?.access_token || "mock_google_token";

    // Resolve base endpoint (mock server or Google Sheets API v4)
    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://sheets.googleapis.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (actionId === "append_row") {
      if (!spreadsheetId) throw new Error("Missing required 'spreadsheetId'");
      const targetRange = sheetName || range || "Sheet1";
      const rows = Array.isArray(rowValues)
        ? (Array.isArray(rowValues[0]) ? rowValues : [rowValues])
        : [[rowValues]];

      const url = `${cleanBase}/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetRange)}:append?valueInputOption=USER_ENTERED`;

      ctx.logger.info(`Appending ${rows.length} row(s) to Google Sheets ${spreadsheetId}`);
      const res = await ctx.http.request({
        url,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: { values: rows },
      });

      return {
        status: "SUCCESS",
        data: res.data || { updatedRows: rows.length, updatedRange: targetRange },
        metrics: { recordsProcessed: rows.length },
      };
    }

    if (actionId === "read_sheet") {
      if (!spreadsheetId) throw new Error("Missing required 'spreadsheetId'");
      const targetRange = sheetName || range || "Sheet1!A1:Z50";
      const url = `${cleanBase}/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetRange)}`;

      ctx.logger.info(`Reading range '${targetRange}' from Google Sheets ${spreadsheetId}`);
      const res = await ctx.http.request({
        url,
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const extractedRows = res.data?.values || res.data?.rows || [];
      return {
        status: "SUCCESS",
        data: {
          rows: extractedRows,
          values: extractedRows,
          range: targetRange,
        },
        metrics: { recordsProcessed: extractedRows.length },
      };
    }

    if (actionId === "update_row" || actionId === "update_cell") {
      if (!spreadsheetId) throw new Error("Missing required 'spreadsheetId'");
      const targetRange = range || sheetName || "Sheet1!A1";
      const updateData = Array.isArray(values)
        ? (Array.isArray(values[0]) ? values : [values])
        : [[values]];

      const url = `${cleanBase}/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`;

      const res = await ctx.http.request({
        url,
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: { values: updateData },
      });

      return {
        status: "SUCCESS",
        data: res.data || { updatedRange: targetRange },
      };
    }

    if (actionId === "clear_rows") {
      if (!spreadsheetId) throw new Error("Missing required 'spreadsheetId'");
      const targetRange = range || sheetName || "Sheet1";
      const url = `${cleanBase}/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetRange)}:clear`;

      const res = await ctx.http.request({
        url,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {},
      });

      return {
        status: "SUCCESS",
        data: res.data || { clearedRange: targetRange },
      };
    }

    throw new Error(`Unsupported Google Sheets action: '${actionId}'`);
  },
};
