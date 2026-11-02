# QuickReply Production Deployment, DevOps & Infrastructure Runbook

**Document Version:** 3.0  
**Target Environments:** Docker, Kubernetes, AWS ECS, Self-Hosted Linux  
**Framework:** Next.js 16.2.7 (Standalone Output) / Node.js 20+ LTS  
**Classification:** DevOps & Infrastructure Engineering Runbook  
**Last Updated:** 2026-11-01  

---

## 1. Environment Variables Specification

The platform requires the following environment variables. In development and hermetic CI/CD environments, sensible defaults allow the application to start in offline mode with file fallbacks.

| Variable Name | Required | Default / Format | Description |
|---|:---:|---|---|
| `NODE_ENV` | Yes | `production` \| `development` | Node.js runtime environment |
| `PORT` | No | `3000` | HTTP port for Next.js web and API server |
| `TOKEN_ENCRYPTION_KEY` | **Yes** | 64-char hex string (32 bytes) | Master key used for AES-256-GCM Credential Vault |
| `SESSION_SECRET` | **Yes** | 32+ char random string | Secret used for HMAC session cookies |
| `JWT_SECRET` | **Yes** | 32+ char random string | Secret used for signing Bearer auth tokens |
| `MONGODB_URI` | No | `mongodb+srv://...` | MongoDB Atlas connection URI (triggers file fallback if unset) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URI for caching and BullMQ |
| `CANVA_CLIENT_ID` | Optional | `OC-xxxxxxxx` | Canva Connect API OAuth 2.0 Client ID |
| `CANVA_CLIENT_SECRET` | Optional | `canva_sec_...` | Canva Connect API OAuth 2.0 Client Secret |
| `CANVA_REDIRECT_URI` | Optional | `https://app.quickreply.ai/api/integrations/canva/callback` | OAuth redirect URI |
| `GOOGLE_CLIENT_ID` | Optional | `...apps.googleusercontent.com` | Google Workspace OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | `GOCSPX-...` | Google Workspace OAuth Client Secret |
| `SLACK_CLIENT_ID` | Optional | `123456.789012` | Slack App OAuth Client ID |
| `SLACK_CLIENT_SECRET` | Optional | `...` | Slack App OAuth Client Secret |
| `HUBSPOT_CLIENT_ID` | Optional | `...` | HubSpot Developer App Client ID |
| `HUBSPOT_CLIENT_SECRET`| Optional | `...` | HubSpot Developer App Client Secret |
| `OPENAI_API_KEY` | Optional | `sk-...` | Fallback OpenAI API key for AI Planner |
| `ANTHROPIC_API_KEY` | Optional | `sk-ant-...` | Fallback Anthropic API key for AI Planner |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://app.quickreply.ai` | Canonical application URL |

---

## 2. Production Build Commands

QuickReply is configured for Next.js standalone container deployment.

```bash
# 1. Install dependencies strictly from lockfile
npm ci

# 2. Type-check entire codebase
npx tsc --noEmit

# 3. Compile Next.js production bundle
npm run build

# Standalone output artifacts are emitted to:
# .next/standalone/
# .next/static/
# public/
```

---

## 3. Production Docker Deployment

### 3.1 Multi-Stage `Dockerfile`

```dockerfile
# Stage 1: Dependencies Cache
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Source Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Minimal Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-privileged service user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

---

### 3.2 Production `docker-compose.yml`

```yaml
version: "3.8"

services:
  quickreply-app:
    build:
      context: .
      dockerfile: Dockerfile
    image: quickreply-os:latest
    container_name: quickreply_web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TOKEN_ENCRYPTION_KEY=${TOKEN_ENCRYPTION_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - MONGODB_URI=mongodb://mongo:27017/quickreply_prod
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_APP_URL=https://app.quickreply.ai
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health/liveness"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  mongo:
    image: mongo:7.0
    container_name: quickreply_mongo
    restart: always
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: quickreply_redis
    restart: always
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
  redis_data:
```

---

## 4. Database Setup & Index Initialization

Before directing production traffic, execute the database migration script:

```bash
# Initialize MongoDB indexes and default tenant workspace
node scripts/init-db-indexes.mjs
```

This ensures compound indexes are created:
- `{ tenantId: 1, id: 1 }` on `workspaces`
- `{ executionId: 1 }` on `checkpoints`
- `{ workspaceId: 1, sequenceNumber: 1 }` on `audit_logs`
- `{ "oauthMetadata.expiresAt": 1 }` on `credentials`

---

## 5. Health Probes & Monitoring

QuickReply exposes two Kubernetes-standard health check endpoints:

### 5.1 Liveness Probe (`GET /api/health/liveness`)
- Verifies that the Node.js event loop is responsive and HTTP server can accept connections.
- Returns HTTP 200:
  ```json
  { "status": "UP", "timestamp": "2026-11-01T08:00:00Z" }
  ```

### 5.2 Readiness Probe (`GET /api/health/readiness`)
- Performs deep subsystem validation:
  1. MongoDB ping (`db.admin().ping()`).
  2. Redis cache roundtrip (`redis.ping()`).
  3. Credential vault key derivation sanity check.
  4. Crash recovery daemon heartbeat.
- Returns HTTP 200 when ready:
  ```json
  {
    "status": "READY",
    "checks": {
      "database": "CONNECTED",
      "redis": "CONNECTED",
      "vault": "INITIALIZED",
      "recoveryDaemon": "ACTIVE"
    },
    "uptimeSeconds": 1420
  }
  ```
- If any critical subsystem is unavailable, returns HTTP 503, preventing traffic routing by the load balancer.

---

## 6. Disaster Recovery & Rollback Procedures

### 6.1 Database Backup Schedule
- **Automated Snapshots**: Daily continuous backup in MongoDB Atlas with point-in-time recovery (PITR) for 35 days.
- **On-Premise / Local Fallback**: Periodic backup of `src/data/` snapshots using automated rsync or S3 sync.

### 6.2 Zero-Downtime Rollback
If a newly deployed workflow version or application container introduces defects:
1. **Application Rollback**:
   ```bash
   docker service update --image quickreply-os:previous quickreply_web
   ```
2. **Workflow Rollback**: Every workflow maintains immutable version history (`WorkflowVersion`). Calling `POST /api/workflows/[id]/rollback` with `{ targetVersion: n }` instantly reactivates the previous verified AST definition.
