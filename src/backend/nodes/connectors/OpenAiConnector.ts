/**
 * QuickReply OpenAI SDK Connector
 * src/backend/nodes/connectors/OpenAiConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const OpenAiConnector: INodeDefinition = {
  id: "openai",
  name: "OpenAI GPT",
  version: 1,
  category: "ai",
  description: "Execute reasoning, creative generation, structured JSON extraction, and embeddings using OpenAI models",
  icon: "bot",
  auth: {
    type: "api_key",
    credentialAppId: "openai",
  },
  parametersSchema: {
    actions: {
      chat_completion: {
        displayName: "Chat Completion / Generation",
        description: "Sends prompt to GPT-4o with structured JSON parsing",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "model",
            displayName: "OpenAI Model",
            type: "select",
            defaultValue: "gpt-4o",
            options: [
              { label: "GPT-4o (Omni Reasoning)", value: "gpt-4o" },
              { label: "GPT-4o Mini (Fast & Cost Efficient)", value: "gpt-4o-mini" },
            ],
            required: true,
          },
          {
            name: "systemPrompt",
            displayName: "System Instructions",
            type: "string",
            defaultValue: "You are an expert enterprise automation assistant. Output valid JSON when required.",
          },
          {
            name: "promptTemplate",
            displayName: "User Prompt / Message",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "temperature",
            displayName: "Sampling Temperature (0.0 - 1.0)",
            type: "number",
            defaultValue: 0.2,
          },
          {
            name: "responseFormat",
            displayName: "Response Format",
            type: "select",
            defaultValue: "text",
            options: [
              { label: "Plain Text / Markdown", value: "text" },
              { label: "Structured JSON Object", value: "json_object" },
            ],
          },
        ],
      },
      create_embeddings: {
        displayName: "Create Vector Embeddings",
        description: "Generates high-dimensional vector embeddings for text search",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "input",
            displayName: "Input Text",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "model",
            displayName: "Embedding Model",
            type: "string",
            defaultValue: "text-embedding-3-small",
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    text: z.string(),
    parsedJson: z.any().optional(),
    usage: z
      .object({
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
      })
      .optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const {
      actionId = "chat_completion",
      model = "gpt-4o",
      systemPrompt,
      promptTemplate,
      prompt,
      messages,
      temperature = 0.2,
      responseFormat = "text",
      input,
    } = ctx.parameters;

    const apiKey = ctx.credentials?.apiKey || ctx.credentials?.api_key || "mock_openai_key";
    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://api.openai.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (actionId === "chat_completion") {
      const userContent = promptTemplate || prompt || (Array.isArray(messages) ? messages[messages.length - 1]?.content : "");
      if (!userContent && (!messages || messages.length === 0)) {
        throw new Error("Missing user prompt ('promptTemplate' or 'messages') for OpenAI chat_completion");
      }

      const requestMessages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        requestMessages.push({ role: "system", content: systemPrompt });
      }

      if (Array.isArray(messages) && messages.length > 0) {
        requestMessages.push(...messages);
      } else {
        requestMessages.push({ role: "user", content: userContent });
      }

      const requestBody: Record<string, any> = {
        model,
        messages: requestMessages,
        temperature: Number(temperature),
      };

      if (responseFormat === "json_object") {
        requestBody.response_format = { type: "json_object" };
      }

      ctx.logger.info(`Invoking OpenAI ${model} chat completion`);
      const res = await ctx.http.request({
        url: `${cleanBase}/v1/chat/completions`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      const choice = res.data?.choices?.[0];
      const messageContent = choice?.message?.content || "";

      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(messageContent);
      } catch {
        // Not JSON
      }

      const promptTokens = res.data?.usage?.prompt_tokens || 100;
      const completionTokens = res.data?.usage?.completion_tokens || 50;
      const totalTokens = promptTokens + completionTokens;

      return {
        status: "SUCCESS",
        data: {
          text: messageContent,
          ...(parsedJson && typeof parsedJson === "object" ? parsedJson : {}),
          parsedJson,
          usage: {
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
          },
        },
        metrics: {
          tokensConsumed: totalTokens,
        },
      };
    }

    if (actionId === "create_embeddings") {
      const textToEmbed = input || promptTemplate || "";
      if (!textToEmbed) throw new Error("Missing 'input' text for embeddings");

      const res = await ctx.http.request({
        url: `${cleanBase}/v1/embeddings`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: {
          model: model || "text-embedding-3-small",
          input: textToEmbed,
        },
      });

      const embedding = res.data?.data?.[0]?.embedding || [];
      return {
        status: "SUCCESS",
        data: {
          embedding,
          dimensions: embedding.length,
        },
      };
    }

    throw new Error(`Unsupported OpenAI action: '${actionId}'`);
  },
};
