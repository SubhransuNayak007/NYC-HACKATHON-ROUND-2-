# QuickReply AI Automation Operating System — Production Deployment Guide

**Document Version:** 2.0  
**Target Environments:** Vercel (Edge/Serverless), Render, AWS ECS, Docker Container  

---

## 1. System Requirements & Prerequisites

- **Node.js:** v20.x or v22.x LTS
- **Database:** MongoDB Atlas (v6.0+ with Replica Set for transactions)
- **Cache & Queue:** Redis v7.x (or Upstash Redis with TLS)
- **Reverse Proxy / CDN:** Cloudflare or AWS CloudFront (HSTS, SSL Termination)
- **Secrets Encryption:** 64-hex character `TOKEN_ENCRYPTION_KEY`

---

## 2. Production Build & Startup

### Step 1: Install Dependencies
```bash
npm ci --prefer-offline
```

### Step 2: Verify Strict Type Integrity & Linting
```bash
npm run typecheck
npm run lint
```

### Step 3: Production Build
```bash
npm run build
```

### Step 4: Run Enterprise Release Gates
```bash
npm run release:gate
```

### Step 5: Start Production Server
For Standalone Node.js Cluster with Real-Time WebSockets:
```bash
npm run start:prod
# Or standard Next.js:
npm run start
```

---

## 3. Production Health Probes & Monitoring

QuickReply provides automated synthetic health endpoints:
- **Liveness Probe:** `GET /api/health`
  - Returns `200 OK` with MongoDB pool state, Redis ping, uptime, and system status.
- **Post-Deploy Smoke Test Runner:**
  ```bash
  npm run test:smoke
  ```

---

## 4. Multi-Tenant Queue Worker Configuration

In high-concurrency environments, background workflows run via BullMQ workers:
```bash
# Start background worker daemon
NODE_ENV=production node -r dotenv/config dist/backend/backgroundWorker.js
```
- Set `CONCURRENCY_PER_TENANT=10`
- Set `REDIS_URL=rediss://default:password@host:6379`
- Set `MAX_JOB_RETRIES=3`