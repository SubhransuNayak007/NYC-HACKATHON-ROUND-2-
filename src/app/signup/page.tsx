"use client";

import React, { Suspense } from "react";
import { UnifiedAuthExperience } from "@/frontend/components/auth/UnifiedAuthExperience";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f2f5]" />}>
      <UnifiedAuthExperience initialMode="signup" />
    </Suspense>
  );
}
