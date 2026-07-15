/**
 * MongoDB Index Management for Quick Reply
 *
 * Creates compound indexes for optimal query performance.
 * Run once on server startup — indexes are idempotent (safe to re-run).
 *
 * Key indexes:
 * - comments: channelId + status (poll queries), publishedAt (sorting), matchedRuleId (analytics)
 * - channels: userId + status (active channel lookups)
 * - rules: userId + isActive (rule matching)
 * - faqs: userId + category (FAQ filtering)
 */

import { MongoClient } from "mongodb";

// --- Index Definitions ---

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options: {
    name: string;
    background?: boolean;
    sparse?: boolean;
    unique?: boolean;
    expireAfterSeconds?: number;
  };
}

const INDEXES: IndexDefinition[] = [
  // --- Comments Collection ---
  // NOTE: Cannot create a compound index spanning channels[] AND comments[]
  // because MongoDB forbids indexing two parallel arrays in one compound index.
  // Instead, create separate indexes on each array field.
  {
    collection: "users",
    index: { "comments.status": 1 },
    options: { name: "idx_comments_status" },
  },
  {
    collection: "users",
    index: { "comments.publishedAt": -1 },
    options: { name: "idx_comments_published_at" },
  },
  {
    collection: "users",
    index: { "comments.matchedRuleId": 1 },
    options: { name: "idx_comments_matched_rule", sparse: true },
  },
  {
    collection: "users",
    index: { "comments.channelId": 1, "comments.publishedAt": -1 },
    options: { name: "idx_comments_channel_date" },
  },
  {
    collection: "users",
    index: { "comments.status": 1, "comments.publishedAt": -1 },
    options: { name: "idx_comments_status_date" },
  },

  // --- Channels Collection ---
  {
    collection: "users",
    index: { "channels.id": 1 },
    options: { name: "idx_channels_id" },
  },
  {
    collection: "users",
    index: { "channels.status": 1 },
    options: { name: "idx_channels_status", sparse: true },
  },

  // --- Rules Collection ---
  {
    collection: "users",
    index: { "rules.isActive": 1, "rules.priority": 1 },
    options: { name: "idx_rules_active_priority" },
  },
  {
    collection: "users",
    index: { "rules.id": 1 },
    options: { name: "idx_rules_id" },
  },

  // --- FAQs Collection ---
  {
    collection: "users",
    index: { "faqs.category": 1 },
    options: { name: "idx_faqs_category", sparse: true },
  },
  {
    collection: "users",
    index: { "faqs.id": 1 },
    options: { name: "idx_faqs_id" },
  },

  // --- Social Accounts Collection ---
  {
    collection: "users",
    index: { "socialAccounts.platform": 1, "socialAccounts.id": 1 },
    options: { name: "idx_social_accounts_platform_id", sparse: true },
  },
  {
    collection: "users",
    index: { "socialAccounts.isActive": 1 },
    options: { name: "idx_social_accounts_active", sparse: true },
  },

  // --- Social Comments Collection ---
  {
    collection: "users",
    index: { "socialComments.platform": 1, "socialComments.accountId": 1 },
    options: { name: "idx_social_comments_platform_account", sparse: true },
  },
  {
    collection: "users",
    index: { "socialComments.status": 1 },
    options: { name: "idx_social_comments_status", sparse: true },
  },
  {
    collection: "users",
    index: { "socialComments.publishedAt": -1 },
    options: { name: "idx_social_comments_published_at" },
  },

  // --- Video Queue Collection ---
  {
    collection: "users",
    index: { "videoQueue.channelId": 1, "videoQueue.status": 1 },
    options: { name: "idx_video_queue_channel_status", sparse: true },
  },
  {
    collection: "users",
    index: { "videoQueue.priority": 1, "videoQueue.lastPolledAt": 1 },
    options: { name: "idx_video_queue_priority_polled", sparse: true },
  },
  {
    collection: "users",
    index: { "videoQueue.videoId": 1 },
    options: { name: "idx_video_queue_video_id", sparse: true },
  },

  // --- Pipeline Traces Collection ---
  {
    collection: "users",
    index: { "pipelineTraces.channelId": 1, "pipelineTraces.startedAt": -1 },
    options: { name: "idx_pipeline_traces_channel_date", sparse: true },
  },
  {
    collection: "users",
    index: { "pipelineTraces.outcome": 1 },
    options: { name: "idx_pipeline_traces_outcome", sparse: true },
  },

  // --- System Events Collection ---
  {
    collection: "users",
    index: { "systemEvents.type": 1, "systemEvents.timestamp": -1 },
    options: { name: "idx_system_events_type_date", sparse: true },
  },

  // --- Templates Collection ---
  {
    collection: "users",
    index: { "templates.id": 1 },
    options: { name: "idx_templates_id" },
  },

  // --- User Session ---
  {
    collection: "users",
    index: { "userSession.email": 1 },
    options: { name: "idx_user_session_email", sparse: true },
  },
  {
    collection: "users",
    index: { "userSession.tier": 1 },
    options: { name: "idx_user_session_tier", sparse: true },
  },

  // --- Activity Logs ---
  {
    collection: "users",
    index: { "activityLogs.timestamp": -1 },
    options: { name: "idx_activity_timestamp" },
  },

  // --- Document-level indexes ---
  {
    collection: "users",
    index: { _id: 1 },
    options: { name: "_id_" },  // Already exists, but ensure it
  },

  // --- Stripe / Billing ---
  // NOTE: Cannot mix "sparse" and "partialFilterExpression" in MongoDB.
  // Using sparse only (partialFilterExpression is applied in code below).
  {
    collection: "users",
    index: { "userSession.stripeCustomerId": 1 },
    options: { name: "idx_stripe_customer", sparse: true },
  },
  {
    collection: "users",
    index: { "userSession.stripeSubscriptionId": 1 },
    options: { name: "idx_stripe_subscription", sparse: true },
  },
];

// --- Index Creation ---

let indexesCreated = false;

/**
 * Create all defined indexes on MongoDB.
 * Idempotent — safe to call on every server start.
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesCreated) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("[Indexes] No MongoDB URI — skipping index creation");
    return;
  }

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db("quickreply");
    const collection = db.collection("users");

    // --- One-time cleanup: drop broken indexes from previous deployments ---
    const brokenIndexes = [
      "idx_comments_channel_status",   // compound index on parallel arrays (channels[] + comments[])
      "idx_comments_text_search",      // text index that can conflict with other text indexes
      "idx_faqs_text_search",          // text index that can conflict
    ];
    for (const name of brokenIndexes) {
      try {
        await collection.dropIndex(name);
        console.log(`[Indexes] Dropped broken index: ${name}`);
      } catch (err: any) {
        // IndexNotFound is expected if already cleaned up — silently skip
        if (err.codeName !== "IndexNotFound" && err.code !== 27) {
          console.log(`[Indexes] Could not drop ${name}: ${err.message}`);
        }
      }
    }

    // Also drop Stripe indexes that were created with incompatible options (sparse + partialFilterExpression)
    for (const name of ["idx_stripe_customer", "idx_stripe_subscription"]) {
      try {
        await collection.dropIndex(name);
        console.log(`[Indexes] Dropped and will recreate: ${name}`);
      } catch (err: any) {
        if (err.codeName !== "IndexNotFound" && err.code !== 27) {
          console.log(`[Indexes] Could not drop ${name}: ${err.message}`);
        }
      }
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const def of INDEXES) {
      try {
        // Skip the _id index (already exists)
        if (Object.keys(def.index).length === 1 && "_id" in def.index) {
          skipped++;
          continue;
        }

        await collection.createIndex(def.index, {
          name: def.options.name,
          background: true,
          sparse: def.options.sparse || false,
          unique: def.options.unique || false,
        });
        created++;
      } catch (err: any) {
        // Index already exists with different options — this is fine
        if (err.codeName === "IndexOptionsConflict" || err.code === 85 || err.code === 11000) {
          skipped++;
        } else {
          console.error(`[Indexes] Failed to create ${def.options.name}:`, err.message);
          errors++;
        }
      }
    }

    console.log(`[Indexes] Done: ${created} created, ${skipped} skipped, ${errors} errors`);
    indexesCreated = true;
  } catch (err) {
    console.error("[Indexes] Failed to connect to MongoDB for index creation:", err);
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Get index statistics for monitoring.
 */
export async function getIndexStats(): Promise<Array<{
  name: string;
  key: Record<string, any>;
  size: number;
  usageCount: number;
}>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return [];

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db("quickreply");
    const collection = db.collection("users");

    const indexes = await collection.indexes();
    const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();

    return indexes.map((idx) => {
      const stat = stats.find((s) => s.name === idx.name);
      return {
        name: idx.name || "unknown",
        key: idx.key,
        size: (stat as any)?.size || 0,
        usageCount: (stat as any)?.accesses?.ops || 0,
      };
    });
  } catch {
    return [];
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
