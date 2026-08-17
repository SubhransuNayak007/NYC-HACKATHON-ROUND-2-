# 🚀 Render Deployment Guide — QuickReply AI Backend

> **Complete step-by-step guide to deploy the QuickReply AI persistent Node.js server, Socket.io WebSockets, and 24/7 background automation engines on Render.**

---

## 🎯 Why Deploy Backend on Render?

| Capability | Vercel (Frontend) | Render (Backend Server) |
| :--- | :--- | :--- |
| **Main Utility** | Edge Pages & Static Assets (`quick-reply-ai-seven.vercel.app`) | Persistent Long-Running Node.js 24 Process |
| **WhatsApp Web (Baileys)** | ❌ Times out after 10–15s (Serverless limit) | ✅ **24/7 Persistent WebSocket & QR pairing** |
| **Socket.io Live Feed** | ❌ Ephemeral, no bidirectional sockets | ✅ **Continuous Real-Time Push Stream** |
| **Background Cron Loops** | ⚠️ Hobby plan limited to 1 execution/day | ✅ **30-second continuous comment poll loop** |

---

## 🛠️ Step-by-Step Deployment on Render

### Step 1: Sign in to Render
1. Open **[dashboard.render.com](https://dashboard.render.com/)**.
2. Sign in with your GitHub account: **`SubhransuNayak007`**.

---

### Step 2: Deploy via Blueprint (Fastest — 1 Click)

1. Navigate to: **[dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)**
2. Click **New Blueprint Instance**.
3. Select your repository: **`SubhransuNayak007/NYC-HACKATHON-ROUND-2-`**.
4. Branch: **`main`**.
5. Render will automatically read [`render.yaml`](./render.yaml) and configure the build command, start command, and health checks!

---

### Step 3: Or Deploy Manually as a "Web Service"

If you prefer setting it up manually without blueprints:
1. On Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select **`SubhransuNayak007/NYC-HACKATHON-ROUND-2-`**.
3. Configure the following fields:

| Field | Value |
| :--- | :--- |
| **Name** | `quickreply-backend` (or `quick-reply-ai`) |
| **Region** | Oregon (US West) or Frankfurt (EU Central) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free or Starter ($7/mo) |

---

### Step 4: Add Environment Variables on Render

In the **Environment** tab on Render, add the following variables:

| Variable Name | Recommended Value / Description | Required? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | **Yes** |
| `PORT` | `10000` *(Render sets this automatically)* | Auto |
| `NEXT_PUBLIC_APP_URL` | `https://quick-reply-ai-seven.vercel.app` | **Yes** |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/quickreply?retryWrites=true&w=majority` | **Yes** |
| `SESSION_SECRET` | `quickreply_production_session_secret_key_2026_safe_default` | **Yes** |
| `JWT_SECRET` | `quickreply_production_jwt_secret_key_2026_super_secure_default` | **Yes** |
| `TOKEN_ENCRYPTION_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | **Yes** |
| `CRON_SECRET` | `quickreply_cron_secret_key_2026` | **Yes** |
| `GEMINI_API_KEY` | *(Your Google Gemini API Key)* | **Yes** |
| `GOOGLE_CLIENT_ID` | `479602286627-ovjbqmbnq52633f0oe7k5loupkjdk36q.apps.googleusercontent.com` | **Yes** |
| `GOOGLE_CLIENT_SECRET` | *(Your Google OAuth client secret)* | **Yes** |
| `WHATSAPP_PHONE_NUMBER_ID` | *(Optional - for Cloud WhatsApp)* | Optional |
| `WHATSAPP_ACCESS_TOKEN` | *(Optional - for Cloud WhatsApp)* | Optional |

---

### Step 5: Verify Deployment & Health Check

Once the deployment completes on Render (approx. 2 minutes):
1. Render will assign you a live backend URL (e.g. `https://quickreply-backend.onrender.com`).
2. Test the health endpoint in your browser:
   ```
   https://YOUR-RENDER-URL.onrender.com/api/system/status
   ```
   **Expected Response:**
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-08-17T...",
     "uptime": 120,
     "version": "2.0.0",
     "engines": {
       "whatsapp": "active",
       "socketio": "connected",
       "cron": "running"
     }
   }
   ```

---

### Step 6: Link Render WebSockets with Vercel Frontend (Optional)

To connect the Vercel frontend live feed directly to your Render Socket.io stream:
1. Go to **[vercel.com](https://vercel.com) &rarr; quick-reply-ai &rarr; Settings &rarr; Environment Variables**.
2. Add:
   - `NEXT_PUBLIC_SOCKET_URL`: `https://YOUR-RENDER-URL.onrender.com`
3. Click **Save** and trigger a redeploy on Vercel.

---

### 🎉 Your 24/7 Omnichannel AI Engine is Live!
- **Frontend Edge CDN**: `https://quick-reply-ai-seven.vercel.app`
- **Persistent Backend**: `https://YOUR-RENDER-URL.onrender.com`
