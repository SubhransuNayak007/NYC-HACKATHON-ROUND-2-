/* ============================================================
   QuickReply Chrome Extension — Popup Logic
   ============================================================
   Works with the real backend API (cookie-based auth).
   The popup checks auth by calling /api/usage/today which
   requires a valid session cookie.
   ============================================================ */

// Load backend URL from config with localStorage fallback
const BACKEND = (typeof EXT_CONFIG !== "undefined" && EXT_CONFIG.BACKEND_URL) ||
  localStorage.getItem("qr_backend_url") ||
  "https://quick-reply.vercel.app";

/* ---------- DOM References ---------- */
const $ = (sel) => document.querySelector(sel);

const viewLoading      = $("#view-loading");
const viewDisconnected = $("#view-disconnected");
const viewConnected    = $("#view-connected");

const btnConnect      = $("#btn-connect");
const btnDisconnect   = $("#btn-disconnect");

const toggleOverlay   = $("#toggle-overlay");

const selectChannel   = $("#select-channel");
const channelHint     = $("#channel-hint");

const userEmailEl     = $("#user-email");
const userTierBadge   = $("#user-tier-badge");

const statPending     = $("#stat-pending");
const statRepliedToday = $("#stat-replied-today");
const statSentPos     = $("#stat-sentiment-pos");
const statSentNeg     = $("#stat-sentiment-neg");

/* ---------- View switching ---------- */
function showView(view) {
  viewLoading.classList.add("hidden");
  viewDisconnected.classList.add("hidden");
  viewConnected.classList.add("hidden");
  view.classList.remove("hidden");
}

/* ---------- Toast notifications ---------- */
function showToast(message, type = "info", duration = 2800) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

/* ---------- Chrome storage helpers ---------- */
function storageGet(keys) {
  return new Promise((resolve) => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result = {};
      keys.forEach((k) => {
        const v = localStorage.getItem("qr_" + k);
        result[k] = v ? JSON.parse(v) : undefined;
      });
      resolve(result);
    }
  });
}

function storageSet(data) {
  return new Promise((resolve) => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set(data, resolve);
    } else {
      Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem("qr_" + k, JSON.stringify(v));
      });
      resolve();
    }
  });
}

function storageRemove(keys) {
  return new Promise((resolve) => {
    if (chrome?.storage?.local) {
      chrome.storage.local.remove(keys, resolve);
    } else {
      keys.forEach((k) => localStorage.removeItem("qr_" + k));
      resolve();
    }
  });
}

/* ---------- Backend fetch helper ---------- */
async function apiFetch(path, options = {}) {
  const url = `${BACKEND}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ---------- Send message to content script ---------- */
async function sendToContentScript(action, payload = {}) {
  try {
    const tabs = await chrome.tabs.query({
      url: ["https://studio.youtube.com/*", "https://www.youtube.com/*"],
    });
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, { action, ...payload });
      } catch {
        // content script not loaded on this tab, skip
      }
    }
  } catch {
    // Not in extension context or no matching tabs
  }
}

/* ---------- Check auth status by calling a protected endpoint ---------- */
async function checkAuthStatus() {
  try {
    // /api/usage/today returns user session info if cookie is valid
    const data = await apiFetch("/api/usage/today");
    if (data && !data.error) {
      return {
        authenticated: true,
        email: data.email || "",
        tier: data.tier || "free",
        repliesUsed: data.used || 0,
        dailyLimit: data.limit || 500,
        remaining: data.remaining || 0,
      };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

/* ---------- Fetch session token for header-based API auth ---------- */
async function fetchSessionToken() {
  try {
    const data = await apiFetch("/api/extension/session", {
      method: "POST",
      body: JSON.stringify({ action: "token" }),
    });
    if (data && data.email && data.token) {
      return { email: data.email, token: data.token };
    }
  } catch {
    // fall through
  }
  return null;
}

/* ---------- Populate channel dropdown ---------- */
async function populateChannels(selectedChannelId) {
  try {
    const channels = await apiFetch("/api/channels");
    // Clear existing options (keep the placeholder)
    while (selectChannel.options.length > 1) {
      selectChannel.remove(1);
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      channelHint.textContent = "No channels connected. Add one from the dashboard.";
      return;
    }

    channels.forEach((ch) => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `${ch.name} (${ch.handle || ""})`;
      if (ch.id === selectedChannelId) {
        opt.selected = true;
      }
      selectChannel.appendChild(opt);
    });

    channelHint.textContent = "Choose which YouTube channel to monitor for comments.";
  } catch {
    channelHint.textContent = "Could not load channels. Is the server running?";
  }
}

/* ---------- Fetch and display quick stats ---------- */
async function fetchStats() {
  try {
    // Fetch pending comments (matched + review)
    const comments = await apiFetch("/api/comments?status=matched");
    const reviewComments = await apiFetch("/api/comments?status=review");
    const matched = Array.isArray(comments) ? comments.length : 0;
    const review = Array.isArray(reviewComments) ? reviewComments.length : 0;
    statPending.textContent = matched + review;
  } catch {
    statPending.textContent = "--";
  }

  try {
    // Fetch usage data (replies today)
    const usage = await apiFetch("/api/usage/today");
    statRepliedToday.textContent = usage.used !== undefined ? usage.used : "--";
  } catch {
    statRepliedToday.textContent = "--";
  }

  // Sentiment stats from analytics endpoint
  try {
    const analytics = await apiFetch("/api/analytics");
    if (analytics?.sentimentBreakdown) {
      statSentPos.textContent = analytics.sentimentBreakdown.positive ?? "--";
      statSentNeg.textContent = analytics.sentimentBreakdown.negative ?? "--";
    } else {
      statSentPos.textContent = "--";
      statSentNeg.textContent = "--";
    }
  } catch {
    statSentPos.textContent = "--";
    statSentNeg.textContent = "--";
  }
}

/* ---------- Populate connected UI ---------- */
function updateConnectedUI(authData) {
  const email = authData.email || "";
  const tier = authData.tier || "free";

  if (userEmailEl) userEmailEl.textContent = email || "Connected";
  if (userTierBadge) {
    userTierBadge.textContent = tier === "premium" ? "Premium" : "Free";
    if (tier === "premium") {
      userTierBadge.classList.add("tier-premium");
    } else {
      userTierBadge.classList.remove("tier-premium");
    }
  }

  showView(viewConnected);
}

/* ---------- Show disconnected UI ---------- */
function showDisconnectedUI() {
  showView(viewDisconnected);
}

/* ---------- Connect flow ---------- */
async function handleConnect() {
  try {
    await chrome.tabs.create({
      url: `${BACKEND}/api/auth/google?login=true&state=extension`,
    });
    showToast(
      "Complete login in the new tab, then reopen this popup.",
      "info",
      4000
    );
  } catch {
    window.open(
      `${BACKEND}/api/auth/google?login=true&state=extension`,
      "_blank"
    );
  }
}

/* ---------- Disconnect flow ---------- */
async function handleDisconnect() {
  // Call the backend logout endpoint to clear server-side cookies
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // logout endpoint might fail, continue with local cleanup
  }

  await storageRemove(["qr_session", "qr_overlay_enabled", "qr_selected_channel"]);
  // Clear header-auth tokens too so content scripts / background stop authenticating
  await chrome.storage.local.remove([
    "sessionToken",
    "sessionEmail",
    "isLoggedIn",
  ]);
  try {
    await chrome.runtime.sendMessage({ type: "CLEAR_AUTH" });
  } catch {
    // background unavailable
  }

  // Notify content scripts to hide overlay
  await sendToContentScript("QR_HIDE_OVERLAY");

  // Reset UI
  if (toggleOverlay) toggleOverlay.checked = false;
  if (selectChannel) selectChannel.value = "";
  if (statPending) statPending.textContent = "--";
  if (statRepliedToday) statRepliedToday.textContent = "--";
  if (statSentPos) statSentPos.textContent = "--";
  if (statSentNeg) statSentNeg.textContent = "--";

  showDisconnectedUI();
  showToast("Disconnected from QuickReply.", "info");
}

/* ---------- Overlay toggle ---------- */
async function handleOverlayToggle() {
  const enabled = toggleOverlay.checked;
  await storageSet({ qr_overlay_enabled: enabled });

  if (enabled) {
    await sendToContentScript("QR_SHOW_OVERLAY");
  } else {
    await sendToContentScript("QR_HIDE_OVERLAY");
  }
}

/* ---------- Channel selection ---------- */
async function handleChannelChange() {
  const channelId = selectChannel.value;
  await storageSet({ qr_selected_channel: channelId || null });

  if (channelId) {
    await sendToContentScript("QR_SET_CHANNEL", { channelId });
    showToast("Channel updated", "success");
  }
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  // Point dashboard footer links at the configured backend
  document.querySelectorAll("a[id^='link-dashboard']").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.includes("localhost")) {
      link.setAttribute("href", `${BACKEND}/dashboard`);
    }
  });

  // Show loading state
  showView(viewLoading);

  // Bind event listeners
  btnConnect.addEventListener("click", handleConnect);
  btnDisconnect.addEventListener("click", handleDisconnect);
  toggleOverlay.addEventListener("change", handleOverlayToggle);
  selectChannel.addEventListener("change", handleChannelChange);

  // Restore overlay toggle from storage
  const stored = await storageGet(["qr_overlay_enabled", "qr_selected_channel"]);
  if (stored.qr_overlay_enabled !== undefined) {
    toggleOverlay.checked = !!stored.qr_overlay_enabled;
  } else {
    toggleOverlay.checked = true; // default enabled
  }

  // Check if we have an active session by calling a protected endpoint
  const auth = await checkAuthStatus();

  if (auth.authenticated) {
    // Fetch the session token so content scripts / background worker can
    // authenticate via X-Session-Token headers (cookies are not readable
    // from the isolated content-script context).
    const session = await fetchSessionToken();
    if (session) {
      await chrome.storage.local.set({
        sessionToken: session.token,
        sessionEmail: session.email,
        isLoggedIn: true,
      });
      if (!auth.email && session.email) auth.email = session.email;
    }

    // Save session info to storage for the background worker
    await storageSet({
      qr_session: { email: auth.email, tier: auth.tier },
    });

    updateConnectedUI(auth);

    // Load channels and stats in parallel
    await Promise.allSettled([
      populateChannels(stored.qr_selected_channel),
      fetchStats(),
    ]);

    // Sync overlay state to content scripts
    if (toggleOverlay.checked) {
      sendToContentScript("QR_SHOW_OVERLAY");
    }
  } else {
    showDisconnectedUI();
  }

  // Backend URL setting
  const urlInput = document.getElementById("backend-url-input");
  const urlSaveBtn = document.getElementById("backend-url-save");
  if (urlInput && urlSaveBtn) {
    const savedUrl = localStorage.getItem("qr_backend_url");
    if (savedUrl) urlInput.value = savedUrl;
    urlSaveBtn.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (url) {
        localStorage.setItem("qr_backend_url", url);
        showToast("Backend URL updated. Reload the extension.", "success");
      }
    });
  }
});
