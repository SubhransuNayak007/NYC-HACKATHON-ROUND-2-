/**
 * QuickReply Content Script
 * Injected into YouTube Studio pages. Manages the floating overlay panel
 * that displays pending comments and allows quick actions.
 */
(() => {
  'use strict';

  // Prevent double-injection
  if (window.__quickReplyInitialized) return;
  window.__quickReplyInitialized = true;

  const PANEL_ID = 'quickreply-panel';
  const FAB_ID = 'quickreply-fab';
  const STYLE_ID = 'quickreply-content-styles';

  // ─── State ─────────────────────────────────────────────────────────

  let panelEl = null;
  let fabEl = null;
  let isPanelOpen = false;
  let isOverlayEnabled = true;
  let isLoggedIn = false;
  let comments = [];
  let sseSource = null;
  let isLoading = false;
  let currentChannelId = null;

  // Brand colors
  const COLORS = {
    navy: '#0038FF',
    volt: '#FFD60A',
    mint: '#10b981',
    coral: '#e0002b',
    purple: '#a855f7',
    darkBg: '#0a0a1a',
    surface: 'rgba(10, 10, 26, 0.85)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b8'
  };

  // ─── Page Detection ────────────────────────────────────────────────

  /**
   * Check if current page is a supported YouTube page.
   */
  function isSupportedPage() {
    const url = window.location.href;
    return (
      url.includes('studio.youtube.com') ||
      url.includes('youtube.com/channel') ||
      url.includes('youtube.com/dashboard') ||
      url.includes('youtube.com/@')
    );
  }

  // ─── Initialization ────────────────────────────────────────────────

  async function init() {
    if (!isSupportedPage()) return;

    // Load state from extension storage
    try {
      const response = await sendMessage({ type: 'CONTENT_SCRIPT_READY' });
      if (response) {
        isOverlayEnabled = response.overlayEnabled;
        isLoggedIn = response.isLoggedIn;
      }
    } catch (_) {
      // Extension context may not be ready yet
    }

    if (!isOverlayEnabled) return;

    // Build and inject the floating panel
    createPanel();
    createFAB();

    // Set up SPA navigation monitoring
    observeNavigation();

    // Start fetching comments if logged in
    if (isLoggedIn) {
      loadComments();
      connectToSSE();
    }
  }

  // ─── Panel Creation ────────────────────────────────────────────────

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    panelEl = document.createElement('div');
    panelEl.id = PANEL_ID;
    panelEl.className = 'qr-panel qr-panel--closed';
    panelEl.innerHTML = buildPanelHTML();
    document.body.appendChild(panelEl);

    // Attach event listeners
    setupPanelEvents();
  }

  function buildPanelHTML() {
    return `
      <div class="qr-panel__header" id="qr-panel-header">
        <div class="qr-panel__brand">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="20" rx="4" fill="${COLORS.navy}"/>
            <text x="10" y="14" font-family="Arial" font-size="9" font-weight="bold" fill="${COLORS.volt}" text-anchor="middle">QR</text>
          </svg>
          <span class="qr-panel__title">QuickReply</span>
        </div>
        <div class="qr-panel__header-actions">
          <button class="qr-panel__btn-icon" id="qr-refresh-btn" title="Refresh comments">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
          <button class="qr-panel__btn-icon" id="qr-minimize-btn" title="Minimize">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="qr-panel__body">
        ${!isLoggedIn ? buildLoginView() : buildCommentsView()}
      </div>
    `;
  }

  function buildLoginView() {
    return `
      <div class="qr-panel__empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 12px; opacity: 0.6;">
          <rect width="48" height="48" rx="12" fill="${COLORS.navy}" fill-opacity="0.3"/>
          <text x="24" y="32" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.volt}" text-anchor="middle">QR</text>
        </svg>
        <h3 class="qr-panel__empty-title">QuickReply</h3>
        <p class="qr-panel__empty-desc">Connect your account to manage YouTube comments with AI-powered replies.</p>
        <button class="qr-panel__btn qr-panel__btn--primary" id="qr-login-btn">
          Connect to QuickReply
        </button>
      </div>
    `;
  }

  function buildCommentsView() {
    return `
      <div class="qr-panel__stats" id="qr-stats">
        <div class="qr-panel__stat">
          <span class="qr-panel__stat-value" id="qr-pending-count">0</span>
          <span class="qr-panel__stat-label">Pending</span>
        </div>
        <div class="qr-panel__stat">
          <span class="qr-panel__stat-value" id="qr-replied-count">0</span>
          <span class="qr-panel__stat-label">Replied</span>
        </div>
        <div class="qr-panel__stat">
          <span class="qr-panel__stat-value" id="qr-today-count">0</span>
          <span class="qr-panel__stat-label">Today</span>
        </div>
      </div>
      <div class="qr-panel__filters" id="qr-filters">
        <button class="qr-panel__filter qr-panel__filter--active" data-filter="review">Review</button>
        <button class="qr-panel__filter" data-filter="matched">Matched</button>
        <button class="qr-panel__filter" data-filter="replied">Replied</button>
      </div>
      <div class="qr-panel__list" id="qr-comment-list">
        <div class="qr-panel__loading" id="qr-loading">
          <div class="qr-spinner"></div>
          <span>Loading comments...</span>
        </div>
      </div>
      <div class="qr-panel__footer">
        <button class="qr-panel__btn qr-panel__btn--ghost" id="qr-open-dashboard">
          Open Dashboard
        </button>
      </div>
    `;
  }

  // ─── FAB (Floating Action Button) ──────────────────────────────────

  function createFAB() {
    if (document.getElementById(FAB_ID)) return;

    fabEl = document.createElement('div');
    fabEl.id = FAB_ID;
    fabEl.className = 'qr-fab';
    fabEl.title = 'QuickReply';
    fabEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="${COLORS.navy}"/>
        <text x="12" y="16" font-family="Arial" font-size="9" font-weight="bold" fill="${COLORS.volt}" text-anchor="middle">QR</text>
      </svg>
      <span class="qr-fab__badge" id="qr-fab-badge" style="display:none;">0</span>
    `;
    document.body.appendChild(fabEl);

    fabEl.addEventListener('click', togglePanel);
  }

  // ─── Panel Events ──────────────────────────────────────────────────

  function setupPanelEvents() {
    // Minimize button
    const minimizeBtn = panelEl.querySelector('#qr-minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', togglePanel);
    }

    // Refresh button
    const refreshBtn = panelEl.querySelector('#qr-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadComments();
      });
    }

    // Login button
    const loginBtn = panelEl.querySelector('#qr-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'OPEN_AUTH',
          url: 'https://quick-reply.vercel.app/api/auth/google?login=true&state=extension'
        });
      });
    }

    // Open Dashboard button
    const dashboardBtn = panelEl.querySelector('#qr-open-dashboard');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'OPEN_DASHBOARD',
          url: 'https://quick-reply.vercel.app/dashboard'
        });
      });
    }

    // Filter buttons
    const filters = panelEl.querySelectorAll('.qr-panel__filter');
    filters.forEach((filter) => {
      filter.addEventListener('click', () => {
        filters.forEach(f => f.classList.remove('qr-panel__filter--active'));
        filter.classList.add('qr-panel__filter--active');
        loadComments(filter.dataset.filter);
      });
    });

    // Drag functionality on header
    setupDrag();

    // Listen for messages from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleExtensionMessage(message, sendResponse);
    });
  }

  // ─── Drag Handling ─────────────────────────────────────────────────

  function setupDrag() {
    const header = panelEl.querySelector('#qr-panel-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.qr-panel__btn-icon')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panelEl.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panelEl.classList.add('qr-panel--dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panelEl.style.left = (startLeft + dx) + 'px';
      panelEl.style.top = (startTop + dy) + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        panelEl.classList.remove('qr-panel--dragging');
      }
    });
  }

  // ─── Panel Toggle ──────────────────────────────────────────────────

  function togglePanel() {
    isPanelOpen = !isPanelOpen;

    if (isPanelOpen) {
      panelEl.classList.remove('qr-panel--closed');
      panelEl.classList.add('qr-panel--open');
      fabEl.classList.add('qr-fab--hidden');

      if (isLoggedIn && comments.length === 0) {
        loadComments();
      }
    } else {
      panelEl.classList.remove('qr-panel--open');
      panelEl.classList.add('qr-panel--closed');
      fabEl.classList.remove('qr-fab--hidden');
    }
  }

  // ─── Data Loading ──────────────────────────────────────────────────

  async function loadComments(filterStatus) {
    if (!isLoggedIn || isLoading) return;

    isLoading = true;
    showLoading(true);

    try {
      const result = await QuickReplyAPI.fetchComments(currentChannelId, filterStatus);
      comments = Array.isArray(result) ? result : [];
      renderComments(comments);
      updateStats();
    } catch (err) {
      showError(err.message || 'Failed to load comments');
    } finally {
      isLoading = false;
      showLoading(false);
    }
  }

  function renderComments(commentList) {
    const listEl = panelEl.querySelector('#qr-comment-list');
    if (!listEl) return;

    if (commentList.length === 0) {
      listEl.innerHTML = `
        <div class="qr-panel__empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textSecondary}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>No comments found</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = commentList.map(comment => buildCommentCard(comment)).join('');

    // Attach action button listeners
    listEl.querySelectorAll('.qr-comment-card').forEach(card => {
      const commentId = card.dataset.commentId;

      const replyBtn = card.querySelector('.qr-action--reply');
      if (replyBtn) {
        replyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleReply(commentId);
        });
      }

      const editReplyBtn = card.querySelector('.qr-action--edit');
      if (editReplyBtn) {
        editReplyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleEditReply(commentId, card);
        });
      }

      const skipBtn = card.querySelector('.qr-action--skip');
      if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleSkip(commentId);
        });
      }

      const blockBtn = card.querySelector('.qr-action--block');
      if (blockBtn) {
        blockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleBlock(commentId);
        });
      }

      const aiBtn = card.querySelector('.qr-action--ai');
      if (aiBtn) {
        aiBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleGenerateAI(commentId, card);
        });
      }
    });
  }

  function buildCommentCard(comment) {
    const statusClass = `qr-comment--${comment.status}`;
    const timeAgo = formatTimeAgo(comment.publishedAt);
    const replyText = comment.autoReplyText || '';
    const sentimentEmoji = getSentimentEmoji(comment.sentiment);

    return `
      <div class="qr-comment-card ${statusClass}" data-comment-id="${comment.id}" data-status="${comment.status}">
        <div class="qr-comment__header">
          <img class="qr-comment__avatar" src="${escapeHtml(comment.authorAvatar || '')}" alt="" onerror="this.style.display='none'"/>
          <div class="qr-comment__meta">
            <span class="qr-comment__author">${escapeHtml(comment.author)}</span>
            <span class="qr-comment__time">${timeAgo}</span>
          </div>
          ${comment.sentiment ? `<span class="qr-comment__sentiment" title="${comment.sentiment}">${sentimentEmoji}</span>` : ''}
        </div>
        <div class="qr-comment__text">${escapeHtml(comment.text)}</div>
        <div class="qr-comment__video" title="${escapeHtml(comment.videoTitle || '')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          ${escapeHtml(comment.videoTitle || 'Unknown video')}
        </div>
        ${replyText ? `
          <div class="qr-comment__reply">
            <span class="qr-comment__reply-label">Reply:</span>
            <span class="qr-comment__reply-text">${escapeHtml(replyText)}</span>
          </div>
        ` : ''}
        ${comment.status === 'matched' || comment.status === 'review' ? `
          <div class="qr-comment__actions">
            <button class="qr-action qr-action--ai" title="Generate AI Reply">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </button>
            <button class="qr-action qr-action--edit" title="Edit & Reply">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="qr-action qr-action--reply" title="Send Reply">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              Reply
            </button>
            <button class="qr-action qr-action--skip" title="Skip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </button>
            <button class="qr-action qr-action--block" title="Block User">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="18" y1="8" x2="23" y2="13"></line>
                <line x1="23" y1="8" x2="18" y2="13"></line>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── Comment Actions ───────────────────────────────────────────────

  async function handleReply(commentId) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const replyText = comment.autoReplyText || 'Thank you for commenting!';

    setCardLoading(commentId, true, 'Sending reply...');

    try {
      await QuickReplyAPI.sendReply(commentId, replyText);
      showToast('Reply sent successfully!', 'success');
      removeCard(commentId);
      updateStats();
    } catch (err) {
      showToast(err.message || 'Failed to send reply', 'error');
      setCardLoading(commentId, false);
    }
  }

  async function handleEditReply(commentId, cardEl) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    // Replace action buttons with an edit form
    const actionsEl = cardEl.querySelector('.qr-comment__actions');
    if (!actionsEl) return;

    const currentReply = comment.autoReplyText || '';
    actionsEl.outerHTML = `
      <div class="qr-comment__edit-form">
        <textarea class="qr-edit-textarea" placeholder="Type your reply...">${escapeHtml(currentReply)}</textarea>
        <div class="qr-edit-actions">
          <button class="qr-panel__btn qr-panel__btn--primary qr-edit-send" data-comment-id="${commentId}">Send</button>
          <button class="qr-panel__btn qr-panel__btn--ghost qr-edit-cancel" data-comment-id="${commentId}">Cancel</button>
        </div>
      </div>
    `;

    const textarea = cardEl.querySelector('.qr-edit-textarea');
    const sendBtn = cardEl.querySelector('.qr-edit-send');
    const cancelBtn = cardEl.querySelector('.qr-edit-cancel');

    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const text = textarea.value.trim();
        if (!text) {
          showToast('Reply cannot be empty', 'error');
          return;
        }
        setCardLoading(commentId, true, 'Sending reply...');
        try {
          await QuickReplyAPI.sendReply(commentId, text);
          showToast('Reply sent!', 'success');
          removeCard(commentId);
          updateStats();
        } catch (err) {
          showToast(err.message || 'Failed to send', 'error');
          setCardLoading(commentId, false);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        renderComments(comments); // Re-render to restore original state
      });
    }

    if (textarea) textarea.focus();
  }

  async function handleSkip(commentId) {
    setCardLoading(commentId, true, 'Skipping...');

    try {
      await QuickReplyAPI.skipComment(commentId);
      showToast('Comment skipped', 'success');
      removeCard(commentId);
      updateStats();
    } catch (err) {
      showToast(err.message || 'Failed to skip', 'error');
      setCardLoading(commentId, false);
    }
  }

  async function handleBlock(commentId) {
    if (!confirm('Block this user? All their comments will be skipped.')) return;

    setCardLoading(commentId, true, 'Blocking user...');

    try {
      await QuickReplyAPI.blockComment(commentId);
      showToast('User blocked', 'success');
      removeCard(commentId);
      updateStats();
    } catch (err) {
      showToast(err.message || 'Failed to block user', 'error');
      setCardLoading(commentId, false);
    }
  }

  async function handleGenerateAI(commentId, cardEl) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    setCardLoading(commentId, true, 'Generating AI reply...');

    try {
      const result = await QuickReplyAPI.generateAIReply(comment);
      const replyText = result.replyText || result.reply || '';

      if (replyText) {
        // Insert into card for review
        const textarea = cardEl.querySelector('.qr-edit-textarea');
        if (textarea) {
          textarea.value = replyText;
        } else {
          // Replace actions with edit form
          const actionsEl = cardEl.querySelector('.qr-comment__actions');
          if (actionsEl) {
            actionsEl.outerHTML = `
              <div class="qr-comment__edit-form">
                <div class="qr-ai-badge">AI Generated</div>
                <textarea class="qr-edit-textarea">${escapeHtml(replyText)}</textarea>
                <div class="qr-edit-actions">
                  <button class="qr-panel__btn qr-panel__btn--primary qr-edit-send" data-comment-id="${commentId}">Send</button>
                  <button class="qr-panel__btn qr-panel__btn--ghost qr-edit-cancel" data-comment-id="${commentId}">Cancel</button>
                </div>
              </div>
            `;

            const sendBtn = cardEl.querySelector('.qr-edit-send');
            const cancelBtn = cardEl.querySelector('.qr-edit-cancel');

            sendBtn?.addEventListener('click', async () => {
              const text = cardEl.querySelector('.qr-edit-textarea').value.trim();
              if (!text) return;
              setCardLoading(commentId, true, 'Sending...');
              try {
                await QuickReplyAPI.sendReply(commentId, text);
                showToast('AI reply sent!', 'success');
                removeCard(commentId);
                updateStats();
              } catch (err) {
                showToast(err.message || 'Failed to send', 'error');
                setCardLoading(commentId, false);
              }
            });

            cancelBtn?.addEventListener('click', () => {
              renderComments(comments);
            });
          }
        }
      }

      setCardLoading(commentId, false);
    } catch (err) {
      showToast(err.message || 'Failed to generate AI reply', 'error');
      setCardLoading(commentId, false);
    }
  }

  // ─── UI Helpers ────────────────────────────────────────────────────

  function setCardLoading(commentId, loading, message) {
    const card = panelEl.querySelector(`[data-comment-id="${commentId}"]`);
    if (!card) return;

    if (loading) {
      card.classList.add('qr-comment--loading');
      const existingLoader = card.querySelector('.qr-card-loading');
      if (!existingLoader) {
        const loader = document.createElement('div');
        loader.className = 'qr-card-loading';
        loader.innerHTML = `<div class="qr-spinner qr-spinner--small"></div><span>${message || 'Loading...'}</span>`;
        card.appendChild(loader);
      }
    } else {
      card.classList.remove('qr-comment--loading');
      const loader = card.querySelector('.qr-card-loading');
      if (loader) loader.remove();
    }
  }

  function removeCard(commentId) {
    const card = panelEl.querySelector(`[data-comment-id="${commentId}"]`);
    if (card) {
      card.classList.add('qr-comment--removing');
      setTimeout(() => {
        card.remove();
        // Update local state
        comments = comments.filter(c => c.id !== commentId);
        // Check if list is now empty
        const listEl = panelEl.querySelector('#qr-comment-list');
        if (listEl && listEl.children.length === 0) {
          renderComments([]);
        }
      }, 300);
    }
  }

  function showLoading(show) {
    const loader = panelEl.querySelector('#qr-loading');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  function showError(message) {
    const listEl = panelEl.querySelector('#qr-comment-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="qr-panel__empty-state qr-panel__error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${COLORS.coral}" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>${escapeHtml(message)}</p>
          <button class="qr-panel__btn qr-panel__btn--ghost" onclick="document.querySelector('#qr-refresh-btn')?.click()">Retry</button>
        </div>
      `;
    }
  }

  function updateStats() {
    const pendingCount = comments.filter(c => c.status === 'matched' || c.status === 'review').length;
    const repliedCount = comments.filter(c => c.status === 'replied').length;

    const pendingEl = panelEl.querySelector('#qr-pending-count');
    const repliedEl = panelEl.querySelector('#qr-replied-count');

    if (pendingEl) pendingEl.textContent = pendingCount;
    if (repliedEl) repliedEl.textContent = repliedCount;

    // Update FAB badge
    const badge = document.getElementById('qr-fab-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount > 99 ? '99+' : pendingCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ─── Toast Notifications ───────────────────────────────────────────

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.qr-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `qr-toast qr-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('qr-toast--visible');
    });

    setTimeout(() => {
      toast.classList.remove('qr-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── SSE Connection ────────────────────────────────────────────────

  async function connectToSSE() {
    if (sseSource) {
      sseSource.close();
    }

    try {
      sseSource = await QuickReplyAPI.connectSSE(
        // onComment
        (event) => {
          if (event.type === 'new_comment' && event.comment) {
            comments.unshift(event.comment);
            renderComments(comments);
            updateStats();

            // Show a subtle notification
            showToast(`New comment from ${event.comment.author}`, 'info');
          }
        },
        // onConnect
        () => {
          console.log('[QuickReply] SSE connected');
        },
        // onError
        () => {
          console.log('[QuickReply] SSE error, will retry...');
          setTimeout(connectToSSE, 30000);
        }
      );
    } catch (_) {
      setTimeout(connectToSSE, 30000);
    }
  }

  // ─── Message Handling ──────────────────────────────────────────────

  function handleExtensionMessage(message, sendResponse) {
    switch (message.type) {
      case 'OVERLAY_TOGGLE':
        isOverlayEnabled = message.enabled;
        if (!isOverlayEnabled) {
          if (panelEl) panelEl.style.display = 'none';
          if (fabEl) fabEl.style.display = 'none';
        } else {
          if (panelEl) panelEl.style.display = '';
          if (fabEl) fabEl.style.display = '';
        }
        sendResponse({ success: true });
        break;

      case 'NEW_COMMENT':
        if (message.comment) {
          comments.unshift(message.comment);
          renderComments(comments);
          updateStats();
          showToast(`New comment from ${message.comment.author}`, 'info');
        }
        sendResponse({ success: true });
        break;

      case 'AUTH_SUCCESS':
        isLoggedIn = true;
        refreshPanelContent();
        loadComments();
        connectToSSE();
        sendResponse({ success: true });
        break;

      case 'AUTH_LOGOUT':
        isLoggedIn = false;
        comments = [];
        refreshPanelContent();
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }
        sendResponse({ success: true });
        break;
    }
  }

  function refreshPanelContent() {
    if (!panelEl) return;
    const body = panelEl.querySelector('.qr-panel__body');
    if (body) {
      body.innerHTML = isLoggedIn ? buildCommentsView() : buildLoginView();
      setupPanelEvents();
    }
  }

  // ─── SPA Navigation Monitoring ─────────────────────────────────────

  function observeNavigation() {
    // Monitor URL changes via History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      onNavigationChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      onNavigationChange();
    };

    window.addEventListener('popstate', onNavigationChange);

    // Monitor DOM mutations for YouTube's SPA routing
    const observer = new MutationObserver((mutations) => {
      // YouTube Studio re-renders the main content area
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Debounce navigation checks
          if (!window.__qrNavDebounce) {
            window.__qrNavDebounce = setTimeout(() => {
              window.__qrNavDebounce = null;
              onNavigationChange();
            }, 500);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  let lastUrl = '';
  function onNavigationChange() {
    const currentUrl = window.location.href;
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    const supported = isSupportedPage();

    if (supported && !panelEl) {
      createPanel();
      createFAB();
      if (isLoggedIn) {
        loadComments();
        connectToSSE();
      }
    } else if (supported && panelEl) {
      // Just refresh data on page change
      if (isLoggedIn) {
        loadComments();
      }
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  }

  function getSentimentEmoji(sentiment) {
    switch (sentiment) {
      case 'positive': return '\u{1F44D}';
      case 'negative': return '\u{1F44E}';
      case 'question': return '\u{2753}';
      case 'spam': return '\u{1F6AB}';
      case 'neutral': return '\u{1F914}';
      default: return '';
    }
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (_) {
        resolve(null);
      }
    });
  }

  // ─── Boot ──────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
