/**
 * ============================================================================
 *  QuickReply — Centralized Authorization Service
 *  src/backend/authorization.ts
 *
 *  Purpose:
 *    Single place for authorization decisions. Prevents scattered
 *    `if (user.role === 'admin')` checks throughout route handlers.
 *
 *  Model:
 *    Principal (who) + Action (what) + Resource (which) -> Decision
 *
 *  OWASP: API1 — Broken Object Level Authorization
 *         API5 — Broken Function Level Authorization
 *  NIST SP 800-207: Least Privilege, Explicit Resource Authorization
 * ============================================================================
 */

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  constructor(
    message: string,
    public readonly action: string,
    public readonly resource: string
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// -----------------------------------------------------------------
//  ROLE HIERARCHY
//  Each role inherits all permissions of roles below it.
// -----------------------------------------------------------------

export type Role = "OWNER" | "ADMIN" | "MANAGER" | "OPERATOR" | "ANALYST" | "MEMBER" | "VIEWER";

const ROLE_RANK: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  OPERATOR: 40,
  ANALYST: 30,
  MEMBER: 20,
  VIEWER: 10,
};

function roleRank(role: Role): number {
  return ROLE_RANK[role] ?? 0;
}

// -----------------------------------------------------------------
//  ACTION POLICY TABLE
//  Maps action strings to the minimum role required.
// -----------------------------------------------------------------

export type Action =
  // Instagram integration
  | "instagram.connection.read"
  | "instagram.connection.connect"
  | "instagram.connection.disconnect"
  | "instagram.publish.create"
  | "instagram.publish.execute"
  | "instagram.analytics.read"
  | "instagram.comments.read"
  | "instagram.comments.reply"
  // Automation
  | "automation.create"
  | "automation.read"
  | "automation.update"
  | "automation.delete"
  | "automation.enable"
  | "automation.disable"
  // Workspace
  | "workspace.members.read"
  | "workspace.members.manage"
  | "workspace.settings.read"
  | "workspace.settings.update"
  // Billing
  | "billing.read"
  | "billing.manage"
  // Security
  | "security.audit.read"
  | "security.settings.update";

const ACTION_POLICY: Record<Action, Role> = {
  // Instagram — reading requires MEMBER+, management requires OPERATOR+
  "instagram.connection.read":       "MEMBER",
  "instagram.connection.connect":    "OPERATOR",
  "instagram.connection.disconnect": "ADMIN",
  "instagram.publish.create":        "OPERATOR",
  "instagram.publish.execute":       "OPERATOR",
  "instagram.analytics.read":        "ANALYST",
  "instagram.comments.read":         "MEMBER",
  "instagram.comments.reply":        "OPERATOR",
  // Automation
  "automation.create":  "OPERATOR",
  "automation.read":    "MEMBER",
  "automation.update":  "OPERATOR",
  "automation.delete":  "MANAGER",
  "automation.enable":  "OPERATOR",
  "automation.disable": "OPERATOR",
  // Workspace
  "workspace.members.read":    "MEMBER",
  "workspace.members.manage":  "ADMIN",
  "workspace.settings.read":   "MEMBER",
  "workspace.settings.update": "ADMIN",
  // Billing
  "billing.read":   "ADMIN",
  "billing.manage": "OWNER",
  // Security
  "security.audit.read":      "ADMIN",
  "security.settings.update": "OWNER",
};

export interface Principal {
  email: string;
  role?: Role;
  organizationId?: string;
}

/**
 * Authorize a principal to perform an action.
 * Throws AuthorizationError if denied.
 *
 * Usage:
 *   import { authorize } from "@/backend/authorization";
 *   authorize(user, "instagram.connection.connect", connectionId);
 */
export function authorize(
  principal: Principal,
  action: Action,
  resourceId?: string
): void {
  const role = principal.role ?? "VIEWER";
  const requiredRole = ACTION_POLICY[action];

  if (!requiredRole) {
    throw new AuthorizationError(
      `Unknown action: ${action}`,
      action,
      resourceId ?? "unknown"
    );
  }

  if (roleRank(role) < roleRank(requiredRole)) {
    throw new AuthorizationError(
      `Insufficient permissions: action "${action}" requires role ${requiredRole}, principal has ${role}`,
      action,
      resourceId ?? "unknown"
    );
  }
}

/**
 * Verify that a resource belongs to the requesting tenant.
 * Throws AuthorizationError if the resource does not belong to the tenant.
 *
 * OWASP API1: Broken Object Level Authorization prevention.
 *
 * Usage:
 *   assertTenantOwnership(resourceTenantId, requestingEmail, "instagram-connection", connectionId);
 */
export function assertTenantOwnership(
  resourceTenantId: string,
  requestingEmail: string,
  resourceType: string,
  resourceId: string
): void {
  if (!resourceTenantId || !requestingEmail) {
    throw new AuthorizationError(
      "Cannot verify ownership: missing tenant or resource context",
      `${resourceType}.read`,
      resourceId
    );
  }

  // Normalize to lowercase email comparison
  if (resourceTenantId.toLowerCase().trim() !== requestingEmail.toLowerCase().trim()) {
    // Log with enough detail for investigation but without exposing the attacker's target
    console.error(
      `[Authorization] CROSS_TENANT_DENIAL: ${requestingEmail} attempted access to ${resourceType}/${resourceId} owned by a different tenant`
    );
    throw new AuthorizationError(
      `You do not have access to this ${resourceType}`,
      `${resourceType}.read`,
      resourceId
    );
  }
}

/**
 * Convenience: returns true if authorized, false if denied (no throw).
 */
export function canPerform(principal: Principal, action: Action): boolean {
  try {
    authorize(principal, action);
    return true;
  } catch {
    return false;
  }
}
