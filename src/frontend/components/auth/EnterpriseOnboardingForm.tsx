"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Check,
  Building2,
  Users,
  Briefcase,
  Loader2,
} from "lucide-react";
import { EnterpriseAuthLayout } from "./EnterpriseAuthLayout";

export function EnterpriseOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("Founder / CEO");
  const [companySize, setCompanySize] = useState("1-10");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    "whatsapp",
    "instagram",
  ]);
  const [primaryGoal, setPrimaryGoal] = useState("comment_to_dm");

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard");
    }
  };

  return (
    <EnterpriseAuthLayout
      headerRight={
        <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
          <span>Step {step} of 3</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* ── STEP 1: WORKSPACE & TEAM ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Set up your workspace
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Tell us a bit about your organization.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp AI"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Your Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option>Founder / CEO</option>
                  <option>Growth &amp; Marketing Lead</option>
                  <option>Customer Support Manager</option>
                  <option>Product / Technical Lead</option>
                  <option>Agency / Consultant</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Company Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["1-10", "11-50", "51-200", "200+"].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCompanySize(size)}
                      className={`h-10 rounded-xl text-xs font-semibold border transition-all ${
                        companySize === size
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: CONNECT CHANNELS ── */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Select your channels
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Which platforms would you like QuickReply to automate?
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: "whatsapp",
                  name: "WhatsApp Cloud & Web",
                  desc: "24/7 auto-replies, human handoff, campaign broadcasts",
                  badge: "Most Popular",
                },
                {
                  id: "instagram",
                  name: "Instagram Direct & Comments",
                  desc: "Comment-to-DM trigger flows, Story mention replies",
                  badge: "High Growth",
                },
                {
                  id: "youtube",
                  name: "YouTube Comments",
                  desc: "Instant comment monitoring and lead magnet delivery",
                  badge: "Video AI",
                },
              ].map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50/60 border-blue-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {ch.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{ch.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: AUTOMATION GOALS ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Choose primary AI goal
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  We&apos;ll configure your default agent workflows accordingly.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: "comment_to_dm",
                  title: "Auto Comment-to-DM & Lead Funnels",
                  desc: "Send download links, discount codes, or booking URLs when users comment keywords.",
                },
                {
                  id: "support_24_7",
                  title: "24/7 Autonomous Customer Support",
                  desc: "Answer product FAQs, track orders, and resolve inquiries with RAG knowledge base.",
                },
                {
                  id: "crm_qualification",
                  title: "Smart Lead Qualification & Routing",
                  desc: "Score incoming leads and route warm prospects to human account managers.",
                },
              ].map((goal) => {
                const isSelected = primaryGoal === goal.id;
                return (
                  <div
                    key={goal.id}
                    onClick={() => setPrimaryGoal(goal.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50/60 border-blue-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-slate-900">
                        {goal.title}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {goal.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Navigation CTA */}
        <div className="flex items-center gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Launching dashboard...</span>
              </>
            ) : (
              <>
                <span>{step === 3 ? "Complete & Launch Dashboard" : "Continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </EnterpriseAuthLayout>
  );
}
