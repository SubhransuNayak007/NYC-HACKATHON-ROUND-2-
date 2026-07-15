"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AuthRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup" || mode === "register") {
      router.replace("/register");
    } else {
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#F5F6F0] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#EE7D60] border-t-transparent animate-spin" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F6F0]" />}>
      <AuthRedirect />
    </Suspense>
  );
}
