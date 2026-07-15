# QuickReply Production Deployment Guide (Vercel + Render)

This project is built and optimized for a zero-error dual deployment:
- **Frontend / Edge Layer on Vercel**: Blazing-fast global CDN edge delivery for Next.js landing pages, marketing routes, and dashboard UI.
- **Backend / Real-time Layer on Render**: 24/7 persistent Node.js server (`server.js`) running Socket.io WebSockets, WhatsApp Baileys connections, background Cron engines, and YouTube/Instagram worker pipelines.

---

## Part 1: Deploying the Frontend to Vercel

### Option A: Using Vercel CLI (1-Command Instant Deploy)
Open your terminal in `BACKEND/Nycround2-main` and run:
```bash
# Link and deploy directly to production
npx vercel --prod
```

### Option B: Deploying via GitHub & Vercel Dashboard
1. Push your repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com/new) and click **"Add New Project"**.
3. Import your GitHub repository.
4. **Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `BACKEND/Nycround2-main` (or `./` if deployed from the subfolder root)
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. **Environment Variables on Vercel** (Add under Settings &rarr; Environment Variables):
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your live Vercel domain |
   | `TOKEN_ENCRYPTION_KEY` | *(64-hex char string)* | 32-byte AES encryption key |
   | `SESSION_SECRET` | *(Random 32-char string)* | Session signing secret |
   | `GOOGLE_CLIENT_ID` | `479602286627-...` | Google OAuth Client ID |
   | `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth Secret |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | (Optional) Anthropic Claude API Key |
6. Click **Deploy**.

---

## Part 2: Deploying the Backend to Render

Render is used for the **24/7 background worker server** (`node server.js`), which maintains persistent WebSockets for live WhatsApp QR pairing and background cron polling.

### Option A: Using Render Blueprint (`render.yaml`)
1. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
2. Connect your GitHub repository.
3. Render will automatically detect [`render.yaml`](./render.yaml) and configure the web service with:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/api/system/status`

### Option B: Manual Web Service Setup on Render
1. In the Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `quickreply-backend`
   - **Region**: Singapore (`singapore`) or Frankfurt / Oregon
   - **Branch**: `main`
   - **Root Directory**: `BACKEND/Nycround2-main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Plan**: `Starter` (recommended for persistent WebSocket connections)
4. **Environment Variables on Render**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `NEXT_PUBLIC_APP_URL`: `https://your-app.vercel.app` (your Vercel frontend URL)
   - `TOKEN_ENCRYPTION_KEY`: *(same encryption key as Vercel)*
   - `SESSION_SECRET`: *(same session secret as Vercel)*
   - `GOOGLE_CLIENT_ID`: *(your Google Client ID)*
   - `GOOGLE_CLIENT_SECRET`: *(your Google Client Secret)*
   - `WHATSAPP_SESSION_STORAGE_PATH`: `.whatsapp_sessions`
   - `MONGODB_URI`: *(Optional MongoDB Atlas URI for multi-instance persistent database)*
   - `REDIS_URL`: *(Optional Render Redis for BullMQ queue processing)*

5. **(Optional) Add a Persistent Disk on Render**:
   - If using local file-based WhatsApp QR sessions without MongoDB, add a Persistent Disk:
     - **Name**: `whatsapp-sessions`
     - **Mount Path**: `/opt/render/project/src/BACKEND/Nycround2-main/.whatsapp_sessions`
     - **Size**: `1 GB`

---

## Part 3: Updating OAuth Redirect URIs

Once your Vercel and Render URLs are live, add them to your developer consoles:

### Google Cloud Console (YouTube & Google Sign-In)
Go to [Google Cloud Console](https://console.cloud.google.com/) &rarr; **APIs & Services** &rarr; **Credentials**:
- **Authorized JavaScript Origins**:
  - `https://your-app.vercel.app`
  - `https://quickreply-backend.onrender.com`
- **Authorized Redirect URIs**:
  - `https://your-app.vercel.app/api/auth/callback/google`
  - `https://quickreply-backend.onrender.com/api/auth/callback/google`

### Meta Developer Portal (Instagram & WhatsApp Webhooks)
- **OAuth Redirect URI**: `https://your-app.vercel.app/api/auth/callback/instagram`
- **Webhook Callback URL**: `https://quickreply-backend.onrender.com/api/webhooks/whatsapp` (or Vercel URL)
- **Verify Token**: *(Value from `WHATSAPP_VERIFY_TOKEN`)*

---

## Local Production Verification Test
Before pushing, you can test the production build locally:
```bash
npm run build
npm run start
```
`✓ Next.js production server running on http://localhost:3000`
