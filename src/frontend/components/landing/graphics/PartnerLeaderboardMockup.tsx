"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Award,
  Sparkles,
  TrendingUp,
  Copy,
  Check,
  ArrowUpRight,
  Plus,
  DollarSign,
  Share2,
} from "lucide-react";

interface PartnerLeaderboardMockupProps {
  className?: string;
}

interface CreatorPartner {
  id: string;
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  tier: string;
  tierColor: string;
  code: string;
  discount: string;
  salesCount: number;
  conversionRate: string;
  gmv: number;
  commissionPaid: number;
  status: "paid" | "processing";
}

const CREATORS: CreatorPartner[] = [
  {
    id: "creator-1",
    rank: 1,
    name: "Riya Sharma",
    handle: "@riyastyle",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    tier: "Tier-1 Elite Partner",
    tierColor: "bg-amber-100 text-amber-800 border-amber-300",
    code: "RIYA20",
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
    name: "Aman Malhotra",
    handle: "@amansneaks",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    tier: "Ambassador",
    tierColor: "bg-purple-100 text-purple-800 border-purple-300",
    code: "AMAN15",
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
    name: "Priya Sundaram",
    handle: "@priyacurator",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    tier: "Pro Creator",
    tierColor: "bg-blue-100 text-blue-800 border-blue-300",
    code: "PRIYA10",
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
    name: "Vikram Sengupta",
    handle: "@vikramfits",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    tier: "Pro Creator",
    tierColor: "bg-blue-100 text-blue-800 border-blue-300",
    code: "VIKRAM10",
    discount: "10% OFF",
    salesCount: 72,
    conversionRate: "12.8%",
    gmv: 164000,
    commissionPaid: 16400,
    status: "processing",
  },
];

export function PartnerLeaderboardMockup({ className = "" }: PartnerLeaderboardMockupProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [creatorList, setCreatorList] = useState<CreatorPartner[]>(CREATORS);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCopy = (code: string) => {
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreatorName.trim()) return;

    const cleanName = newCreatorName.trim();
    const code = cleanName.toUpperCase().slice(0, 5) + "15";
    const newEntry: CreatorPartner = {
      id: `creator-${Date.now()}`,
      rank: creatorList.length + 1,
      name: cleanName,
      handle: `@${cleanName.toLowerCase().replace(/\s+/g, "_")}`,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
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

    setCreatorList([newEntry, ...creatorList]);
    setNewCreatorName("");
    setShowAddForm(false);
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#EE7D60] flex items-center justify-center">
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
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#EE7D60]" />
          <span>New Partner Link</span>
        </button>
      </div>

      {/* Add Partner Form Dropdown */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddCreator}
            className="mt-3 p-3 bg-[#FAF8F5] rounded-xl border border-black/10 flex items-center gap-2 flex-wrap"
          >
            <input
              type="text"
              value={newCreatorName}
              onChange={(e) => setNewCreatorName(e.target.value)}
              placeholder="Creator name (e.g. Natasha Rao)..."
              className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs font-medium focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Generate Coupon Code
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Leaderboard Table / Cards */}
      <div className="mt-3.5 space-y-2">
        {creatorList.map((creator) => (
          <div
            key={creator.id}
            className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5 hover:border-black/15 transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
          >
            {/* Left: Rank, Avatar, Creator Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-white border border-black/10 flex items-center justify-center font-black text-xs font-mono text-slate-700 shrink-0 shadow-2xs">
                #{creator.rank}
              </div>

              <img
                src={creator.avatar}
                alt={creator.name}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full object-cover border border-black/10 shadow-xs shrink-0"
              />

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
          <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
          <span>Automated Payouts via Razorpay / Stripe Connected Accounts</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-600">
          Average Creator ROI: 8.4x
        </span>
      </div>
    </div>
  );
}
