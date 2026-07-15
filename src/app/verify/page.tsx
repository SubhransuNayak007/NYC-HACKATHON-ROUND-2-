"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import ThemeToggle from "@/frontend/components/ThemeToggle";
import { OTPVerification } from "@/frontend/components/auth/OTPVerification";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your-email@example.com";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] dark:bg-[#0A0A0B] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="w-4 h-4 text-white dark:text-zinc-950 fill-current" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            {BRAND_CONFIG.name}
          </span>
        </Link>
        <ThemeToggle size="sm" />
      </div>

      {/* Centered Card */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs">
          <OTPVerification
            email={email}
            onSuccess={() => {
              router.push("/dashboard");
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-[1200px] w-full mx-auto text-center text-[11px] text-zinc-400">
        Need assistance?{" "}
        <a href="mailto:subhransu.nayak.418@gmail.com" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          Contact support
        </a>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0A0A0B]" />}>
      <VerifyContent />
    </Suspense>
  );
}
