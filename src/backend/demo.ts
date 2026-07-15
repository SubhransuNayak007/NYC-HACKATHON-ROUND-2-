/**
 * Demo Mode for QuickReply
 *
 * Seeds a realistic workspace with channels, rules, FAQs, templates,
 * and a video queue so the demo never depends on a live YouTube connection.
 * Also provides synthetic comment injection through the real engine pipeline.
 */

import { getDB, saveDB, type DBData, type Channel, type Rule, type Template, type VideoQueueEntry, type FAQEntry } from "@/database/db";
import { processIncomingComment, type IncomingComment, type EngineContext } from "./engine";

const DEMO_EMAIL = "demo@quickreply.io";
const DEMO_CHANNEL_ID = "demo-ch-youtube-001";
const DEMO_VIDEO_ID = "demo-vid-001";

const DEMO_TEMPLATES: Template[] = [
  { id: "tpl-demo-1", name: "Thanks Response", emoji: "🙏", body: "Thanks for watching {{commenter_name}}! Glad you enjoyed it 🎉", variants: [], usageCount: 0, lastEdited: new Date().toISOString() },
  { id: "tpl-demo-2", name: "Question Answer", emoji: "💬", body: "Great question {{commenter_name}}! The answer is in the video description 👇", variants: [], usageCount: 0, lastEdited: new Date().toISOString() },
  { id: "tpl-demo-3", name: "Code Request", emoji: "💻", body: "Hey {{commenter_name}}! The code is on GitHub — link in the description!", variants: [], usageCount: 0, lastEdited: new Date().toISOString() },
];

const DEMO_RULES: Rule[] = [
  { id: "rule-demo-1", name: "Notes Request", isActive: true, priority: 1, colorLabel: "green", conditions: [{ id: "c1", type: "contains", value: "notes" }], operator: "OR", filters: { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" }, templateId: "tpl-demo-1", delaySeconds: 0, dailyLimit: 50, customVariable1: "", customVariable2: "", customVariable3: "", approvalMode: "autonomous" },
  { id: "rule-demo-2", name: "Code Request", isActive: true, priority: 2, colorLabel: "blue", conditions: [{ id: "c2", type: "contains", value: "code" }], operator: "OR", filters: { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" }, templateId: "tpl-demo-3", delaySeconds: 0, dailyLimit: 50, customVariable1: "", customVariable2: "", customVariable3: "", approvalMode: "autonomous" },
  { id: "rule-demo-3", name: "All Questions", isActive: true, priority: 3, colorLabel: "yellow", conditions: [{ id: "c3", type: "reply_all", value: "" }], operator: "OR", filters: { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" }, templateId: "tpl-demo-2", delaySeconds: 0, dailyLimit: 20, customVariable1: "", customVariable2: "", customVariable3: "", approvalMode: "review" },
];

const DEMO_FAQS: FAQEntry[] = [
  { id: "faq-1", question: "What is this project?", answer: "QuickReply is an AI-powered YouTube comment automation platform that replies to your viewers in real-time.", keywords: ["what", "project", "about", "quickreply"], category: "general", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "faq-2", question: "How much does it cost?", answer: "QuickReply has a free Starter tier with 100 replies/month. Pro is $29/month with unlimited replies and AI features.", keywords: ["price", "cost", "how much", "plan", "free"], category: "pricing", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "faq-3", question: "How does the AI work?", answer: "We use a RAG pipeline with neural embeddings to match comments to your knowledge base, then generate contextual replies via Claude.", keywords: ["ai", "how", "work", "rag", "reply"], category: "technical", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "faq-4", question: "Is my data safe?", answer: "Absolutely! We use official Google OAuth — we never see your password. All tokens are encrypted with AES-256-GCM at rest.", keywords: ["safe", "security", "password", "data", "encrypt"], category: "security", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "faq-5", question: "Which platforms are supported?", answer: "Currently YouTube is fully live. Instagram, LinkedIn, Twitter/X, and WhatsApp integrations are on the roadmap.", keywords: ["platform", "support", "youtube", "instagram", "twitter"], category: "general", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

/** Seed a complete demo workspace for the current user email, or the default demo email. */
export async function seedDemoWorkspace(email?: string): Promise<{ seeded: boolean; email: string }> {
  const targetEmail = email || DEMO_EMAIL;
  const db = await getDB(targetEmail);

  // Don't re-seed if already has demo rules
  if (db.rules.length > 0) {
    return { seeded: false, email: targetEmail };
  }

  // Add demo channel
  db.channels.push({
    id: DEMO_CHANNEL_ID,
    name: "QuickReply Demo",
    handle: "@quickreplydemo",
    avatar: "",
    status: "active",
    subscribers: "1,240",
    platform: "youtube",
    autoDiscoverVideos: true,
  });

  // Add templates, rules, FAQs
  db.templates.push(...DEMO_TEMPLATES);
  db.rules.push(...DEMO_RULES);
  db.faqs.push(...DEMO_FAQS);

  // Add demo video to queue
  if (!db.videoQueue) db.videoQueue = [];
  db.videoQueue.push({
    id: "vq-demo-1",
    channelId: DEMO_CHANNEL_ID,
    videoId: DEMO_VIDEO_ID,
    title: "Building an AI Auto-Reply Engine in 8 Hours",
    publishedAt: new Date().toISOString(),
    discoveredAt: new Date().toISOString(),
    lastPolledAt: null,
    status: "active",
    pollCount: 0,
    commentCount: 0,
    repliedCount: 0,
    priority: 1,
  });

  // Set workspace settings for demo
  db.workspace.settings.confidenceGate = 0.4;
  db.workspace.settings.goldenHourEnabled = true;

  await saveDB(db, targetEmail);
  console.log(`[Demo] Seeded workspace for ${targetEmail}`);
  return { seeded: true, email: targetEmail };
}

const DEMO_COMMENT_POOL: Array<{ author: string; text: string; authorAvatar: string }> = [
  { author: "alex_dev", text: "Can you share the code for this?", authorAvatar: "" },
  { author: "jenny_t", text: "This is amazing! Thanks for the notes 🙏", authorAvatar: "" },
  { author: "code_wiz", text: "How does the keyword matching work?", authorAvatar: "" },
  { author: "sarah_c", text: "Love this! Keep creating content like this", authorAvatar: "" },
  { author: "mike_r", text: "Is this project free to use?", authorAvatar: "" },
  { author: "priya_k", text: "What tech stack are you using?", authorAvatar: "" },
  { author: "tom_b", text: "This helped me so much, thank you!", authorAvatar: "" },
  { author: "lisa_m", text: "Where can I find the GitHub repo?", authorAvatar: "" },
  { author: "dan_w", text: "Not working for me, getting an error", authorAvatar: "" },
  { author: "emma_s", text: "Do you have notes for this video?", authorAvatar: "" },
];

let demoCommentIndex = 0;

/** Inject synthetic comments through the real engine pipeline (B9). */
export async function injectDemoComments(count: number = 3): Promise<{ injected: number; results: Array<{ author: string; outcome: string }> }> {
  await seedDemoWorkspace(DEMO_EMAIL);
  const db = await getDB(DEMO_EMAIL);

  const faqs = db.faqs || [];
  const activeUser = db.userSession || { email: DEMO_EMAIL, name: "Demo", username: "demo", tier: "free" as const, repliesToday: 0, lastResetDate: new Date().toISOString().split("T")[0] };
  const maxDailyLimit = 500;
  const processedCommentIds = new Set(db.comments.map(c => c.id));
  const channel = db.channels.find(c => c.id === DEMO_CHANNEL_ID);

  const ctx: EngineContext = { db, activeUser, maxDailyLimit, processedCommentIds, faqs };

  const results: Array<{ author: string; outcome: string }> = [];

  for (let i = 0; i < count; i++) {
    const poolItem = DEMO_COMMENT_POOL[demoCommentIndex % DEMO_COMMENT_POOL.length];
    demoCommentIndex++;
    const commentId = `demo-comment-${Date.now()}-${i}`;

    const input: IncomingComment = {
      commentId,
      author: poolItem.author,
      authorAvatar: poolItem.authorAvatar,
      text: poolItem.text,
      publishedAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000).toISOString(),
      videoId: DEMO_VIDEO_ID,
      videoTitle: "Building an AI Auto-Reply Engine in 8 Hours",
      videoThumbnail: "",
      channelId: DEMO_CHANNEL_ID,
      channelName: channel?.name || "QuickReply Demo",
      isDemo: true,
    };

    try {
      const result = await processIncomingComment(input, ctx);
      results.push({ author: poolItem.author, outcome: result.trace.outcome });
    } catch (err) {
      console.error("[Demo] Error injecting comment:", err);
      results.push({ author: poolItem.author, outcome: "error" });
    }
  }

  // Update video entry
  const videoEntry = (db.videoQueue || []).find(v => v.videoId === DEMO_VIDEO_ID);
  if (videoEntry) {
    videoEntry.pollCount++;
    videoEntry.lastPolledAt = new Date().toISOString();
  }

  await saveDB(db, DEMO_EMAIL);
  return { injected: results.length, results };
}
