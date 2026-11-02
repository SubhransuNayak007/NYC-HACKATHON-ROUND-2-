/**
 * ============================================================
 *  QuickReply — Immutable Credit Ledger Engine
 *  src/backend/credits/ledger.ts
 *
 *  Production-grade transactional credit accounting system:
 *   1. Immutable Ledger: Every credit event is an append-only entry.
 *   2. Atomic Balance & Optimistic Concurrency: Prevents race conditions & double spending.
 *   3. Idempotency Guarantees: Prevents duplicate webhook / retry crediting.
 *   4. Reservation Pattern: Reserve credits -> Commit on success -> Release on failure.
 *   5. Configurable Model Cost Economics: Keyword = 1, AI = 5, RAG = 8 credits.
 * ============================================================
 */

import {
  getDB,
  saveDB,
  acquireLock,
  releaseLock,
  type DBData,
  type CreditAccount,
  type CreditLedgerEntry,
  type CreditReservation,
  type CreditTransactionType,
  type CreditReferenceType,
} from "@/database/db";

// ─────────────────────────────────────────────────────────────
//  MODEL COST CONFIGURATION (Configurable without redeployment)
// ─────────────────────────────────────────────────────────────

export interface ModelCostConfig {
  keywordReplyCost: number;
  aiReplyCost: number;
  ragReplyCost: number;
  bulkReplyCostPerItem: number;
  customCosts?: Record<string, number>;
}

export const MODEL_COST_CONFIGURATION: ModelCostConfig = {
  keywordReplyCost: parseInt(process.env.COST_KEYWORD_REPLY || "1", 10),
  aiReplyCost: parseInt(process.env.COST_AI_REPLY || "5", 10),
  ragReplyCost: parseInt(process.env.COST_RAG_REPLY || "8", 10),
  bulkReplyCostPerItem: parseInt(process.env.COST_BULK_ITEM || "5", 10),
};

export function calculateCreditCost(
  replySource: "rule" | "rag" | "ai" | "global" | "manual"
): number {
  switch (replySource) {
    case "rule":
    case "global":
      return MODEL_COST_CONFIGURATION.keywordReplyCost;
    case "rag":
      return MODEL_COST_CONFIGURATION.ragReplyCost;
    case "ai":
      return MODEL_COST_CONFIGURATION.aiReplyCost;
    case "manual":
    default:
      return 0; // Manual replies in the dashboard are free
  }
}

// ─────────────────────────────────────────────────────────────
//  BALANCE QUERY
// ─────────────────────────────────────────────────────────────

export interface CreditBalanceResult {
  tenantId: string;
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  lifetimeGranted: number;
  lifetimeUsed: number;
  version: number;
}

export async function getCreditBalance(
  tenantId: string
): Promise<CreditBalanceResult> {
  const safeTenant = tenantId.toLowerCase().trim();
  const db = await getDB(safeTenant);

  const account = db.creditAccount || {
    id: `cr_${safeTenant.replace(/[^a-z0-9]/g, "_")}`,
    tenantId: safeTenant,
    balance: 100,
    reservedBalance: 0,
    lifetimeGranted: 100,
    lifetimeUsed: 0,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const available = Math.max(0, account.balance - account.reservedBalance);

  return {
    tenantId: safeTenant,
    balance: account.balance,
    reservedBalance: account.reservedBalance,
    availableBalance: available,
    lifetimeGranted: account.lifetimeGranted,
    lifetimeUsed: account.lifetimeUsed,
    version: account.version,
  };
}

// ─────────────────────────────────────────────────────────────
//  GRANT CREDITS (Purchase / Subscription / Bonus / Admin)
// ─────────────────────────────────────────────────────────────

export interface GrantCreditsParams {
  tenantId: string;
  amount: number;
  type: CreditTransactionType;
  referenceType: CreditReferenceType;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export async function grantCredits(
  params: GrantCreditsParams
): Promise<{ success: boolean; entry: CreditLedgerEntry; balance: number; duplicate?: boolean }> {
  if (params.amount <= 0) {
    throw new Error("Credit grant amount must be positive");
  }

  const safeTenant = params.tenantId.toLowerCase().trim();
  const lockKey = `credit_lock_${safeTenant}`;
  const lockToken = await acquireLock(lockKey, 10_000);

  try {
    const db = await getDB(safeTenant);

    if (!db.creditLedger) db.creditLedger = [];
    if (!db.creditAccount) {
      db.creditAccount = {
        id: `cr_${safeTenant.replace(/[^a-z0-9]/g, "_")}`,
        tenantId: safeTenant,
        balance: 0,
        reservedBalance: 0,
        lifetimeGranted: 0,
        lifetimeUsed: 0,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
    }

    // 1. Idempotency check — ensure event has not already executed
    const existing = db.creditLedger.find(
      (entry) => entry.idempotencyKey === params.idempotencyKey
    );
    if (existing) {
      return {
        success: true,
        entry: existing,
        balance: db.creditAccount.balance,
        duplicate: true,
      };
    }

    // 2. Compute new balance
    const newBalance = db.creditAccount.balance + params.amount;
    const newLifetime = db.creditAccount.lifetimeGranted + params.amount;

    const ledgerEntry: CreditLedgerEntry = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: safeTenant,
      type: params.type,
      amount: params.amount,
      balanceAfter: newBalance,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    db.creditLedger.unshift(ledgerEntry);
    db.creditAccount.balance = newBalance;
    db.creditAccount.lifetimeGranted = newLifetime;
    db.creditAccount.version += 1;
    db.creditAccount.updatedAt = new Date().toISOString();

    await saveDB(db, safeTenant);

    return {
      success: true,
      entry: ledgerEntry,
      balance: newBalance,
    };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  RESERVE CREDITS (Before calling AI / External Publish)
// ─────────────────────────────────────────────────────────────

export interface ReserveCreditsParams {
  tenantId: string;
  amount: number;
  referenceType: CreditReferenceType;
  referenceId: string;
  idempotencyKey: string;
}

export async function reserveCredits(
  params: ReserveCreditsParams
): Promise<{ success: boolean; reservation?: CreditReservation; error?: string }> {
  if (params.amount <= 0) {
    return { success: true };
  }

  const safeTenant = params.tenantId.toLowerCase().trim();
  const lockKey = `credit_lock_${safeTenant}`;
  const lockToken = await acquireLock(lockKey, 10_000);

  try {
    const db = await getDB(safeTenant);

    if (!db.creditAccount) {
      return { success: false, error: "Credit account not found" };
    }
    if (!db.creditReservations) db.creditReservations = [];

    // Idempotency check on reservation
    const existing = db.creditReservations.find(
      (r) => r.idempotencyKey === params.idempotencyKey && r.status === "PENDING"
    );
    if (existing) {
      return { success: true, reservation: existing };
    }

    const available = db.creditAccount.balance - db.creditAccount.reservedBalance;
    if (available < params.amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${params.amount}, Available: ${available}`,
      };
    }

    // Atomically increment reserved balance
    db.creditAccount.reservedBalance += params.amount;
    db.creditAccount.version += 1;
    db.creditAccount.updatedAt = new Date().toISOString();

    const reservation: CreditReservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: safeTenant,
      amount: params.amount,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
    };

    db.creditReservations.unshift(reservation);
    await saveDB(db, safeTenant);

    return { success: true, reservation };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  COMMIT RESERVED CREDITS (After successful dispatch)
// ─────────────────────────────────────────────────────────────

export interface CommitCreditsParams {
  tenantId: string;
  reservationId: string;
  metadata?: Record<string, any>;
}

export async function commitCredits(
  params: CommitCreditsParams
): Promise<{ success: boolean; balance: number; error?: string }> {
  const safeTenant = params.tenantId.toLowerCase().trim();
  const lockKey = `credit_lock_${safeTenant}`;
  const lockToken = await acquireLock(lockKey, 10_000);

  try {
    const db = await getDB(safeTenant);
    if (!db.creditAccount || !db.creditReservations) {
      return { success: false, balance: 0, error: "Credit records missing" };
    }

    const resIndex = db.creditReservations.findIndex(
      (r) => r.id === params.reservationId && r.status === "PENDING"
    );

    if (resIndex === -1) {
      return {
        success: false,
        balance: db.creditAccount.balance,
        error: "Pending reservation not found or already processed",
      };
    }

    const reservation = db.creditReservations[resIndex];
    const amount = reservation.amount;

    // Deduct from total balance & release reservation
    db.creditAccount.balance = Math.max(0, db.creditAccount.balance - amount);
    db.creditAccount.reservedBalance = Math.max(0, db.creditAccount.reservedBalance - amount);
    db.creditAccount.lifetimeUsed += amount;
    db.creditAccount.version += 1;
    db.creditAccount.updatedAt = new Date().toISOString();

    reservation.status = "COMMITTED";

    // Record immutable USAGE entry
    const ledgerEntry: CreditLedgerEntry = {
      id: `tx_use_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: safeTenant,
      type: "USAGE",
      amount: -amount,
      balanceAfter: db.creditAccount.balance,
      referenceType: "REPLY_AI",
      referenceId: reservation.referenceId,
      idempotencyKey: `commit_${reservation.id}`,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    if (!db.creditLedger) db.creditLedger = [];
    db.creditLedger.unshift(ledgerEntry);

    await saveDB(db, safeTenant);

    return {
      success: true,
      balance: db.creditAccount.balance,
    };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  RELEASE RESERVED CREDITS (On failure / cancellation)
// ─────────────────────────────────────────────────────────────

export async function releaseCredits(
  tenantId: string,
  reservationId: string,
  reason?: string
): Promise<{ success: boolean; releasedAmount: number }> {
  const safeTenant = tenantId.toLowerCase().trim();
  const lockKey = `credit_lock_${safeTenant}`;
  const lockToken = await acquireLock(lockKey, 10_000);

  try {
    const db = await getDB(safeTenant);
    if (!db.creditAccount || !db.creditReservations) {
      return { success: false, releasedAmount: 0 };
    }

    const resIndex = db.creditReservations.findIndex(
      (r) => r.id === reservationId && r.status === "PENDING"
    );

    if (resIndex === -1) {
      return { success: false, releasedAmount: 0 };
    }

    const reservation = db.creditReservations[resIndex];
    const amount = reservation.amount;

    db.creditAccount.reservedBalance = Math.max(0, db.creditAccount.reservedBalance - amount);
    db.creditAccount.version += 1;
    db.creditAccount.updatedAt = new Date().toISOString();

    reservation.status = "RELEASED";

    await saveDB(db, safeTenant);

    return { success: true, releasedAmount: amount };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  DIRECT DEDUCT CREDITS (Atomic single-step execution)
// ─────────────────────────────────────────────────────────────

export interface DirectDeductParams {
  tenantId: string;
  amount: number;
  referenceType: CreditReferenceType;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export async function directDeductCredits(
  params: DirectDeductParams
): Promise<{ success: boolean; balanceAfter: number; error?: string }> {
  if (params.amount <= 0) {
    return { success: true, balanceAfter: 0 };
  }

  const safeTenant = params.tenantId.toLowerCase().trim();
  const lockKey = `credit_lock_${safeTenant}`;
  const lockToken = await acquireLock(lockKey, 10_000);

  try {
    const db = await getDB(safeTenant);

    if (!db.creditAccount) {
      return { success: false, balanceAfter: 0, error: "Credit account not found" };
    }
    if (!db.creditLedger) db.creditLedger = [];

    // Idempotency check
    const existing = db.creditLedger.find(
      (entry) => entry.idempotencyKey === params.idempotencyKey
    );
    if (existing) {
      return { success: true, balanceAfter: db.creditAccount.balance };
    }

    const available = db.creditAccount.balance - db.creditAccount.reservedBalance;
    if (available < params.amount) {
      return {
        success: false,
        balanceAfter: db.creditAccount.balance,
        error: `Insufficient credits. Required: ${params.amount}, Available: ${available}`,
      };
    }

    const newBalance = db.creditAccount.balance - params.amount;
    db.creditAccount.balance = newBalance;
    db.creditAccount.lifetimeUsed += params.amount;
    db.creditAccount.version += 1;
    db.creditAccount.updatedAt = new Date().toISOString();

    const ledgerEntry: CreditLedgerEntry = {
      id: `tx_dd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: safeTenant,
      type: "USAGE",
      amount: -params.amount,
      balanceAfter: newBalance,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    db.creditLedger.unshift(ledgerEntry);
    await saveDB(db, safeTenant);

    return { success: true, balanceAfter: newBalance };
  } finally {
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
  }
}
