# 24/7 Background Auto-Reply — Setup Guide

## How It Works

Quick Reply runs a **30-second comment polling loop** that checks for new
YouTube comments, matches them against your FAQ knowledge base, and auto-replies
to relevant ones — **24/7, no browser tab needed**.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: In-Process Scheduler (30s interval)       │
│  Runs automatically when the Next.js server starts. │
│  Used for: standalone servers, VPS, local dev.      │
│  File: src/backend/scheduler.ts                     │
├─────────────────────────────────────────────────────┤
│  Layer 2: External Cron → /api/cron/poll (30s)      │
│  Calls the same pollAndReply() function via HTTP.   │
│  Used for: Netlify, Vercel, any serverless host.    │
│  File: src/app/api/cron/poll/route.ts               │
├─────────────────────────────────────────────────────┤
│  Video Discovery: runs every 30 minutes             │
│  Finds new videos from connected channels and adds  │
│  them to the polling queue automatically.           │
│  File: src/backend/video_discovery.ts               │
├─────────────────────────────────────────────────────┤
│  Health Heartbeat: every 60 seconds                 │
│  Proves the system is alive to the dashboard.       │
│  File: src/backend/cron_manager.ts                  │
└─────────────────────────────────────────────────────┘
```

### Reply Strategy: Knowledge Base Only

The system **only replies to comments that match your FAQ knowledge base**.
If a comment doesn't match any FAQ, it's skipped — no generic replies are sent.

1. Intent classification filters to **questions only** (skips spam, praise, etc.)
2. Multi-query RAG searches your FAQs with expanded query variations
3. Re-ranking precision boost for uncertain matches
4. If confidence ≥ 0.40: reply directly from FAQ answer
5. If confidence 0.25–0.40: generate FAQ-grounded reply via Claude
6. If confidence < 0.25: **skip** (no KB match)

---

## Setting Up 30-Second Cron

### Option A: cron-job.org (Recommended — Free, Supports 30s)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Create a new cron job:
   - **URL:** `https://your-domain.com/api/cron/poll`
   - **Schedule:** Custom — Every 30 seconds
     - Select "Custom" → set seconds to `*/30`
   - **Request method:** GET
3. Set `CRON_SECRET` in your environment variables (optional — endpoint works without it)

> **Note:** cron-job.org is the only free service that supports 30-second intervals.
> GitHub Actions minimum is 5 minutes. UptimeRobot minimum is 1 minute.

### Option B: GitHub Actions (Free, 5-minute minimum)

GitHub Actions only supports cron down to 1-minute resolution, and the minimum
schedule is 5 minutes. This is less ideal but still provides 24/7 coverage:

Create `.github/workflows/cron-poll.yml`:
```yaml
name: Background Comment Poll
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes (GitHub minimum)
  workflow_dispatch:

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger 24/7 Poll
        run: |
          curl -s "https://your-domain.com/api/cron/poll?token=${{ secrets.CRON_SECRET }}"
```

### Option C: UptimeRobot / BetterStack (Free, 1-minute minimum)

Use an uptime monitor as a cron trigger:
- **URL:** `https://your-domain.com/api/cron/poll`
- **Monitoring interval:** 1 minute
- The endpoint does real work (polling + discovery) on every call

### Option D: In-Process Only (Standalone Server / VPS)

If you're running on a VPS, dedicated server, or local machine — **no external
cron needed**. The in-process scheduler (`scheduler.ts`) starts automatically
on server boot and runs every 30 seconds.

```
npm run dev   # or npm start for production
# The 30-second loop starts automatically
```

---

## Environment Variables

```env
# Required for cron authentication (optional — endpoint works without it)
CRON_SECRET="generate-with: openssl rand -hex 32"

# MongoDB (required for production)
MONGODB_URI="mongodb+srv://..."

# Google OAuth (required for YouTube API access)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Token encryption (required — generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY="64-hex-char-key"
```

## Dashboard

Open `/dashboard/status` to see:
- **Green/Red health indicator** — Is the system alive?
- **YouTube API quota bar** — How much quota remains today?
- **Video queue stats** — How many videos are being monitored?
- **Today's replies** — How many comments were auto-replied to?
- **Recent events** — Live feed of system activity

---

## FAQ Template Variables

Use these in your FAQ answers for personalization:
- `{{commenter_name}}` — The YouTube commenter's display name
- `{{channel_name}}` — Your YouTube channel name
- `{{reply_date}}` — Today's date
- `{{question}}` — The matched FAQ question text

## How the RAG System Works

1. **Upload FAQs** via Dashboard → FAQ Knowledge Base
2. **Every 30 seconds**, the system fetches new YouTube comments
3. **Intent classification** filters to questions only
4. **Multi-query expansion** generates 3 search variations per comment
5. **Hybrid RRF search** matches against your FAQ vector index (dense + sparse)
6. **Re-ranking** precision boost via Claude Haiku for uncertain matches
7. If confidence ≥ 0.40 → **reply from FAQ answer directly**
8. If confidence 0.25–0.40 → **generate FAQ-grounded reply via Claude**
9. If confidence < 0.25 → **skip** (no knowledge base match)
