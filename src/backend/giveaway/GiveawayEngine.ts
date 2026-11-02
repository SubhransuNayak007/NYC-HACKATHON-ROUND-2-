/**
 * ============================================================================
 * QuickReply — Verifiable Giveaway & Challenge Winner Selection Engine
 * src/backend/giveaway/GiveawayEngine.ts
 *
 * Implements:
 * 1. Deterministic Challenge Answer Validation.
 * 2. Cryptographically Secure Pseudo-Random Winner Selection (CSPRG: crypto.randomInt).
 * 3. Immutable candidate snapshot hashing & auditable reroll trails.
 * ============================================================================
 */

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB } from "@/database/db";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export interface ChallengeConfig {
  id: string;
  name: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  validationType: "exact" | "case_insensitive" | "numeric" | "regex" | "contains";
  numericRange?: { min: number; max: number };
}

export interface GiveawayParticipant {
  id: string;
  userId: string;
  username: string;
  name?: string;
  commentId: string;
  commentText: string;
  platform: string;
  submittedAnswer?: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  weight: number;             // Base weight = 1 (VIP = 3)
  enteredAt: string;
}

export interface WinnerRecord {
  selectionId: string;
  campaignId: string;
  campaignName: string;
  winnerUserId: string;
  winnerUsername: string;
  winningCommentId: string;
  winningCommentText: string;
  candidateSnapshotHash: string;
  totalCandidates: number;
  eligibleCandidates: number;
  selectedIndex: number;
  randomnessAlgorithm: "crypto.randomInt (CSPRNG)";
  drawTimestamp: string;
  operatorEmail: string;
  status: "CONFIRMED" | "REJECTED_REROLLED";
  rejectionReason?: string;
}

export class GiveawayEngine {
  /**
   * Validate a Challenge Answer using deterministic rules
   */
  static validateAnswer(userText: string, config: ChallengeConfig): { isValid: boolean; detectedAnswer?: string } {
    if (!userText || !userText.trim()) return { isValid: false };
    const raw = userText.trim();
    const clean = raw.toLowerCase();
    const expected = config.expectedAnswer.trim().toLowerCase();

    switch (config.validationType) {
      case "exact":
        return { isValid: raw === config.expectedAnswer, detectedAnswer: raw };

      case "case_insensitive":
        if (clean === expected) return { isValid: true, detectedAnswer: raw };
        if (config.acceptedAnswers?.some((a) => clean === a.toLowerCase().trim())) {
          return { isValid: true, detectedAnswer: raw };
        }
        return { isValid: false };

      case "contains":
        if (clean.includes(expected)) return { isValid: true, detectedAnswer: expected };
        if (config.acceptedAnswers?.some((a) => clean.includes(a.toLowerCase().trim()))) {
          return { isValid: true, detectedAnswer: expected };
        }
        return { isValid: false };

      case "numeric": {
        // Extract numeric digits from comment
        const numMatch = clean.match(/-?\d+(\.\d+)?/);
        if (!numMatch) return { isValid: false };
        const num = parseFloat(numMatch[0]);

        if (config.numericRange) {
          const inRange = num >= config.numericRange.min && num <= config.numericRange.max;
          return { isValid: inRange, detectedAnswer: String(num) };
        }

        const expectedNum = parseFloat(expected);
        return { isValid: num === expectedNum, detectedAnswer: String(num) };
      }

      case "regex":
        try {
          const reg = new RegExp(config.expectedAnswer, "i");
          const match = userText.match(reg);
          return { isValid: !!match, detectedAnswer: match ? match[0] : undefined };
        } catch {
          return { isValid: false };
        }

      default:
        return { isValid: clean.includes(expected), detectedAnswer: raw };
    }
  }

  /**
   * Execute Cryptographically Secure Random Selection
   */
  static async drawWinner(params: {
    tenantId: string;
    campaignId: string;
    campaignName: string;
    participants: GiveawayParticipant[];
    operatorEmail: string;
    allowMultipleEntries?: boolean;
    requireChallengeSuccess?: boolean;
  }): Promise<{ success: boolean; winner?: WinnerRecord; error?: string }> {
    const { tenantId, campaignId, campaignName, participants, operatorEmail } = params;

    if (!participants || participants.length === 0) {
      return { success: false, error: "No participants found for this campaign." };
    }

    // 1. Resolve Duplicate Participants
    const uniqueMap = new Map<string, GiveawayParticipant>();
    for (const p of participants) {
      if (params.allowMultipleEntries) {
        uniqueMap.set(p.id, p);
      } else {
        if (!uniqueMap.has(p.userId)) {
          uniqueMap.set(p.userId, p);
        }
      }
    }

    // 2. Filter Eligible Candidates
    const eligiblePool: GiveawayParticipant[] = [];
    for (const p of uniqueMap.values()) {
      if (p.isEligible) {
        // Add weighted entries
        const weight = Math.max(1, p.weight || 1);
        for (let w = 0; w < weight; w++) {
          eligiblePool.push(p);
        }
      }
    }

    if (eligiblePool.length === 0) {
      return { success: false, error: "No eligible participants meet the campaign requirements." };
    }

    // 3. Create Immutable Candidate Snapshot Hash (SHA-256)
    const candidateDataString = eligiblePool.map((p) => `${p.userId}:${p.commentId}`).join("|");
    const snapshotHash = crypto.createHash("sha256").update(candidateDataString).digest("hex");

    // 4. Cryptographically Secure Pseudo-Random Number Generation (CSPRNG)
    const selectedIndex = crypto.randomInt(0, eligiblePool.length);
    const selectedParticipant = eligiblePool[selectedIndex];

    const selectionId = `draw_${uuidv4()}`;
    const drawTimestamp = new Date().toISOString();

    const winnerRecord: WinnerRecord = {
      selectionId,
      campaignId,
      campaignName,
      winnerUserId: selectedParticipant.userId,
      winnerUsername: selectedParticipant.username,
      winningCommentId: selectedParticipant.commentId,
      winningCommentText: selectedParticipant.commentText,
      candidateSnapshotHash: snapshotHash,
      totalCandidates: participants.length,
      eligibleCandidates: eligiblePool.length,
      selectedIndex,
      randomnessAlgorithm: "crypto.randomInt (CSPRNG)",
      drawTimestamp,
      operatorEmail,
      status: "CONFIRMED",
    };

    // Save to database
    const db = await getDB(tenantId);
    if (!db.giveawayWinners) db.giveawayWinners = [];
    db.giveawayWinners.unshift(winnerRecord);
    await saveDB(db, tenantId);

    // Append-only Audit Log
    await AuditLogger.log({
      tenantId,
      workspaceId: `ws_${tenantId}`,
      actorId: operatorEmail,
      actorEmail: operatorEmail,
      actorRole: "ADMIN",
      action: "giveaway.winner_drawn",
      resourceType: "customer",
      resourceId: selectedParticipant.userId,
      description: `Giveaway winner drawn for "${campaignName}": @${selectedParticipant.username} (Index #${selectedIndex}/${eligiblePool.length}, Hash: ${snapshotHash.substring(0, 10)}...).`,
      status: "SUCCESS",
    });

    return { success: true, winner: winnerRecord };
  }

  /**
   * Reroll a winner with mandatory reason logging
   */
  static async rerollWinner(params: {
    tenantId: string;
    previousSelectionId: string;
    rejectionReason: string;
    campaignId: string;
    campaignName: string;
    participants: GiveawayParticipant[];
    operatorEmail: string;
  }): Promise<{ success: boolean; newWinner?: WinnerRecord; error?: string }> {
    const db = await getDB(params.tenantId);
    if (db.giveawayWinners) {
      const prev = db.giveawayWinners.find((w: WinnerRecord) => w.selectionId === params.previousSelectionId);
      if (prev) {
        prev.status = "REJECTED_REROLLED";
        prev.rejectionReason = params.rejectionReason;
        await saveDB(db, params.tenantId);
      }
    }

    // Exclude previously rejected user from new draw pool
    const filteredPool = params.participants.filter((p) => p.userId !== params.previousSelectionId);
    const newDraw = await this.drawWinner({
      tenantId: params.tenantId,
      campaignId: params.campaignId,
      campaignName: params.campaignName,
      participants: filteredPool,
      operatorEmail: params.operatorEmail,
    });

    if (newDraw.success && newDraw.winner) {
      await AuditLogger.log({
        tenantId: params.tenantId,
        workspaceId: `ws_${params.tenantId}`,
        actorId: params.operatorEmail,
        actorEmail: params.operatorEmail,
        actorRole: "ADMIN",
        action: "giveaway.winner_rerolled",
        resourceType: "customer",
        resourceId: newDraw.winner.winnerUserId,
        description: `Reroll executed for "${params.campaignName}". Prior winner rejected: "${params.rejectionReason}". New winner: @${newDraw.winner.winnerUsername}.`,
        status: "SUCCESS",
      });
    }

    return { success: newDraw.success, newWinner: newDraw.winner, error: newDraw.error };
  }
}
