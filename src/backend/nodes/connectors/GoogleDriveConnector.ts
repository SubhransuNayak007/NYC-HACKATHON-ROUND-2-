/**
 * QuickReply Google Drive Connector
 * src/backend/nodes/connectors/GoogleDriveConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const GoogleDriveConnector: INodeDefinition = {
  id: "google_drive",
  name: "Google Drive",
  version: 1,
  category: "action",
  description: "Upload files, create directories, manage permissions, and retrieve sharing links in Google Drive",
  icon: "hard-drive",
  auth: {
    type: "oauth2",
    credentialAppId: "google_drive",
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
  },
  parametersSchema: {
    actions: {
      upload_file: {
        displayName: "Upload File",
        description: "Uploads a file or document to a specific Google Drive folder",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "fileName",
            displayName: "File Name",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "fileUrl",
            displayName: "Source File URL (e.g. Canva export URL)",
            type: "string",
            supportsVariables: true,
          },
          {
            name: "fileData",
            displayName: "Base64 / Binary File Content",
            type: "string",
            supportsVariables: true,
          },
          {
            name: "folderId",
            displayName: "Target Folder ID",
            type: "string",
            defaultValue: "root",
            supportsVariables: true,
          },
          {
            name: "mimeType",
            displayName: "File MIME Type",
            type: "string",
            defaultValue: "application/pdf",
          },
        ],
      },
      create_folder: {
        displayName: "Create Folder",
        description: "Creates a new folder in Google Drive",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "folderName",
            displayName: "Folder Name",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "parentFolderId",
            displayName: "Parent Folder ID",
            type: "string",
            defaultValue: "root",
            supportsVariables: true,
          },
        ],
      },
      get_download_link: {
        displayName: "Get File Sharing / Download Link",
        description: "Retrieves web view link and direct download URL",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "fileId",
            displayName: "Google Drive File ID",
            type: "string",
            required: true,
            supportsVariables: true,
          },
        ],
      },
      folder_permissions: {
        displayName: "Set Permissions",
        description: "Updates access permissions on a file or folder",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "fileId",
            displayName: "File / Folder ID",
            type: "string",
            required: true,
          },
          {
            name: "role",
            displayName: "Permission Role",
            type: "select",
            defaultValue: "reader",
            options: [
              { label: "Viewer / Reader", value: "reader" },
              { label: "Commenter", value: "commenter" },
              { label: "Editor / Writer", value: "writer" },
            ],
          },
          {
            name: "type",
            displayName: "Grantee Type",
            type: "select",
            defaultValue: "anyone",
            options: [
              { label: "Anyone with link", value: "anyone" },
              { label: "Specific User", value: "user" },
            ],
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    webViewLink: z.string().optional(),
    webContentLink: z.string().optional(),
    folderId: z.string().optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const {
      actionId = "upload_file",
      fileName,
      fileUrl,
      fileData,
      folderId = "root",
      mimeType = "application/pdf",
      folderName,
      parentFolderId = "root",
      fileId,
      role = "reader",
      type = "anyone",
    } = ctx.parameters;

    const accessToken = ctx.credentials?.accessToken || ctx.credentials?.access_token || "mock_drive_token";
    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://www.googleapis.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (actionId === "upload_file") {
      const name = fileName || `QuickReply_Upload_${Date.now()}.pdf`;
      ctx.logger.info(`Uploading file '${name}' to Drive folder '${folderId}'`);

      const res = await ctx.http.request({
        url: `${cleanBase}/drive/v3/files`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          name,
          parents: folderId && folderId !== "root" ? [folderId] : undefined,
          mimeType,
          fileUrl,
          fileData,
        },
      });

      const uploadedId = res.data?.id || `drive_file_${Date.now()}`;
      const webViewLink =
        res.data?.webViewLink ||
        `https://drive.google.com/file/d/${uploadedId}/view`;

      return {
        status: "SUCCESS",
        data: {
          id: uploadedId,
          name,
          webViewLink,
          webContentLink: res.data?.webContentLink || `https://drive.google.com/uc?id=${uploadedId}`,
          folderId,
        },
      };
    }

    if (actionId === "create_folder") {
      if (!folderName) throw new Error("Missing required 'folderName'");

      ctx.logger.info(`Creating Drive folder '${folderName}' inside '${parentFolderId}'`);
      const res = await ctx.http.request({
        url: `${cleanBase}/drive/v3/files`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: parentFolderId && parentFolderId !== "root" ? [parentFolderId] : undefined,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || { id: `folder_${Date.now()}`, name: folderName },
      };
    }

    if (actionId === "get_download_link") {
      if (!fileId) throw new Error("Missing required 'fileId'");

      const res = await ctx.http.request({
        url: `${cleanBase}/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,webViewLink,webContentLink`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || {
          id: fileId,
          webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
        },
      };
    }

    if (actionId === "folder_permissions") {
      if (!fileId) throw new Error("Missing required 'fileId'");

      const res = await ctx.http.request({
        url: `${cleanBase}/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: { role, type },
      });

      return {
        status: "SUCCESS",
        data: res.data || { id: "perm_123", role, type },
      };
    }

    throw new Error(`Unsupported Google Drive action: '${actionId}'`);
  },
};
