/**
 * QuickReply Anthropic Claude Connector
 * src/backend/nodes/connectors/AnthropicConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const AnthropicConnector: INodeDefinition = {
  id: "anthropic",
  name: "Anthropic Claude",
  version: 1,
  category: "ai",
  description: "Execute reasoning, classification, extraction, and structured JSON output using Claude 3.5 Sonnet / Haiku",
  icon: "sparkles",
  auth: {
    type: "api_key",
    credentialAppId: "anthropic",
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
              { label: "Claude 3.5 Haiku (Fast)", value: "claude-3-5-haiku-20241022" },
            ],
            required: true,
          },
          {
            name: "systemPrompt",
            displayName: "System Prompt",
            type: "string",
            defaultValue: "You are an expert enterprise classification assistant. Output JSON only.",
          },
          {
            name: "promptTemplate",
            displayName: "User Prompt / Input",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "temperature",
            displayName: "Temperature (0.0 - 1.0)",
            type: "number",
            defaultValue: 0.2,
          },
          {
            name: "maxTokens",
            displayName: "Max Output Tokens",
            type: "number",
            defaultValue: 1024,
          },
        ],
      },
      classify_intent: {
        displayName: "Classify Intent",
        description: "Specialized intent and sentiment categorization using Claude",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "input",
            displayName: "Text to Classify",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "categories",
            displayName: "Possible Categories (Comma separated or JSON Array)",
            type: "string",
            defaultValue: "Support, Billing, Sales, Partnership",
            required: true,
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
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
      })
      .optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const {
      actionId = "messages_create",
      model = "claude-3-5-sonnet-20241022",
      systemPrompt,
      promptTemplate,
      prompt,
      messages,
      temperature = 0.2,
      maxTokens = 1024,
      input,
      categories,
    } = ctx.parameters;

    const apiKey =
      ctx.credentials?.apiKey ||
      ctx.credentials?.api_key ||
      ctx.credentials?.token ||
      "mock_anthropic_key";

    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://api.anthropic.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    let system = systemPrompt;
    let userPrompt = promptTemplate || prompt || input;

    if (actionId === "classify_intent") {
      system = `You are a classification model. Classify the user text into one of these categories: ${categories}. Output a JSON object with keys "category", "confidence", and "rationale".`;
      userPrompt = `Text to classify: ${input || promptTemplate || ""}`;
    }

    if (!userPrompt && (!messages || messages.length === 0)) {
      throw new Error("Missing user prompt ('promptTemplate' or 'messages') for Anthropic Claude");
    }

    const messageList = Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: "user", content: userPrompt }];

    ctx.logger.info(`Invoking Anthropic Messages API with model ${model}`);
    const res = await ctx.http.request({
      url: `${cleanBase}/v1/messages`,
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: {
        model,
        max_tokens: maxTokens,
        temperature: Number(temperature),
        system: system || undefined,
        messages: messageList,
      },
    });

    const contentText =
      res.data?.content?.[0]?.text ||
      res.data?.text ||
      (typeof res.data === "string" ? res.data : "");

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(contentText);
    } catch {
      // Content was not raw JSON
    }

    const inputTokens = res.data?.usage?.input_tokens || 120;
    const outputTokens = res.data?.usage?.output_tokens || 60;
    const totalTokens = inputTokens + outputTokens;

    return {
      status: "SUCCESS",
      data: {
        text: contentText,
        ...(parsedJson && typeof parsedJson === "object" ? parsedJson : {}),
        parsedJson,
        usage: {
          inputTokens,
          outputTokens,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      },
      metrics: {
        tokensConsumed: totalTokens,
      },
    };
  },
};
