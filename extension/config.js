/**
 * QuickReply Extension Configuration
 * Points to the deployed backend by default.
 * Override with chrome.storage for local development.
 */
const EXT_CONFIG = {
  // Production: deployed Vercel backend
  BACKEND_URL: "https://quick-reply.vercel.app",

  // Uncomment for local development:
  // BACKEND_URL: "http://localhost:3000",

  // Feature flags
  ENABLE_OVERLAY: true,
  ENABLE_AUTO_STATS: true,
  POLL_INTERVAL_MS: 30000,
};

// Allow runtime override via chrome.storage
if (typeof chrome !== "undefined" && chrome.storage?.local) {
  chrome.storage.local.get(["qr_backend_url"], (result) => {
    if (result.qr_backend_url) {
      EXT_CONFIG.BACKEND_URL = result.qr_backend_url;
    }
  });
}

// Export for use in other extension files
if (typeof module !== "undefined") {
  module.exports = EXT_CONFIG;
}
