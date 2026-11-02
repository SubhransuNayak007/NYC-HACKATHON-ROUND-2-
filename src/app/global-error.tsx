"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "40px", fontFamily: "sans-serif", background: "#070A12", color: "#FFFFFF" }}>
        <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "16px", color: "#E8B931" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#94A3B8", marginBottom: "24px" }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 28px",
              borderRadius: "9999px",
              background: "#E8B931",
              color: "#070A12",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
