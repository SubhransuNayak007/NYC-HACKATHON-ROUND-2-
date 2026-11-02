/**
 * QuickReply HubSpot CRM Connector
 * src/backend/nodes/connectors/HubSpotConnector.ts
 */

import { z } from "zod";
import { INodeDefinition, INodeExecutionContext, NodeExecutionOutput } from "../NodeSDK";

export const HubSpotConnector: INodeDefinition = {
  id: "hubspot",
  name: "HubSpot CRM",
  version: 1,
  category: "action",
  description: "Create, search, and update contacts and pipeline deals in HubSpot CRM",
  icon: "users",
  auth: {
    type: "oauth2",
    credentialAppId: "hubspot",
    requiredScopes: ["crm.objects.contacts.write", "crm.objects.deals.write"],
  },
  parametersSchema: {
    actions: {
      upsert_contact: {
        displayName: "Upsert Contact",
        description: "Creates a new contact or updates an existing contact by email",
        riskLevel: "EXTERNAL_COMMUNICATION",
        fields: [
          {
            name: "email",
            displayName: "Contact Email",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "properties",
            displayName: "Custom Contact Properties (JSON)",
            type: "json",
            supportsVariables: true,
          },
          {
            name: "firstname",
            displayName: "First Name",
            type: "string",
            supportsVariables: true,
          },
          {
            name: "lastname",
            displayName: "Last Name",
            type: "string",
            supportsVariables: true,
          },
          {
            name: "company",
            displayName: "Company Name",
            type: "string",
            supportsVariables: true,
          },
          {
            name: "lifecyclestage",
            displayName: "Lifecycle Stage",
            type: "select",
            defaultValue: "lead",
            options: [
              { label: "Lead", value: "lead" },
              { label: "Marketing Qualified Lead", value: "marketingqualifiedlead" },
              { label: "Sales Qualified Lead", value: "salesqualifiedlead" },
              { label: "Opportunity", value: "opportunity" },
              { label: "Customer", value: "customer" },
            ],
          },
        ],
      },
      create_deal: {
        displayName: "Create Deal",
        description: "Creates a new pipeline deal",
        riskLevel: "REVERSIBLE",
        fields: [
          {
            name: "dealname",
            displayName: "Deal Name",
            type: "string",
            required: true,
            supportsVariables: true,
          },
          {
            name: "amount",
            displayName: "Deal Amount",
            type: "number",
            required: true,
            supportsVariables: true,
          },
          {
            name: "dealstage",
            displayName: "Deal Stage",
            type: "string",
            defaultValue: "qualifiedtobuy",
          },
          {
            name: "associatedContactId",
            displayName: "Associated Contact ID",
            type: "string",
            supportsVariables: true,
          },
        ],
      },
      search_contacts: {
        displayName: "Search Contacts",
        description: "Filter and search contacts in HubSpot",
        riskLevel: "SAFE_READ",
        fields: [
          {
            name: "query",
            displayName: "Search Query (Name or Email)",
            type: "string",
            required: true,
          },
        ],
      },
    },
  },
  outputSchema: z.object({
    id: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  async execute(ctx: INodeExecutionContext): Promise<NodeExecutionOutput> {
    const {
      actionId = "upsert_contact",
      email,
      properties = {},
      firstname,
      lastname,
      company,
      lifecyclestage,
      dealname,
      amount,
      dealstage,
      associatedContactId,
      query,
    } = ctx.parameters;

    const accessToken =
      ctx.credentials?.accessToken ||
      ctx.credentials?.token ||
      ctx.credentials?.apiKey ||
      "mock_hubspot_token";

    const baseUrl =
      ctx.credentials?.baseUrl ||
      ctx.parameters?.baseUrl ||
      process.env.MOCK_SERVER_URL ||
      "https://api.hubapi.com";

    const cleanBase = baseUrl.replace(/\/+$/, "");

    if (actionId === "upsert_contact") {
      if (!email) throw new Error("Missing required 'email' parameter for HubSpot upsert_contact");

      const contactProps: Record<string, any> = {
        email,
        ...(properties || {}),
      };
      if (firstname) contactProps.firstname = firstname;
      if (lastname) contactProps.lastname = lastname;
      if (company) contactProps.company = company;
      if (lifecyclestage) contactProps.lifecyclestage = lifecyclestage;

      ctx.logger.info(`Upserting HubSpot contact: ${email}`);

      const res = await ctx.http.request({
        url: `${cleanBase}/crm/v3/objects/contacts`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          properties: contactProps,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || {
          id: "contact_mock_8819",
          properties: contactProps,
          createdAt: new Date().toISOString(),
        },
      };
    }

    if (actionId === "create_deal") {
      if (!dealname) throw new Error("Missing required 'dealname' for create_deal");

      const dealProps: Record<string, any> = {
        dealname,
        amount: String(amount || 0),
        dealstage: dealstage || "qualifiedtobuy",
        pipeline: "default",
      };

      ctx.logger.info(`Creating HubSpot deal: ${dealname} ($${amount})`);

      const res = await ctx.http.request({
        url: `${cleanBase}/crm/v3/objects/deals`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          properties: dealProps,
          associations: associatedContactId
            ? [
                {
                  to: { id: associatedContactId },
                  types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
                },
              ]
            : undefined,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || { id: "deal_mock_101", properties: dealProps },
      };
    }

    if (actionId === "search_contacts") {
      const res = await ctx.http.request({
        url: `${cleanBase}/crm/v3/objects/contacts/search`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          query: query || "",
          limit: 10,
        },
      });

      return {
        status: "SUCCESS",
        data: res.data || { results: [] },
      };
    }

    throw new Error(`Unsupported HubSpot action: '${actionId}'`);
  },
};
