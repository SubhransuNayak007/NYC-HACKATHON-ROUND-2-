/**
 * TestHarnessModels.ts
 * Shared interface definitions, AST expression evaluators, cryptographic helpers,
 * DAG topological validators, and execution models for opaque-box E2E testing.
 */

import crypto from "node:crypto";

// ==========================================
// 1. Workflow & DAG Data Contracts
// ==========================================
export type NodeType = "trigger" | "action" | "condition" | "loop" | "ai" | "script";

export interface NodePort {
  id: string;
  name: string;
  type: "input" | "output";
  dataType?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  service?: string; // e.g. "webhook", "google_sheets", "hubspot", "slack", "canva", "gmail", "openai"
  operation?: string; // e.g. "append_row", "send_email", "post_message"
  label: string;
  parameters: Record<string, any>;
  credentialRef?: string; // opaque ID "cred_<uuid>"
  position?: { x: number; y: number };
  ports?: NodePort[];
  retryPolicy?: {
    maxAttempts: number;
    initialIntervalMs: number;
    backoffFactor: number;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // e.g. "true", "false", "item", "done"
  targetHandle?: string;
}

export interface WorkflowDefinitionV3 {
  id: string;
  version: number;
  name: string;
  tenantId: string;
  workspaceId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 2. Execution & Checkpoint Contracts
// ==========================================
export interface ExecutionCheckpoint {
  executionId: string;
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  status: "QUEUED" | "STARTED" | "RUNNING" | "WAITING_APPROVAL" | "WAITING_RETRY" | "COMPLETED" | "FAILED";
  currentNodeId: string | null;
  completedNodeIds: string[];
  pendingNodeIds: string[];
  nodeOutputs: Record<string, any>;
  workflowState: Record<string, any>;
  retryState: Record<string, { attempts: number; nextRetryAt: string }>;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
}

export type LifecycleEventType =
  | "execution.queued"
  | "execution.started"
  | "node.started"
  | "node.completed"
  | "node.failed"
  | "node.retrying"
  | "execution.waiting_approval"
  | "execution.resumed"
  | "execution.completed"
  | "execution.failed";

export interface LifecycleEvent {
  eventId: string;
  executionId: string;
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  eventType: LifecycleEventType;
  nodeId?: string;
  timestamp: string;
  payload: Record<string, any>;
  durationMs?: number;
}

// ==========================================
// 3. AST Expression Evaluator (Safe - Zero arbitrary eval)
// ==========================================
export class SafeExpressionEvaluator {
  /**
   * Evaluates expressions like:
   * - {{ $json.budget >= 10000 }}
   * - {{ $json.email }}
   * - {{ $node["AI Classifier"].output.classification == "Enterprise" }}
   */
  public static evaluate(expression: string, contextData: Record<string, any>): any {
    if (typeof expression !== "string") return expression;

    const trimmed = expression.trim();

    // Check if it's a template {{ ... }}
    const match = trimmed.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (!match) {
      // Normal string with possible embedded {{ ... }}
      return expression.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, inner) => {
        const val = SafeExpressionEvaluator.evalInner(inner.trim(), contextData);
        return val !== undefined && val !== null ? String(val) : "";
      });
    }

    return SafeExpressionEvaluator.evalInner(match[1].trim(), contextData);
  }

  private static evalInner(expr: string, context: Record<string, any>): any {
    // Prohibit forbidden identifiers
    const forbidden = ["eval", "Function", "process", "require", "import", "window", "document", "__proto__", "constructor"];
    for (const f of forbidden) {
      if (new RegExp(`\\b${f}\\b`).test(expr)) {
        throw new Error(`Security Violation: Access to '${f}' is prohibited in safe expressions.`);
      }
    }

    // Comparison operators: ==, !=, >=, <=, >, <
    const compRegex = /^(.*?)\s*(===|==|!==|!=|>=|<=|>|<)\s*(.*?)$/;
    const compMatch = expr.match(compRegex);
    if (compMatch) {
      const left = SafeExpressionEvaluator.evalInner(compMatch[1].trim(), context);
      const op = compMatch[2];
      const right = SafeExpressionEvaluator.evalInner(compMatch[3].trim(), context);

      switch (op) {
        case "==":
        case "===":
          return left == right;
        case "!=":
        case "!==":
          return left != right;
        case ">":
          return Number(left) > Number(right);
        case "<":
          return Number(left) < Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "<=":
          return Number(left) <= Number(right);
      }
    }

    // Literal number
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }

    // Literal boolean
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "null") return null;

    // Quoted string literal
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Variable path resolution (e.g. $json.budget or $node.Step1.output)
    if (expr.startsWith("$json.") || expr.startsWith("$json[") || expr.startsWith("$node.") || expr.startsWith("$node[")) {
      return SafeExpressionEvaluator.resolvePath(expr, context);
    }

    // Simple dot path
    return SafeExpressionEvaluator.resolvePath(expr, context);
  }

  private static resolvePath(path: string, obj: any): any {
    // Normalise bracket access to dot access: $node["Step"].output -> $node.Step.output
    const normalized = path.replace(/\[\s*["']?([^"']+)["']?\s*\]/g, ".$1");
    const segments = normalized.split(".").filter(Boolean);
    let current = obj;
    for (const seg of segments) {
      if (current === undefined || current === null) return undefined;
      current = current[seg];
    }
    return current;
  }
}

// ==========================================
// 4. DAG Topology & Cycle Detection
// ==========================================
export class DAGValidator {
  public static validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): { valid: boolean; error?: string; sortedNodeIds?: string[] } {
    const nodeMap = new Map<string, WorkflowNode>();
    for (const n of nodes) {
      if (nodeMap.has(n.id)) {
        return { valid: false, error: `Duplicate node ID: ${n.id}` };
      }
      nodeMap.set(n.id, n);
    }

    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const n of nodes) {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    }

    for (const e of edges) {
      if (!nodeMap.has(e.source)) {
        return { valid: false, error: `Edge source does not exist: ${e.source}` };
      }
      if (!nodeMap.has(e.target)) {
        return { valid: false, error: `Edge target does not exist: ${e.target}` };
      }
      if (e.source === e.target) {
        return { valid: false, error: `Self-referential cyclic edge detected on node: ${e.source}` };
      }
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }

    // Kahn's algorithm for topological sort & cycle detection
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const sorted: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      sorted.push(curr);

      for (const neighbor of adj.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== nodes.length) {
      return { valid: false, error: "Cycle detected in workflow graph." };
    }

    return { valid: true, sortedNodeIds: sorted };
  }
}

// ==========================================
// 5. AES-256-GCM Secure Credential Vault Model
// ==========================================
export class SecureCredentialVault {
  private key: Buffer;

  constructor(secretKeyHex?: string) {
    if (secretKeyHex) {
      this.key = Buffer.from(secretKeyHex, "hex");
    } else {
      // 32-byte key for AES-256
      this.key = crypto.createHash("sha256").update("quickreply_production_vault_master_seed_2026").digest();
    }
  }

  public encrypt(data: Record<string, any>): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
    const plaintext = JSON.stringify(data);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  public decrypt(encryptedString: string): Record<string, any> {
    const parts = encryptedString.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format. Expected iv:authTag:ciphertext.");
    }
    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }
}

// ==========================================
// 6. Cryptographic Audit Log Hash Chain
// ==========================================
export interface AuditLogEntry {
  index: number;
  timestamp: string;
  tenantId: string;
  eventType: string;
  details: Record<string, any>;
  previousHash: string;
  hash: string;
}

export class CryptographicAuditLog {
  private chain: AuditLogEntry[] = [];

  constructor() {
    // Genesis block
    const genesisHash = crypto.createHash("sha256").update("GENESIS_BLOCK_QUICKREPLY_2026").digest("hex");
    this.chain.push({
      index: 0,
      timestamp: "2026-01-01T00:00:00.000Z",
      tenantId: "system",
      eventType: "GENESIS",
      details: { init: true },
      previousHash: "0".repeat(64),
      hash: genesisHash,
    });
  }

  public append(tenantId: string, eventType: string, details: Record<string, any>): AuditLogEntry {
    const previous = this.chain[this.chain.length - 1];
    const timestamp = new Date().toISOString();
    const index = previous.index + 1;
    const rawData = `${previous.hash}|${index}|${timestamp}|${tenantId}|${eventType}|${JSON.stringify(details)}`;
    const hash = crypto.createHash("sha256").update(rawData).digest("hex");

    const entry: AuditLogEntry = {
      index,
      timestamp,
      tenantId,
      eventType,
      details,
      previousHash: previous.hash,
      hash,
    };
    this.chain.push(entry);
    return entry;
  }

  public verifyIntegrity(): { valid: boolean; tamperedIndex?: number } {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.hash) {
        return { valid: false, tamperedIndex: i };
      }

      const rawData = `${previous.hash}|${current.index}|${current.timestamp}|${current.tenantId}|${current.eventType}|${JSON.stringify(current.details)}`;
      const recomputedHash = crypto.createHash("sha256").update(rawData).digest("hex");
      if (current.hash !== recomputedHash) {
        return { valid: false, tamperedIndex: i };
      }
    }
    return { valid: true };
  }

  public getChain(): AuditLogEntry[] {
    return [...this.chain];
  }
}

// ==========================================
// 7. SSRF Guard Network Validator
// ==========================================
export class SSRFGuard {
  public static isSafeUrl(rawUrl: string, allowLocalhostForTests: boolean = false): { safe: boolean; reason?: string } {
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { safe: false, reason: `Invalid protocol: ${u.protocol}` };
      }

      const host = u.hostname.toLowerCase();

      // AWS metadata endpoint
      if (host === "169.254.169.254" || host.includes("metadata.google.internal")) {
        return { safe: false, reason: "Blocked cloud instance metadata endpoint." };
      }

      if (allowLocalhostForTests && (host === "localhost" || host === "127.0.0.1")) {
        return { safe: true };
      }

      // Loopback
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        return { safe: false, reason: "Blocked loopback address." };
      }

      // Private RFC 1918 ranges
      if (
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      ) {
        return { safe: false, reason: "Blocked private subnet IP range." };
      }

      return { safe: true };
    } catch (e: any) {
      return { safe: false, reason: `Malformed URL: ${e.message}` };
    }
  }
}

// ==========================================
// 8. RBAC Permission Matrix Model
// ==========================================
export type UserRole = "OWNER" | "ADMIN" | "EDITOR" | "OPERATOR" | "VIEWER";

export const RBAC_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: [
    "workspace.manage_billing",
    "workspace.invite_members",
    "credentials.create_update",
    "workflows.create_edit",
    "workflows.deploy",
    "workflows.execute_trigger",
    "approvals.approve_reject",
    "executions.view_logs",
  ],
  ADMIN: [
    "workspace.invite_members",
    "credentials.create_update",
    "workflows.create_edit",
    "workflows.deploy",
    "workflows.execute_trigger",
    "approvals.approve_reject",
    "executions.view_logs",
  ],
  EDITOR: [
    "workflows.create_edit",
    "workflows.execute_trigger",
    "executions.view_logs",
  ],
  OPERATOR: [
    "workflows.execute_trigger",
    "approvals.approve_reject",
    "executions.view_logs",
  ],
  VIEWER: [
    "executions.view_logs",
  ],
};

export class TenantGuard {
  public static hasPermission(role: UserRole, action: string): boolean {
    const allowed = RBAC_PERMISSIONS[role] || [];
    return allowed.includes(action);
  }

  public static assertWorkspaceIsolation(
    resourceWorkspaceId: string,
    callerWorkspaceId: string
  ): void {
    if (resourceWorkspaceId !== callerWorkspaceId) {
      throw new Error(`Access Denied: Cross-tenant access blocked. Resource '${resourceWorkspaceId}' does not belong to caller workspace '${callerWorkspaceId}'.`);
    }
  }
}

// ==========================================
// 9. Backoff Calculation Helper
// ==========================================
export class BackoffCalculator {
  public static calculateWaitTime(attempt: number, initialMs = 1000, maxMs = 60000, jitterMs = 100): number {
    const raw = initialMs * Math.pow(2, attempt);
    const clamped = Math.min(raw, maxMs);
    const jitter = Math.floor(Math.random() * jitterMs);
    return clamped + jitter;
  }
}
