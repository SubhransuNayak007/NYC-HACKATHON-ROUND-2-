// ---------------------------------------------------------------------------
// QuickReply Panel  --  Chrome Extension floating panel logic
// ---------------------------------------------------------------------------
// Relies on api.js being loaded first (provides QRApi.* helpers).
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // ── Element references ─────────────────────────────────────────────────
  const panel          = document.getElementById("qr-panel");
  const header         = document.getElementById("qr-header");
  const btnMinimize    = document.getElementById("btn-minimize");
  const btnClose       = document.getElementById("btn-close");
  const statusEl       = document.getElementById("qr-status");
  const statusDot      = statusEl.querySelector(".status-dot");
  const statusText     = statusEl.querySelector(".status-text");
  const tabBtns        = document.querySelectorAll(".qr-tab");
  const tabContents    = document.querySelectorAll(".qr-tab-content");
  const commentsList   = document.getElementById("qr-comments");
  const footerStats    = document.getElementById("footer-stats");
  const btnDashboard   = document.getElementById("btn-open-dashboard");

  // AI tab elements
  const aiInput        = document.getElementById("ai-comment-input");
  const btnGenerate    = document.getElementById("btn-ai-generate");
  const aiResult       = document.getElementById("ai-result");
  const aiReplyText    = document.getElementById("ai-reply-text");
  const btnAiSend      = document.getElementById("btn-ai-send");
  const btnAiCopy      = document.getElementById("btn-ai-copy");

  // ── State ──────────────────────────────────────────────────────────────
  let sseSource         = null;
  let isMinimized       = false;
  let comments          = [];
  let lastAiReply       = "";
  let refreshTimer      = null;
  let activeTab         = "feed";

  // ── API base ───────────────────────────────────────────────────────────
  // In production the extension will set this via chrome.storage. During
  // development it falls back to localhost:3000.
  const API_BASE = (typeof QRApi !== "undefined" && QRApi.baseUrl)
    ? QRApi.baseUrl
    : "https://quick-reply.vercel.app";

  // ── Dashboard link ─────────────────────────────────────────────────────
  btnDashboard.href = API_BASE + "/dashboard";

  // =====================================================================
  //  SSE  --  Real-time comment stream
  // =====================================================================
  function connectSSE() {
    if (sseSource) {
      sseSource.close();
    }

    setConnectionStatus("connecting");

    try {
      sseSource = new EventSource(API_BASE + "/api/comments/stream");

      sseSource.onopen = () => {
        setConnectionStatus("connected");
      };

      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSSEMessage(data);
        } catch {
          // ignore malformed frames
        }
      };

      sseSource.onerror = () => {
        setConnectionStatus("disconnected");
        // Auto-reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    } catch {
      setConnectionStatus("disconnected");
      setTimeout(connectSSE, 5000);
    }
  }

  function handleSSEMessage(data) {
    if (data.type === "connected") return; // handshake acknowledgement

    if (data.type === "new_comment" || data.type === "comment_update") {
      const incoming = data.comment || data;
      const idx = comments.findIndex((c) => c.id === incoming.id);
      if (idx >= 0) {
        comments[idx] = incoming;
      } else {
        comments.unshift(incoming);
      }
      renderComments();
      updateStats();
    }
  }

  function setConnectionStatus(state) {
    statusEl.className = state;
    const labels = {
      connected: "Connected",
      connecting: "Connecting...",
      disconnected: "Disconnected",
    };
    statusText.textContent = labels[state] || state;
  }

  // =====================================================================
  //  REST fetch helpers
  // =====================================================================
  async function fetchComments() {
    try {
      const res = await fetch(API_BASE + "/api/comments");
      if (!res.ok) throw new Error("Failed to fetch comments");
      comments = await res.json();
      renderComments();
      updateStats();
    } catch (err) {
      console.error("[QR Panel] fetchComments error:", err);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch(API_BASE + "/api/extension/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setConnectionStatus(data.connected ? "connected" : "disconnected");
      footerStats.textContent =
        data.pendingComments + " pending · " +
        data.todayReplies + " sent today";
    } catch {
      // status endpoint unreachable -- that is fine
    }
  }

  // =====================================================================
  //  Render comment cards
  // =====================================================================
  function renderComments() {
    const active = comments.filter(
      (c) => c.status === "matched" || c.status === "review",
    );

    if (active.length === 0) {
      commentsList.innerHTML =
        '<div class="qr-empty-state">' +
        "<p>No comments yet</p>" +
        "<span>Waiting for live polling...</span>" +
        "</div>";
      return;
    }

    commentsList.innerHTML = active
      .map((c) => commentCard(c))
      .join("");

    // Wire up action buttons
    commentsList.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", onCommentAction);
    });
  }

  function commentCard(c) {
    const sentimentEmoji = {
      positive: "👍",
      neutral: "📑",
      negative: "⚠️",
      question: "❓",
      spam: "🚫",
    };
    const emoji = sentimentEmoji[c.sentiment] || "";

    return (
      '<div class="qr-comment-card" data-id="' + c.id + '">' +
        '<div class="qr-comment-header">' +
          '<img class="qr-avatar" src="' + escapeAttr(c.authorAvatar || "") + '" alt="">' +
          '<span class="qr-author">' + escapeHTML(c.author) + "</span>" +
          '<span class="qr-badge qr-badge-' + c.status + '">' + c.status + "</span>" +
          (emoji ? '<span class="qr-sentiment" title="' + (c.sentiment || "") + '">' + emoji + "</span>" : "") +
        "</div>" +
        '<p class="qr-comment-text">' + escapeHTML(c.text) + "</p>" +
        '<p class="qr-video-title">' + escapeHTML(c.videoTitle || "") + "</p>" +
        (c.autoReplyText
          ? '<div class="qr-auto-reply"><strong>AI Reply:</strong> ' + escapeHTML(c.autoReplyText) + "</div>"
          : "") +
        '<div class="qr-actions">' +
          '<button class="qr-btn qr-btn-sm qr-btn-success" data-action="reply" data-id="' + c.id + '">Send</button>' +
          '<button class="qr-btn qr-btn-sm qr-btn-secondary" data-action="skip" data-id="' + c.id + '">Skip</button>' +
          '<button class="qr-btn qr-btn-sm qr-btn-danger" data-action="block" data-id="' + c.id + '">Block</button>' +
        "</div>" +
      "</div>"
    );
  }

  // =====================================================================
  //  Comment actions  (reply / skip / block)
  // =====================================================================
  async function onCommentAction(e) {
    const btn  = e.currentTarget;
    const id   = btn.dataset.id;
    const act  = btn.dataset.action;
    btn.disabled = true;
    btn.textContent = "...";

    const url = API_BASE + "/api/comments/" + id + "/" + act;
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        // Update local state
        const idx = comments.findIndex((c) => c.id === id);
        if (idx >= 0) comments[idx] = updated;
        renderComments();
        updateStats();
      }
    } catch (err) {
      console.error("[QR Panel] Action error:", err);
    }
  }

  // =====================================================================
  //  Stats footer
  // =====================================================================
  function updateStats() {
    const pending = comments.filter(
      (c) => c.status === "matched" || c.status === "review",
    ).length;
    footerStats.textContent = pending + " pending · —";
    // The "sent today" part is refreshed via fetchStatus periodically.
  }

  // =====================================================================
  //  Tab switching
  // =====================================================================
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab === activeTab) return;

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabContents.forEach((tc) => tc.classList.remove("active"));
      document.getElementById("tab-" + tab).classList.add("active");

      activeTab = tab;
    });
  });

  // =====================================================================
  //  AI reply generation
  // =====================================================================
  btnGenerate.addEventListener("click", async () => {
    const text = aiInput.value.trim();
    if (!text) return;

    btnGenerate.disabled = true;
    btnGenerate.textContent = "Generating...";
    aiResult.style.display = "none";

    try {
      const res = await fetch(API_BASE + "/api/ai/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentText: text,
          author: "User",
          videoTitle: "Manual input",
          channelName: "QuickReply",
        }),
      });

      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();

      lastAiReply = data.reply || "Sorry, could not generate a reply.";
      aiReplyText.textContent = lastAiReply;
      aiResult.style.display = "block";
    } catch (err) {
      console.error("[QR Panel] AI generate error:", err);
      aiReplyText.textContent = "Error: could not generate reply. Check your API key.";
      aiResult.style.display = "block";
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.textContent = "✨ Generate Reply";
    }
  });

  // Copy to clipboard
  btnAiCopy.addEventListener("click", () => {
    if (!lastAiReply) return;
    navigator.clipboard.writeText(lastAiReply).then(() => {
      const orig = btnAiCopy.textContent;
      btnAiCopy.textContent = "Copied!";
      setTimeout(() => (btnAiCopy.textContent = orig), 1500);
    });
  });

  // Send reply (posts to active comments or copies)
  btnAiSend.addEventListener("click", () => {
    if (!lastAiReply) return;
    // If there is a selected comment, send to that; otherwise just copy
    navigator.clipboard.writeText(lastAiReply).then(() => {
      const orig = btnAiSend.textContent;
      btnAiSend.textContent = "Copied to clipboard!";
      setTimeout(() => (btnAiSend.textContent = orig), 1500);
    });
  });

  // =====================================================================
  //  Draggable header
  // =====================================================================
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return; // ignore clicks on buttons
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    panel.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panel.style.position = "fixed";
    panel.style.left = (e.clientX - dragOffsetX) + "px";
    panel.style.top  = (e.clientY - dragOffsetY) + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      panel.style.transition = "";
    }
  });

  // =====================================================================
  //  Minimize / Maximize
  // =====================================================================
  btnMinimize.addEventListener("click", () => {
    isMinimized = !isMinimized;
    panel.classList.toggle("minimized", isMinimized);
    btnMinimize.textContent = isMinimized ? "□" : "─";
    btnMinimize.title = isMinimized ? "Restore" : "Minimize";
  });

  // =====================================================================
  //  Close (sends message to content script to hide the panel)
  // =====================================================================
  btnClose.addEventListener("click", () => {
    panel.style.display = "none";
    // Notify the content script so it can toggle the panel off
    try {
      window.parent.postMessage({ type: "qr-close-panel" }, "*");
    } catch {
      // Not embedded in an iframe -- just hide
    }
  });

  // =====================================================================
  //  Utilities
  // =====================================================================
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // =====================================================================
  //  Boot
  // =====================================================================
  fetchComments();
  fetchStatus();
  connectSSE();

  // Auto-refresh status every 30 seconds
  refreshTimer = setInterval(fetchStatus, 30000);
});
