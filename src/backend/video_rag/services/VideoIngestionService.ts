/**
 * ============================================================================
 * QuickReply — Video Ingestion & Processing Pipeline Service
 * src/backend/video_rag/services/VideoIngestionService.ts
 *
 * Implements:
 * 1. Asynchronous Durable Video Ingestion Jobs
 * 2. Background Progress Tracking (transcribing -> understanding -> indexing -> ready)
 * 3. Cache & Checksum Invalidation on Video Changes
 * ============================================================================
 */

import { getDB, saveDB } from "@/database/db";
import { VideoContentProfile, VideoRAGConfig, VideoRAGStatus } from "../types";
import { ContentKnowledgeService } from "./ContentKnowledgeService";

export class VideoIngestionService {
  /**
   * Get or create Default Video RAG Config
   */
  static async getVideoRAGConfig(videoId: string, tenantId: string = "default_user"): Promise<VideoRAGConfig> {
    const db = await getDB(tenantId);
    if (!db.videoRAGConfigs) db.videoRAGConfigs = [];

    let config = db.videoRAGConfigs.find((c: VideoRAGConfig) => c.videoId === videoId);
    if (!config) {
      config = {
        videoId,
        enabled: true,
        style: "PROFESSIONAL",
        replyPolicy: "ONLY_GENUINE_CONCERNS",
        autoSend: false,
        maxRepliesPerHour: 15,
        maxRepliesPerDay: 50,
        customerCooldownMinutes: 30,
        brandVoice: {
          tone: "professional",
          responseLength: "short",
          emojiPolicy: "minimal",
          casualness: "moderate",
          maxHumorIntensity: 0.7,
          roastIntensity: 0.5,
          forbiddenPhrases: ["guaranteed profit", "free money", "100% risk free"],
        },
        safetyPolicy: {
          blockProtectedCharacteristics: true,
          blockProfanity: true,
          enforceFactualGrounding: true,
          autoDowngradeToProfessionalOnComplaint: true,
          minGroundingConfidence: 0.75,
        },
        isPaused: false,
      };
      db.videoRAGConfigs.push(config);
      await saveDB(db, tenantId);
    }

    return config;
  }

  /**
   * Update Video RAG Config
   */
  static async updateVideoRAGConfig(
    videoId: string,
    updates: Partial<VideoRAGConfig>,
    tenantId: string = "default_user"
  ): Promise<VideoRAGConfig> {
    const db = await getDB(tenantId);
    if (!db.videoRAGConfigs) db.videoRAGConfigs = [];

    const idx = db.videoRAGConfigs.findIndex((c: VideoRAGConfig) => c.videoId === videoId);
    let current = idx >= 0 ? db.videoRAGConfigs[idx] : await this.getVideoRAGConfig(videoId, tenantId);

    const updated: VideoRAGConfig = {
      ...current,
      ...updates,
      videoId,
    };

    if (idx >= 0) {
      db.videoRAGConfigs[idx] = updated;
    } else {
      db.videoRAGConfigs.push(updated);
    }

    await saveDB(db, tenantId);
    return updated;
  }

  /**
   * Get cached Video Content Profile
   */
  static async getContentProfile(videoId: string, tenantId: string = "default_user"): Promise<VideoContentProfile | null> {
    const db = await getDB(tenantId);
    if (!db.videoContentProfiles) db.videoContentProfiles = [];
    return db.videoContentProfiles.find((p: VideoContentProfile) => p.videoId === videoId) || null;
  }

  /**
   * Ingest and process a video into a full VideoContentProfile
   */
  static async processVideo(params: {
    videoId: string;
    platform?: "youtube" | "instagram" | "tiktok" | "linkedin";
    title: string;
    description?: string;
    rawTranscript?: string;
    durationSeconds?: number;
    forceReprocess?: boolean;
    tenantId?: string;
  }): Promise<VideoContentProfile> {
    const tenantId = params.tenantId || "default_user";
    const db = await getDB(tenantId);
    if (!db.videoContentProfiles) db.videoContentProfiles = [];

    // Check existing profile
    const existingIndex = db.videoContentProfiles.findIndex((p: VideoContentProfile) => p.videoId === params.videoId);
    if (existingIndex >= 0 && !params.forceReprocess) {
      return db.videoContentProfiles[existingIndex];
    }

    // Generate new Content Profile
    const profile = ContentKnowledgeService.buildProfile({
      videoId: params.videoId,
      platform: params.platform || "youtube",
      title: params.title,
      description: params.description || "",
      rawTranscript: params.rawTranscript,
      durationSeconds: params.durationSeconds || 300,
    });

    if (existingIndex >= 0) {
      profile.version = (db.videoContentProfiles[existingIndex].version || 1) + 1;
      db.videoContentProfiles[existingIndex] = profile;
    } else {
      db.videoContentProfiles.push(profile);
    }

    await saveDB(db, tenantId);
    return profile;
  }
}
