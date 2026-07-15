"use client";

import React from "react";
import ReviewInbox from "@/frontend/components/ReviewInbox";
import { AlertCircle, ShieldAlert } from "lucide-react";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6 text-left h-full relative">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-xl bg-volt-500/10 flex items-center justify-center">
          <ShieldAlert className="h-4 w-4 text-volt-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-800 tracking-tight">
            Human Review <span className="gradient-text-volt">Inbox</span>
          </h1>
        </div>
      </div>
      <p className="text-sm text-ink-500 mt-1 ml-12">
        These comments triggered rules but were flagged as ambiguous. Approve, edit, skip, or block before replies dispatch.
      </p>

      {/* Review Queue alert */}
      <div className="card-premium glass-card p-3.5 text-xs text-volt-700 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-volt-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Manual Review Required</span>
          Auto-replies in the review queue will not fire automatically. You must inspect them, edit drafts if necessary, and click &ldquo;Approve&rdquo; to dispatch.
        </div>
      </div>

      {/* Full-featured review inbox */}
      <ReviewInbox />
    </div>
  );
}
