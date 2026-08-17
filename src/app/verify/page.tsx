"use client";

import React, { Suspense } from "react";
import { UnifiedAuthExperience } from "@/frontend/components/auth/UnifiedAuthExperience";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f2f5]" />}>
      <UnifiedAuthExperience initialMode="verify" />
    </Suspense>
  );
}
