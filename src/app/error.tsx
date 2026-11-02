"use client";

import React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--bg-primary, #070A12)", color: "var(--text-primary, #FFFFFF)" }}>
      <h2 className="text-2xl font-bold mb-3" style={{ color: "#E8B931" }}>
        Something went wrong
      </h2>
      <p className="text-sm max-w-md mb-6" style={{ color: "var(--text-secondary, #94A3B8)" }}>
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2.5 rounded-full font-bold text-sm"
        style={{ background: "#E8B931", color: "#070A12" }}
      >
        Try again
      </button>
    </div>
  );
}
