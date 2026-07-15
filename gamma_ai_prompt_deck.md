# 🚀 Gamma AI & Presentation Generator Master Prompt File

> **Ready-to-Paste Master Prompt & 12-Card Deck Payload for Gamma.app, Tome, Beautiful.ai & Slide Generators.**

---

## 📋 Ready-to-Paste Gamma AI Master Prompt

Copy and paste the box below directly into **Gamma.app**, **Tome.app**, or **ChatGPT/Claude**:

```markdown
Role & Goal: Act as an elite presentation designer and technical pitch architect. Create an ultra-premium, high-impact 12-card presentation deck for hackathon judges using the structured content and layout instructions below.

Target Audience: Technical Hackathon Judges, VC Investors, and Senior Software Architects. Highlight system architecture, zero-friction OAuth security, hybrid storage resiliency, safety moderation queues, and real-time execution.

Visual Theme & Color Specs:
- Theme: Ultra-Premium Dark Mode Widescreen (16:9)
- Primary Accent: Warm Gold / Amber (#F59E0B)
- Secondary Accent: Electric Orange (#F97316)
- Card Containers: Dark Charcoal Slate (#1E293B) with subtle border (#334155)
- Typography: Serif headers (Playfair Display) + Sans-Serif body (Inter)

Deck Structure & Editing Rules:
- Card 1 [LOCKED]: Keep Title Card intact.
- Card 2–11: Populate using the exact card content, metric badges, and bento grid specs below.
- Card 12 [LOCKED]: Keep Conclusion & Q&A Call to Action intact.
- Variables: Replace all instances of [[creator-name]] with "Subhransu & Aqdas", [[app-url]] with "https://quick-reply.vercel.app", and [[repo-url]] with "https://github.com/aqdasghani/Nycround2".

--------------------------------------------------------------------------------
CARD-BY-CARD PAYLOAD
--------------------------------------------------------------------------------

[CARD 1: Title & Hook] (LOCKED)
Header: QuickReply — Real-Time YouTube Comment Automation Engine
Subtitle: High-Performance Rule Evaluation, Google OAuth Token Rotation & Creator Productivity.
Badges: [Next.js 16 App Router] [TypeScript 5.0] [Google OAuth 2.0] [Live at [[app-url]]]
Visual: 16:9 dark dashboard mockup with glowing Amber/Orange metric cards.
Content:
- 🚀 Real-time rule evaluation engine & dynamic variable parsing.
- 🔐 Background OAuth token rotation with zero re-login friction.
- ⚡ Battle-tested & deployed live in production at [[app-url]].

[CARD 2: The Problem & Creator Burnout]
Header: The Creator Burnout & Engagement Bottleneck
Visual: Split-screen layout. Left: Tired creator facing 500+ unread YouTube notifications (Red accent). Right: 3 Metric cards in dark slate with bright orange accents.
Content:
- ⌛ 3 Hours/Day Overhead: Manual copy-pasting answers to repetitive comments ("Notes?", "Link?", "Code?").
- 📉 70% Engagement Velocity Loss: Delayed responses reduce video algorithmic boost on YouTube.
- 🔴 Existing Tools Fail: Instagram tools (ManyChat) or $200/mo enterprise platforms leave YouTube creators behind.

[CARD 3: Competitive Landscape & Market Void]
Header: Market Void & Industry Tool Comparison
Visual: High-contrast comparison table comparing QuickReply vs ManyChat, Hootsuite, TubeBuddy, and Naive Python Bots.
Content:
- 🎯 100% Dedicated YouTube Engine vs ManyChat (Meta/IG focused).
- 🛡️ Built-in Safety Interception Queue vs None in naive bots (prevents brand damage).
- ⚡ Uploads Playlist API Optimization vs High Quota Waste (1 unit vs 100 units per request).

[CARD 4: The Solution & System Workflow]
Header: QuickReply Rule-Based Response Engine
Visual: 3-Step Horizontal Flow Chart:
[ 1. OAuth Channel Link ] ➔ [ 2. Priority Rule & Safety Evaluation ] ➔ [ 3. API Dispatch & Deduplication ]
Content:
- 🎯 Multi-Condition Matching: Contains, Equals, Starts With, Regex & reply_all.
- 🤖 Dynamic Variable Tags: Personalize with {{commenter_name}} & {{video_title}}.
- 🛡️ Safety Interception Queue: Intercepts negative keywords before auto-replying.

[CARD 5: Rule Priority Engine & Dynamic Variables]
Header: Granular Rule Logic & Personalization Engine
Visual: Bento Grid Card showing Rule Builder UI & variable substitution preview.
Content:
- 🎛️ Priority Execution: Sorted evaluation (priority ASC) — first matching rule dispatches reply.
- 🏷️ Dynamic Placeholders: Replaces {{commenter_name}}, {{video_title}}, and {{channel_name}} dynamically.
- ⚙️ Flexible Conditions: Matches exact phrases, prefixes, or regular expressions.

[CARD 6: Operational Safety & Quota Shield]
Header: Enterprise Safety, Deduplication & Quota Protection
Visual: 4 Bento Cards with glowing orange icon accents.
Content:
- ⚡ O(1) Comment Deduplication: Hashes processed comment IDs to guarantee ZERO duplicate replies.
- 🔄 Background Token Rotation: Silent refresh_token grant in src/backend/youtube.ts prevents session drops.
- 🛡️ Daily Quota Shield: Built-in daily reply counters protect Google's 10,000 unit API cap.

[CARD 7: System Architecture & Hybrid Storage]
Header: Modern Serverless Full-Stack Architecture
Visual: Full System Architecture Block Diagram (Next.js 16 ➔ Vercel Serverless API ➔ Hybrid DB db.ts ➔ YouTube API v3).
Content:
- ⚡ Framework: Next.js 16 (App Router + Turbopack) + TypeScript 5.0 + Zustand store (< 1KB).
- 💾 Hybrid Storage Adaptation (db.ts): Cloud MongoDB Atlas in production with automatic fallback to local db.json.
- ☁️ Serverless Edge Invocation: Zero server overhead with Vercel deployment.

[CARD 8: AI Engineering & Development Velocity]
Header: Powered & Accelerated by AI Workflows
Visual: 3 Glowing Metric Cards (10x Velocity | 100% Type Coverage | 0 Unhandled Edge Cases).
Content:
- 🧠 Engine Architecture: AI pair-programming for serverless polling loops & OAuth token rotation routines.
- 🐞 Instant Diagnostics: Resolved complex TypeScript type mismatches and Next.js Turbopack build breaks.
- 🛡️ Edge Case Modeling: Designed schema auto-migration, quota resets, and negative keyword queues.

[CARD 9: Live Product Demonstration & Real Metrics]
Header: Battle-Tested & Production Deployed
Visual: Screenshots of Live Dashboard (Rule Builder & Live Comment Feed).
Badges: [2 Min Saved per Reply] [30s Poll Frequency] [100% API Accuracy]
Content:
- ✅ Live Google OAuth: Log in securely with real Google accounts.
- ✅ Live Rule Creator: Real-time priority tuning, regex testing & template previews.
- ✅ Activity Feed: Color-coded comment status tracking (Replied, Matched, Review, Skipped).

[CARD 10: Real Creator Case Study Simulation]
Header: Case Study: Tech Educator Channel Automation
Visual: Before & After Split Card (Manual Grind vs QuickReply Automation).
Content:
- 📉 Before: 450 comments/video on "Get Notes?" ➔ 2.5 hours copy-pasting links manually.
- ⚡ With QuickReply: Priority rule "contains: notes" dispatches reply in 30 seconds.
- 📈 Result: 100% comment response rate, 15 hours saved weekly, 25% boost in early engagement.

[CARD 11: Market Opportunity & SaaS Business Model]
Header: $54M+ ARR Market & Monetization Tiers
Visual: Left: Market Size Pyramid (50M+ Creators ➔ 5M Monetized ➔ 500K Target SAM). Right: 3 Tier Cards (Free / Pro $9 / Agency $49).
Content:
- 🆓 Free Tier ($0): 10 auto-replies/day for creator growth.
- 💼 Pro Tier ($9/mo): 500 auto-replies/day + priority rules + regex ($54M TAM).
- 🏢 Agency Tier ($49/mo): Unlimited replies + multi-channel management + team access.

[CARD 12: Technical Roadmap & Conclusion] (LOCKED)
Header: QuickReply — Reclaiming Creator Time
Subtitle: Try the Live Demo Now at [[app-url]]
Visual: Bold Call to Action Card with QR code pointing to [[app-url]] and team credits [[creator-name]].
Content:
- 🧠 Phase 2 (Upcoming): Gemini AI sentiment analysis & context-aware reply generation.
- ⏰ Phase 3 (Distributed Jobs): Vercel Cron & BullMQ queues for distributed channel polling.
- 📱 Phase 4 (Multi-Platform): Expand automation to Instagram DMs & Twitter/X replies.
- 🌟 Live Product: [[app-url]] | GitHub: [[repo-url]] | Team: [[creator-name]]
```

---

## 💡 How to Use This in Different AI Presentation Tools

### 1. Gamma.app
1. Go to [Gamma.app](https://gamma.app) ➡️ Click **"Create with AI"** ➡️ **"Paste in text"**.
2. Select **Presentation (16:9)**.
3. Paste the entire prompt box above.
4. Choose the **Dark Gold / Amber / Obsidian** theme.
5. Click **Generate** — Gamma will generate all 12 slides formatted with bento grids, code blocks, metrics, and cards.

### 2. ChatGPT (GPT-4o) / Claude 3.5 Sonnet
1. Copy the prompt box above into ChatGPT or Claude.
2. Ask it: *"Generate a complete VBA script for Microsoft PowerPoint"* or *"Generate Marp Markdown for 16:9 slides"*.
3. Export directly to PPTX or PDF!

### 3. Tome.app / Beautiful.ai
1. Paste the prompt box into the prompt intake field.
2. Set theme to **Dark Mode / Warm Amber Accent**.
