/**
 * QuickReply API Client
 * Shared module for communicating with the QuickReply backend.
 * Loaded in content scripts and popup context.
 */
const QuickReplyAPI = (() => {
  // Configurable base URL — defaults to the deployed backend
  let _baseUrl = 'https://quick-reply.vercel.app';

  /**
   * Get the configured backend base URL from storage, or use default.
   */
  async function getBaseUrl() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['apiBaseUrl', 'qr_backend_url']);
        // `apiBaseUrl` (legacy) or `qr_backend_url` (popup Advanced Settings) both work
        if (result.apiBaseUrl) {
          _baseUrl = result.apiBaseUrl;
        } else if (result.qr_backend_url) {
          _baseUrl = result.qr_backend_url;
        }
      }
    } catch (_) {
      // storage not available, use default
    }
    return _baseUrl;
  }

  /**
   * Override the base URL at runtime.
   */
  function setBaseUrl(url) {
    _baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * Get the stored session token from chrome.storage.local.
   * Returns null if not found.
   */
  async function getSessionToken() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['sessionToken', 'sessionEmail']);
        if (result.sessionToken) {
          return {
            token: result.sessionToken,
            email: result.sessionEmail || ''
          };
        }
      }
    } catch (_) {
      // storage not available
    }
    return null;
  }

  /**
   * Store session credentials in chrome.storage.local.
   */
  async function setSession(token, email) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        sessionToken: token,
        sessionEmail: email,
        isLoggedIn: true
      });
    }
  }

  /**
   * Clear session data from storage.
   */
  async function clearSession() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove([
        'sessionToken', 'sessionEmail', 'isLoggedIn'
      ]);
    }
  }

  /**
   * Check if user is currently logged in.
   */
  async function isLoggedIn() {
    const session = await getSessionToken();
    return session !== null;
  }

  /**
   * Internal fetch wrapper that adds auth headers and handles errors.
   */
  async function request(path, options = {}) {
    const base = await getBaseUrl();
    const session = await getSessionToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth cookie-like header if we have a session
    if (session && session.token) {
      // The backend uses httpOnly cookies for auth, so we pass via header
      // as a fallback for the extension context
      headers['X-Session-Token'] = session.token;
      headers['X-Session-Email'] = session.email;
    }

    const url = base + path;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // send cookies if available
      });

      // Handle auth errors
      if (response.status === 401) {
        // Session expired or invalid
        await clearSession();
        // Notify any listeners about auth failure
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'AUTH_EXPIRED'
          }).catch(() => {});
        }
        throw new APIError('Authentication expired. Please log in again.', 401);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new APIError(
          errorBody.error || `Request failed with status ${response.status}`,
          response.status
        );
      }

      // Handle empty responses (e.g., 204 No Content)
      const text = await response.text();
      if (!text) return null;

      return JSON.parse(text);
    } catch (err) {
      if (err instanceof APIError) throw err;
      // Network error
      throw new APIError(
        'Unable to connect to QuickReply server. Is it running?',
        0
      );
    }
  }

  /**
   * Custom error class for API errors.
   */
  class APIError extends Error {
    constructor(message, status) {
      super(message);
      this.name = 'APIError';
      this.status = status;
    }
  }

  // ─── Public API Methods ────────────────────────────────────────────

  /**
   * Fetch comments, optionally filtered by status.
   * @param {string} [channelId] - Optional channel ID to filter by
   * @param {string} [status] - Optional status filter: 'matched', 'review', 'replied', 'skipped'
   * @returns {Promise<Array>} Array of comment objects
   */
  async function fetchComments(channelId, status) {
    let path = '/api/comments';
    const params = [];

    if (status) {
      params.push('status=' + encodeURIComponent(status));
    }

    if (params.length > 0) {
      path += '?' + params.join('&');
    }

    const comments = await request(path, { method: 'GET' });

    // Optionally filter by channelId client-side since the API doesn't support it yet
    if (channelId && Array.isArray(comments)) {
      return comments.filter(c => c.channelId === channelId);
    }

    return comments || [];
  }

  /**
   * Send a reply to a comment.
   * @param {string} commentId - The comment ID
   * @param {string} text - The reply text
   * @returns {Promise<Object>} Updated comment object
   */
  async function sendReply(commentId, text) {
    return request(`/api/comments/${encodeURIComponent(commentId)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ autoReplyText: text })
    });
  }

  /**
   * Skip a comment (dismiss without replying).
   * @param {string} commentId - The comment ID
   * @returns {Promise<Object>} Updated comment object
   */
  async function skipComment(commentId) {
    return request(`/api/comments/${encodeURIComponent(commentId)}/skip`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  /**
   * Block a comment author and skip all their comments.
   * @param {string} commentId - The comment ID
   * @returns {Promise<Object>} Updated comment object
   */
  async function blockComment(commentId) {
    return request(`/api/comments/${encodeURIComponent(commentId)}/block`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  /**
   * Generate an AI reply for a comment.
   * Uses the backend AI endpoint (Anthropic Claude).
   * @param {Object} comment - The comment object (needs at least id, text, author)
   * @returns {Promise<Object>} { replyText, sentiment, language, confidence }
   */
  async function generateAIReply(comment) {
    return request('/api/ai/generate-reply', {
      method: 'POST',
      body: JSON.stringify({
        commentId: comment.id,
        commentText: comment.text,
        author: comment.author,
        videoTitle: comment.videoTitle,
        channelId: comment.channelId
      })
    });
  }

  /**
   * Connect to the SSE stream for real-time comment updates.
   * Falls back to null if the browser doesn't support EventSource with credentials.
   *
   * @param {Function} onComment - Callback fired with each comment event
   * @param {Function} [onConnect] - Callback fired on connection established
   * @param {Function} [onError] - Callback fired on connection error
   * @returns {EventSource|null}
   */
  async function connectSSE(onComment, onConnect, onError) {
    const base = await getBaseUrl();
    const session = await getSessionToken();

    if (!session) {
      if (onError) onError(new Error('Not logged in'));
      return null;
    }

    // Build URL with session info as query params since EventSource
    // can't send custom headers
    const url = new URL(base + '/api/comments/stream');
    url.searchParams.set('token', session.token);
    url.searchParams.set('email', session.email);

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          if (onConnect) onConnect(data);
          return;
        }
        if (onComment) onComment(data);
      } catch (_) {
        // Malformed data, ignore
      }
    };

    eventSource.onerror = (event) => {
      if (onError) onError(event);
    };

    return eventSource;
  }

  /**
   * Fetch channels from the backend.
   * @returns {Promise<Array>} Array of channel objects
   */
  async function fetchChannels() {
    return request('/api/channels', { method: 'GET' });
  }

  /**
   * Fetch today's usage stats.
   * @returns {Promise<Object>} { used, limit, remaining, tier }
   */
  async function fetchUsage() {
    return request('/api/usage/today', { method: 'GET' });
  }

  /**
   * Fetch active rules.
   * @returns {Promise<Array>} Array of rule objects
   */
  async function fetchRules() {
    return request('/api/rules', { method: 'GET' });
  }

  // ─── Expose public API ─────────────────────────────────────────────

  return {
    getBaseUrl,
    setBaseUrl,
    getSessionToken,
    setSession,
    clearSession,
    isLoggedIn,
    fetchComments,
    sendReply,
    skipComment,
    blockComment,
    generateAIReply,
    connectSSE,
    fetchChannels,
    fetchUsage,
    fetchRules,
    APIError
  };
})();

// Make available in both content script and service worker contexts
if (typeof globalThis !== 'undefined') {
  globalThis.QuickReplyAPI = QuickReplyAPI;
}
