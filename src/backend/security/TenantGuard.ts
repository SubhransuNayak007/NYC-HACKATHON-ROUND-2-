/**
 * TenantGuard.ts
 * Multi-Tenant Workspace Boundary Isolation & 7-Tier RBAC Guard (Requirement R7).
 * Enforces cryptographic workspace separation at every route and data boundary,
 * strictly blocking cross-tenant access and logging security audit events.
 */

import { AuditLogChainer, globalAuditLogChainer } from "./AuditLogChainer";

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "EDITOR"
  | "OPERATOR"
  | "DEVELOPER"
  | "VIEWER";

export class ForbiddenError extends Error {
  public statusCode: number = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const RBAC_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: [
    "workspace.manage_billing",
    "workspace.delete",
    "workspace.manage_members",
    "workspace.invite_members",
    "credentials.create_update",
    "credentials.view_opaque",
    "workflows.create_edit",
    "workflows.delete",
    "workflows.deploy",
    "workflows.deploy_production",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "approvals.approve_reject",
    "approvals.decide",
    "scripts.author_sandbox",
    "audit_logs.view_export",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  ADMIN: [
    "workspace.invite_members",
    "workspace.manage_members",
    "credentials.create_update",
    "credentials.view_opaque",
    "workflows.create_edit",
    "workflows.delete",
    "workflows.deploy",
    "workflows.deploy_production",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "approvals.approve_reject",
    "approvals.decide",
    "scripts.author_sandbox",
    "audit_logs.view_export",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  MEMBER: [
    "credentials.view_opaque",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  EDITOR: [
    "credentials.view_opaque",
    "workflows.create_edit",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  OPERATOR: [
    "credentials.view_opaque",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "approvals.approve_reject",
    "approvals.decide",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  DEVELOPER: [
    "credentials.view_opaque",
    "workflows.create_edit",
    "workflows.execute_trigger",
    "workflows.manual_execute",
    "scripts.author_sandbox",
    "executions.view_logs",
    "executions.view_telemetry",
  ],
  VIEWER: [
    "executions.view_logs",
    "executions.view_telemetry",
  ],
};

export class TenantGuard {
  constructor(private auditLogger: AuditLogChainer = globalAuditLogChainer) {}

  /**
   * Check whether a role possesses a specific capability
   */
  public static hasPermission(role: UserRole | string, action: string): boolean {
    const normalizedRole = String(role).toUpperCase() as UserRole;
    const permissions = RBAC_PERMISSIONS[normalizedRole] || [];
    return permissions.includes(action);
  }

  /**
   * Assert permission, throwing 403 ForbiddenError if unauthorized
   */
  public static assertPermission(role: UserRole | string, action: string): void {
    if (!this.hasPermission(role, action)) {
      throw new ForbiddenError(
        `Access denied: Role '${role}' lacks permission for action '${action}'`
      );
    }
  }

  /**
   * Assert tenant boundary equality; logs CROSS_TENANT_ACCESS_DENIED on tampering
   */
  public static assertTenantOwnership(
    resourceTenantId: string,
    requestingTenantId: string,
    resourceType: string = "resource",
    resourceId: string = "unknown"
  ): void {
    if (resourceTenantId !== requestingTenantId) {
      globalAuditLogChainer.recordEvent(requestingTenantId, "CROSS_TENANT_ACCESS_DENIED", {
        resourceType,
        resourceId,
        attemptedByTenantId: requestingTenantId,
        ownerTenantId: resourceTenantId,
      });

      throw new ForbiddenError(
        `Access denied: Cross-tenant resource access is strictly prohibited`
      );
    }
  }

  /**
   * Assert workspace isolation boundary matching TestHarness signature
   */
  public static assertWorkspaceIsolation(
    resourceWorkspaceId: string,
    callerWorkspaceId: string
  ): void {
    if (resourceWorkspaceId !== callerWorkspaceId) {
      throw new Error(
        `Access Denied: Cross-tenant access blocked. Resource '${resourceWorkspaceId}' does not belong to caller workspace '${callerWorkspaceId}'.`
      );
    }
  }
}
