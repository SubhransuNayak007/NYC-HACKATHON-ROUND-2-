/**
 * QuickReply Background Service Worker
 * Handles extension lifecycle, alarms, icon badge, and cross-context messaging.
 */

// ─── Extension Install / Update ──────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      overlayEnabled: true,
      apiBaseUrl: 'https://quick-reply.vercel.app',
      isLoggedIn: false,
      sessionToken: null,
      sessionEmail: null,
      selectedChannelId: null,
      lastCheckTime: null
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://quick-reply.vercel.app'
    });

    // Set up periodic alarm for comment checking (every 2 minutes)
    chrome.alarms.create('checkComments', {
      delayInMinutes: 2,
      periodInMinutes: 2
    });
  }

  if (details.reason === 'update') {
    // Re-create alarm on update in case period changed
    chrome.alarms.create('checkComments', {
      delayInMinutes: 1,
      periodInMinutes: 2
    });
  }
});

// ─── Alarm Handler ───────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkComments') {
    await checkForNewComments();
  }
});

/**
 * Fetch comments from the backend and update the badge count.
 */
async function checkForNewComments() {
  try {
    const settings = await chrome.storage.local.get([
      'isLoggedIn', 'apiBaseUrl', 'sessionToken', 'sessionEmail',
      'overlayEnabled', 'selectedChannelId'
    ]);

    if (!settings.isLoggedIn || !settings.sessionToken) {
      return;
    }

    const baseUrl = settings.apiBaseUrl || 'https://quick-reply.vercel.app';

    // Fetch comments that need review (matched + review status)
    const response = await fetch(baseUrl + '/api/comments?status=matched', {
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': settings.sessionToken,
        'X-Session-Email': settings.sessionEmail || ''
      },
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired
        await chrome.storage.local.set({
          isLoggedIn: false,
          sessionToken: null,
          sessionEmail: null
        });
        updateBadge(0);
        return;
      }
      return;
    }

    const comments = await response.json();
    const pendingCount = Array.isArray(comments) ? comments.length : 0;

    // Update badge
    updateBadge(pendingCount);

    // Store the count and timestamp
    await chrome.storage.local.set({
      lastCheckTime: new Date().toISOString(),
      pendingCommentCount: pendingCount
    });

  } catch (err) {
    // Network error or server down - clear badge
    updateBadge(0);
  }
}

/**
 * Update the extension badge with the pending comment count.
 */
function updateBadge(count) {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  const color = count > 0 ? '#FFD60A' : '#0038FF';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ─── Message Handler ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_COMMENTS_NOW':
      checkForNewComments().then(() => {
        chrome.storage.local.get(['pendingCommentCount']).then((data) => {
          sendResponse({ count: data.pendingCommentCount || 0 });
        });
      });
      return true; // async response

    case 'GET_AUTH_STATE':
      chrome.storage.local.get([
        'isLoggedIn', 'sessionToken', 'sessionEmail', 'selectedChannelId'
      ]).then((data) => {
        sendResponse({
          isLoggedIn: data.isLoggedIn || false,
          email: data.sessionEmail || null,
          channelId: data.selectedChannelId || null
        });
      });
      return true;

    case 'SET_AUTH':
      // Store auth data from popup or OAuth callback
      chrome.storage.local.set({
        isLoggedIn: true,
        sessionToken: message.token,
        sessionEmail: message.email,
        selectedChannelId: message.channelId || null
      }).then(() => {
        // Immediately check for comments after login
        checkForNewComments();
        sendResponse({ success: true });
      });
      return true;

    case 'CLEAR_AUTH':
      chrome.storage.local.set({
        isLoggedIn: false,
        sessionToken: null,
        sessionEmail: null,
        selectedChannelId: null
      }).then(() => {
        updateBadge(0);
        sendResponse({ success: true });
      });
      return true;

    case 'TOGGLE_OVERLAY':
      chrome.storage.local.set({
        overlayEnabled: message.enabled
      }).then(() => {
        // Notify all content scripts about the toggle
        chrome.tabs.query({
          url: ['https://studio.youtube.com/*', 'https://www.youtube.com/*']
        }).then((tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'OVERLAY_TOGGLE',
              enabled: message.enabled
            }).catch(() => {});
          }
        });
        sendResponse({ success: true });
      });
      return true;

    case 'GET_SETTINGS':
      chrome.storage.local.get(null).then((data) => {
        sendResponse(data);
      });
      return true;

    case 'SET_SELECTED_CHANNEL':
      chrome.storage.local.set({
        selectedChannelId: message.channelId
      }).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'CONTENT_SCRIPT_READY':
      // Content script is asking for current state
      chrome.storage.local.get([
        'overlayEnabled', 'isLoggedIn'
      ]).then((data) => {
        sendResponse({
          overlayEnabled: data.overlayEnabled !== false,
          isLoggedIn: data.isLoggedIn || false
        });
      });
      return true;

    case 'NEW_COMMENT_RECEIVED':
      // Forward SSE events from background to content scripts
      chrome.tabs.query({
        url: ['https://studio.youtube.com/*', 'https://www.youtube.com/*']
      }).then((tabs) => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'NEW_COMMENT',
            comment: message.comment
          }).catch(() => {});
        }
      });
      sendResponse({ forwarded: true });
      return false;

    case 'OPEN_DASHBOARD':
      chrome.tabs.create({
        url: message.url || 'https://quick-reply.vercel.app/dashboard'
      });
      sendResponse({ success: true });
      return false;

    case 'OPEN_AUTH':
      chrome.tabs.create({
        url: message.url || 'https://quick-reply.vercel.app/api/auth/google?login=true&state=extension'
      });
      sendResponse({ success: true });
      return false;
  }
});

// ─── SSE Connection (background-level) ───────────────────────────────

let sseConnection = null;
let sseReconnectTimer = null;

/**
 * Establish SSE connection for real-time updates.
 * Called after successful authentication.
 */
function connectBackgroundSSE() {
  disconnectBackgroundSSE();

  chrome.storage.local.get([
    'isLoggedIn', 'apiBaseUrl', 'sessionToken', 'sessionEmail'
  ]).then(async (settings) => {
    if (!settings.isLoggedIn || !settings.sessionToken) return;

    const base = settings.apiBaseUrl || 'https://quick-reply.vercel.app';
    const url = new URL(base + '/api/comments/stream');
    url.searchParams.set('token', settings.sessionToken);
    url.searchParams.set('email', settings.sessionEmail || '');

    try {
      sseConnection = new EventSource(url.toString());

      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            return; // Connection established
          }
          // Forward to content scripts
          chrome.runtime.sendMessage({
            type: 'NEW_COMMENT_RECEIVED',
            comment: data
          }).catch(() => {});
        } catch (_) {
          // Ignore malformed data
        }
      };

      sseConnection.onerror = () => {
        // Reconnect after 30 seconds
        sseReconnectTimer = setTimeout(connectBackgroundSSE, 30000);
      };
    } catch (_) {
      // Failed to connect
      sseReconnectTimer = setTimeout(connectBackgroundSSE, 60000);
    }
  });
}

function disconnectBackgroundSSE() {
  if (sseConnection) {
    sseConnection.close();
    sseConnection = null;
  }
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = null;
  }
}

// Start SSE when auth state changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.isLoggedIn) {
      if (changes.isLoggedIn.newValue) {
        connectBackgroundSSE();
      } else {
        disconnectBackgroundSSE();
      }
    }
  }
});

// Try to connect on startup if already logged in
chrome.storage.local.get(['isLoggedIn']).then((data) => {
  if (data.isLoggedIn) {
    connectBackgroundSSE();
  }
});
