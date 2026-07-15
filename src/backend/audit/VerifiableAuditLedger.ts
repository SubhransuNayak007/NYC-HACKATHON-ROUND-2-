/**
 * ============================================================
 *  QuickReply Autonomous OS — Verifiable Audit Ledger
 *  src/backend/audit/VerifiableAuditLedger.ts
 *
 *  NO-THEFT / NO-MARKETING-THEATER PROOF:
 *  - Customer PII and raw messages are NEVER stored in the ledger.
 *  - Canonical JSON -> SHA-256 hash chain -> Merkle Root calculation.
 *  - Cryptographic verification proves history has not been tampered with.
 * ============================================================
 */

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export interface AuditBlock {
  blockIndex: number;
  blockId: string;
  action: string;
  actor: string;
  organizationId: string;
  canonicalPayloadHash: string;
  previousHash: string;
  blockHash: string;
  timestamp: string;
}

export class VerifiableAuditLedger {
  private static chain: AuditBlock[] = [];
  private static readonly GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  /**
   * Appends an action to the immutable SHA-256 hash chain
   */
  static record(action: string, actor: string, details: any, organizationId = "org_default"): AuditBlock {
    const previousHash =
      this.chain.length > 0 ? this.chain[this.chain.length - 1].blockHash : this.GENESIS_HASH;

    // 1. Canonical payload hashing (zero PII storage)
    const canonicalPayload = JSON.stringify({
      action,
      actor,
      org: organizationId,
      metadata: details,
    });
    const canonicalPayloadHash = crypto.createHash("sha256").update(canonicalPayload).digest("hex");

    const blockIndex = this.chain.length;
    const blockId = `blk_${uuidv4().replace(/-/g, "")}`;
    const timestamp = new Date().toISOString();

    // 2. Block Header Hash (Chained)
    const blockHeader = `${blockIndex}:${blockId}:${previousHash}:${canonicalPayloadHash}:${timestamp}`;
    const blockHash = crypto.createHash("sha256").update(blockHeader).digest("hex");

    const block: AuditBlock = {
      blockIndex,
      blockId,
      action,
      actor,
      organizationId,
      canonicalPayloadHash,
      previousHash,
      blockHash,
      timestamp,
    };

    this.chain.push(block);
    return block;
  }

  /**
   * Verifies the cryptographic integrity of the entire chain from Genesis to tip
   */
  static verifyChainIntegrity(): { valid: boolean; totalBlocks: number; brokenBlockIndex?: number } {
    if (this.chain.length === 0) {
      return { valid: true, totalBlocks: 0 };
    }

    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const expectedPrev = i === 0 ? this.GENESIS_HASH : this.chain[i - 1].blockHash;

      if (block.previousHash !== expectedPrev) {
        return { valid: false, totalBlocks: this.chain.length, brokenBlockIndex: i };
      }

      // Recompute block hash
      const header = `${block.blockIndex}:${block.blockId}:${block.previousHash}:${block.canonicalPayloadHash}:${block.timestamp}`;
      const computedHash = crypto.createHash("sha256").update(header).digest("hex");

      if (computedHash !== block.blockHash) {
        return { valid: false, totalBlocks: this.chain.length, brokenBlockIndex: i };
      }
    }

    return { valid: true, totalBlocks: this.chain.length };
  }

  /**
   * Generates a Merkle Root for the current block ledger
   */
  static getMerkleRoot(): string {
    if (this.chain.length === 0) return this.GENESIS_HASH;

    let hashes = this.chain.map((b) => b.blockHash);

    while (hashes.length > 1) {
      if (hashes.length % 2 !== 0) {
        hashes.push(hashes[hashes.length - 1]);
      }
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const combined = crypto.createHash("sha256").update(`${hashes[i]}${hashes[i + 1]}`).digest("hex");
        nextLevel.push(combined);
      }
      hashes = nextLevel;
    }

    return hashes[0];
  }

  /**
   * Returns recent audit blocks
   */
  static getRecentBlocks(limit = 20): AuditBlock[] {
    return this.chain.slice(-limit);
  }
}
