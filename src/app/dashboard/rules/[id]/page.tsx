"use client";

import React, { use } from "react";
import RuleBuilderForm from "@/frontend/components/RuleBuilderForm";

export default function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
          Edit Auto-Reply Rule
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Modify the trigger conditions, priority badge, and reply templates for this rule.
        </p>
      </div>

      <RuleBuilderForm ruleId={id} />
    </div>
  );
}
