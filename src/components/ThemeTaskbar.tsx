"use client";

import ThemeToggle from "@/frontend/components/ThemeToggle";

export default function ThemeTaskbar() {
  return (
    <div className="fixed top-5 right-6 z-[99999] flex items-center">
      <ThemeToggle size="md" />
    </div>
  );
}