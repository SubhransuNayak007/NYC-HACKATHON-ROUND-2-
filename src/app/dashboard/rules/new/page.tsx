"use client";

import React from "react";
import RuleBuilderForm from "@/frontend/components/RuleBuilderForm";

export default function NewRulePage() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
          Configure Keyword Auto-Reply Rule
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Establish keywords, language filters, prioritization settings, and dynamic response variables.
        </p>
      </div>

      <RuleBuilderForm />
    </div>
  );
}
