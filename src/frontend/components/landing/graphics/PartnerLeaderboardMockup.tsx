"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Sparkles,
  Copy,
  Check,
  Plus,
} from "lucide-react";

interface PartnerLeaderboardMockupProps {
  className?: string;
}

interface CreatorPartner {
  id: string;
  rank: number;
  name: string;
  handle: string;
  tier: string;
  tierColor: string;
  code: string;
  discount: string;
  salesCount: number;
  conversionRate: string;
  gmv: number;
  commissionPaid: number;
  status: "paid" | "processing";
  initials: string;
  accentBg: string;
}

const CREATORS: CreatorPartner[] = [
  {
    id: "creator-1",
    rank: 1,
    name: "Alex Rivera",
    handle: "@alexcreates",
    initials: "AR",
    accentBg: "bg-blue-600",
    tier: "Tier-1 Elite Partner",
    tierColor: "bg-blue-100 text-blue-800 border-blue-300",
    code: "ALEX20",
    discount: "20% OFF",
    salesCount: 214,
    conversionRate: "19.8%",
    gmv: 498000,
    commissionPaid: 74700,
    status: "paid",
  },
  {
    id: "creator-2",
    rank: 2,
    name: "Jordan Lee",
    handle: "@jordancommerce",
    initials: "JL",
    accentBg: "bg-purple-600",
    tier: "Ambassador",
    tierColor: "bg-purple-100 text-purple-800 border-purple-300",
    code: "JORDAN15",
    discount: "15% OFF",
    salesCount: 148,
    conversionRate: "16.4%",
    gmv: 342000,
    commissionPaid: 41040,
    status: "paid",
  },
  {
    id: "creator-3",
    rank: 3,
    name: "Taylor Kim",
    handle: "@taylorcurates",
    initials: "TK",
    accentBg: "bg-emerald-600",
    tier: "Pro Creator",
    tierColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    code: "TAYLOR10",
    discount: "10% OFF",
    salesCount: 96,
    conversionRate: "14.2%",
    gmv: 218000,
    commissionPaid: 21800,
    status: "paid",
  },
  {
    id: "creator-4",
    rank: 4,
    name: "Morgan Brooks",
    handle: "@morganfits",
    initials: "MB",
    accentBg: "bg-amber-600",
    tier: "Pro Creator",
    tierColor: "bg-amber-100 text-amber-800 border-amber-300",
    code: "MORGAN10",
    discount: "10% OFF",
    salesCount: 72,
    conversionRate: "12.8%",
    gmv: 164000,
    commissionPaid: 16400,
    status: "processing",
  },
];

const SESSION_STORAGE_KEY = "quickreply_partner_leaderboard";

export function PartnerLeaderboardMockup({ className = "" }: PartnerLeaderboardMockupProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [creatorList, setCreatorList] = useState<CreatorPartner[]>(CREATORS);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Hydrate from sessionStorage on client mount
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCreatorList(parsed);
        }
      }
    } catch {
      // ignore in restricted environments
    }
  }, []);

  const handleCopy = (code: string) => {
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = newCreatorName.trim();
    if (!cleanName) {
      setFormError("Creator name cannot be empty.");
      return;
    }
    if (cleanName.length > 30) {
      setFormError("Creator name must be 30 characters or fewer.");
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName)) {
      setFormError("Creator name should only contain letters and spaces.");
      return;
    }

    const firstNameOnly = cleanName.split(/\s+/)[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
    const code = (firstNameOnly.slice(0, 5) || "PARTNER") + "15";
    const initials =
      cleanName
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "CR";

    const newEntry: CreatorPartner = {
      id: `creator-${Date.now()}`,
      rank: 1,
      name: cleanName,
      handle: `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      initials,
      accentBg: "bg-indigo-600",
      tier: "New Creator",
      tierColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      code: code,
      discount: "15% OFF",
      salesCount: 1,
      conversionRate: "18.0%",
      gmv: 3499,
      commissionPaid: 524,
      status: "processing",
    };

    const updatedList = [newEntry, ...creatorList.map((c, idx) => ({ ...c, rank: idx + 2 }))];
    setCreatorList(updatedList);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    setNewCreatorName("");
    setShowAddForm(false);
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide flex items-center gap-2">
              <span>Creator Partner &amp; Affiliate Engine</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.2 rounded-full">
                ₹1,53,940 Paid
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Turn Influencers &amp; Loyal Buyers into Commission-Earning Brand Advocates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>New Partner Link</span>
        </button>
      </div>

      {/* Add Partner Form Dropdown */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <form
              onSubmit={handleAddCreator}
              className="p-3 bg-[#FAF8F5] rounded-xl border border-black/10 flex items-center gap-2 flex-wrap"
            >
              <input
                type="text"
                value={newCreatorName}
                maxLength={30}
                onChange={(e) => {
                  setNewCreatorName(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Creator name (e.g. Robin Vance)..."
                className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs font-medium focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Generate Coupon Code
              </button>
            </form>
            {formError && (
              <div className="mt-1 px-3 text-[11px] font-semibold text-rose-600">
                {formError}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Table / Cards */}
      <div className="mt-3.5 space-y-2">
        {creatorList.map((creator) => (
          <div
            key={creator.id}
            className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5 hover:border-black/15 transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
          >
            {/* Left: Rank, Abstract Vector Avatar, Creator Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-white border border-black/10 flex items-center justify-center font-black text-xs font-mono text-slate-700 shrink-0 shadow-2xs">
                #{creator.rank}
              </div>

              <div className={`w-10 h-10 rounded-full ${creator.accentBg} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-wider font-mono`}>
                {creator.initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h5 className="text-xs font-black text-[#161616] truncate">
                    {creator.name}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {creator.handle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-bold px-2 py-0.2 rounded-md border ${creator.tierColor}`}>
                    {creator.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Coupon Code Badge */}
            <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-black/10 shrink-0">
              <span className="text-xs font-mono font-black text-[#161616]">
                {creator.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(creator.code)}
                className="p-1 text-slate-400 hover:text-[#161616] transition-colors"
                title="Copy Coupon"
              >
                {copiedCode === creator.code ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Right: GMV & Commission Earnings */}
            <div className="text-right shrink-0">
              <div className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                ₹{creator.commissionPaid.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {creator.salesCount} Sales (₹{(creator.gmv / 1000).toFixed(0)}k GMV)
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Automated Payouts via Razorpay / Stripe Connected Accounts</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-600">
          Average Creator ROI: 8.4x
        </span>
      </div>
    </div>
  );
}
