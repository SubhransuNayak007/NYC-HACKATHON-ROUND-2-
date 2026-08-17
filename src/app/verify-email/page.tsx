"use client";

import React, { Suspense } from "react";
import { EnterpriseVerifyForm } from "@/frontend/components/auth/EnterpriseVerifyForm";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f2f5]" />}>
      <EnterpriseVerifyForm />
    </Suspense>
  );
}
