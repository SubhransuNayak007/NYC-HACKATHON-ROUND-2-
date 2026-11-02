import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { IntegrationCatalog } from "@/backend/automation/catalog/IntegrationCatalog";
import { CredentialVault } from "@/backend/automation/vault/CredentialVault";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/catalog
 * List all available integrations with tenant connection status
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest";

    const allApps = IntegrationCatalog.getAll();
    const storedCredentials = session
      ? await CredentialVault.listCredentials(tenantId)
      : [];

    const catalogWithStatus = allApps.map((app) => {
      const activeCred = storedCredentials.find(
        (c) => c.appId === app.appId && c.status === "ACTIVE"
      );
      return {
        ...app,
        isConnected: Boolean(activeCred),
        activeAccount: activeCred ? activeCred.accountLabel : null,
      };
    });

    return NextResponse.json({
      success: true,
      total: catalogWithStatus.length,
      integrations: catalogWithStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load integration catalog" },
      { status: 500 }
    );
  }
}
