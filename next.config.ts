import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
  // Request body size limit
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },

  // Remote image hosts for avatars/thumbnails (YouTube, Google, IG, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.ytimg.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.ggpht.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
      { protocol: "https", hostname: "*.vercel.app" },
    ],
  },

  // /login and /signup are thin client-side redirect shims — shortcut them
  // with a 307 server redirect so users land on /auth without a round-trip.
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/register",
        permanent: true,
      },
    ];
  },

  async headers() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const isProd = process.env.NODE_ENV === "production";

    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Additional CSP for API routes - no caching of sensitive data
        source: "/api/(.*)",
        headers: [
          ...securityHeaders,
          {
            key: "Access-Control-Allow-Origin",
            value: isProd ? appUrl : "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
      {
        // Allow WebSocket upgrade for Socket.io
        source: "/api/socketio",
        headers: [
          {
            key: "Connection",
            value: "Upgrade",
          },
          {
            key: "Upgrade",
            value: "websocket",
          },
        ],
      },
    ];
  },

  // Turbopack configuration
  turbopack: {},

  // Webpack config for Socket.io and BullMQ
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ioredis and bullmq from client bundle
      config.externals = config.externals || [];
      config.externals.push("ioredis", "bullmq");
    }
    return config;
  },
};

export default nextConfig;
