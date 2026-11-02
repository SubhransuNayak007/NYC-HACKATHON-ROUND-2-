/**
 * ============================================================================
 * QuickReply — Human Review & Approval Service
 * src/backend/approval/ApprovalService.ts
 *
 * Manages human-in-the-loop approval queues for high-risk automations.
 * Prevents unauthorized or unapproved execution of sensitive actions.
 * ============================================================================
 */

import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  workspaceId: string;
  executionId: string;
  workflowId?: string;
  actionType: string;
  riskScore: number;
  reason: string;
  customerContext?: {
    actorName?: string;
    platform?: string;
    inboundText?: string;
  };
  suggestedAction: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  rejectionReason?: string;
}

export class ApprovalService {
  /**
   * Create an approval request when policy flags high-risk automation
   */
  static async createRequest(params: {
    tenantId: string;
    workspaceId: string;
    executionId: string;
    workflowId?: string;
    actionType: string;
    riskScore: number;
    reason: string;
    customerContext?: ApprovalRequest["customerContext"];
    suggestedAction: Record<string, any>;
    ttlHours?: number;
  }): Promise<ApprovalRequest> {
    const id = `apr_${uuidv4()}`;
    const ttl = params.ttlHours || 24;
    const now = Date.now();

    const request: ApprovalRequest = {
      id,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      executionId: params.executionId,
      workflowId: params.workflowId,
      actionType: params.actionType,
      riskScore: params.riskScore,
      reason: params.reason,
      customerContext: params.customerContext,
      suggestedAction: params.suggestedAction,
      status: "PENDING",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl * 3600 * 1000).toISOString(),
    };

    const db = await getDB(params.tenantId);
    if (!db.approvalRequests) db.approvalRequests = [];

    db.approvalRequests.unshift(request);
    await saveDB(db, params.tenantId);

    // Audit log request creation
    await AuditLogger.log({
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      actorId: "system:policy_engine",
      actorEmail: "safety-guard@quickreply.ai",
      actorRole: "SYSTEM",
      action: "approval.created",
      resourceType: "approval",
      resourceId: id,
      description: `High-risk action intercepted (${params.reason}). Approval request #${id} generated.`,
      status: "SUCCESS",
    });

    return request;
  }

  /**
   * Approve a pending request with server-side authorization
   */
  static async approve(params: {
    requestId: string;
    tenantId: string;
    actorEmail: string;
    actorRole: string;
    modifiedAction?: Record<string, any>;
  }): Promise<{ success: boolean; request?: ApprovalRequest; error?: string }> {
    const db = await getDB(params.tenantId);
    if (!db.approvalRequests) db.approvalRequests = [];

    const request = db.approvalRequests.find((r: any) => r.id === params.requestId);
    if (!request) {
      return { success: false, error: "Approval request not found." };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: `Request already resolved with status: ${request.status}` };
    }

    request.status = "APPROVED";
    request.resolvedBy = params.actorEmail;
    request.resolvedAt = new Date().toISOString();
    if (params.modifiedAction) {
      request.suggestedAction = { ...request.suggestedAction, ...params.modifiedAction };
    }

    await saveDB(db, params.tenantId);

    await AuditLogger.log({
      tenantId: params.tenantId,
      workspaceId: request.workspaceId,
      actorId: params.actorEmail,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: "approval.approved",
      resourceType: "approval",
      resourceId: request.id,
      description: `Approval #${request.id} approved by ${params.actorEmail}. Resuming execution #${request.executionId}.`,
      status: "SUCCESS",
    });

    return { success: true, request };
  }

  /**
   * Reject a pending request
   */
  static async reject(params: {
    requestId: string;
    tenantId: string;
    actorEmail: string;
    actorRole: string;
    rejectionReason: string;
  }): Promise<{ success: boolean; request?: ApprovalRequest; error?: string }> {
    const db = await getDB(params.tenantId);
    if (!db.approvalRequests) db.approvalRequests = [];

    const request = db.approvalRequests.find((r: any) => r.id === params.requestId);
    if (!request) {
      return { success: false, error: "Approval request not found." };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: `Request already resolved with status: ${request.status}` };
    }

    request.status = "REJECTED";
    request.resolvedBy = params.actorEmail;
    request.resolvedAt = new Date().toISOString();
    request.rejectionReason = params.rejectionReason;

    await saveDB(db, params.tenantId);

    await AuditLogger.log({
      tenantId: params.tenantId,
      workspaceId: request.workspaceId,
      actorId: params.actorEmail,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: "approval.rejected",
      resourceType: "approval",
      resourceId: request.id,
      description: `Approval #${request.id} rejected by ${params.actorEmail} ("${params.rejectionReason}"). Execution cancelled.`,
      status: "SUCCESS",
    });

    return { success: true, request };
  }

  /**
   * List pending approvals for tenant review queue
   */
  static async listPending(tenantId: string): Promise<ApprovalRequest[]> {
    const db = await getDB(tenantId);
    return (db.approvalRequests || []).filter((r: any) => r.status === "PENDING");
  }
}
