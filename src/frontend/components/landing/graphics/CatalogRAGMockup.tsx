"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Database,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  FileCode,
  Tag,
  Boxes,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface CatalogRAGMockupProps {
  className?: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  warehouse: string;
  sizes: string[];
  image: string;
  specs: string;
  similarity: number;
  vectorId: string;
  verifiedSource: string;
}

const CATALOG_DATA: Record<string, CatalogProduct[]> = {
  running: [
    {
      id: "prod-1",
      name: "TrailPulse 360 Gore-Tex Pro",
      sku: "QR-SHOE-7718",
      category: "Performance Footwear",
      price: 8999,
      mrp: 11999,
      stock: 7,
      warehouse: "Mumbai Hub #2",
      sizes: ["UK 7", "UK 8", "UK 9", "UK 10"],
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80",
      specs: "Vibram Megagrip · Waterproof Gore-Tex · Ortholite Insole",
      similarity: 0.984,
      vectorId: "vec_dim1536_9882a",
      verifiedSource: "Shopify Sync #SH-9921",
    },
    {
      id: "prod-2",
      name: "AeroGlide Carbon Marathon Runner",
      sku: "QR-SHOE-3304",
      category: "Road Racing",
      price: 12499,
      mrp: 14999,
      stock: 3,
      warehouse: "Delhi Hub #1",
      sizes: ["UK 8", "UK 9", "UK 10"],
      image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&auto=format&fit=crop&q=80",
      specs: "Full Carbon Fiber Plate · PEBA Foam · 195g Ultralight",
      similarity: 0.942,
      vectorId: "vec_dim1536_4401b",
      verifiedSource: "Shopify Sync #SH-9921",
    },
  ],
  tee: [
    {
      id: "prod-3",
      name: "Heritage Washed Heavyweight Boxy Tee",
      sku: "QR-TEE-2291",
      category: "Streetwear Apparel",
      price: 1499,
      mrp: 2199,
      stock: 24,
      warehouse: "Bengaluru Hub #4",
      sizes: ["S", "M", "L", "XL"],
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80",
      specs: "280 GSM Organic Ring-Spun Cotton · Pigment Dye · Preshrunk",
      similarity: 0.991,
      vectorId: "vec_dim1536_1109c",
      verifiedSource: "WooCommerce API Sync",
    },
    {
      id: "prod-4",
      name: "Minimalist Drop-Shoulder Oversized Tee",
      sku: "QR-TEE-8840",
      category: "Streetwear Apparel",
      price: 1299,
      mrp: 1899,
      stock: 12,
      warehouse: "Mumbai Hub #1",
      sizes: ["M", "L", "XL"],
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&auto=format&fit=crop&q=80",
      specs: "240 GSM Combed Cotton · Double-Needle Stitching",
      similarity: 0.938,
      vectorId: "vec_dim1536_7722d",
      verifiedSource: "Catalog CSV Import",
    },
  ],
  audio: [
    {
      id: "prod-5",
      name: "Onyx Acoustic Pods Pro Active ANC",
      sku: "QR-AUD-4401",
      category: "Personal Audio",
      price: 4299,
      mrp: 6999,
      stock: 2,
      warehouse: "Delhi Hub #2",
      sizes: ["Matte Black", "Onyx Silver"],
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80",
      specs: "42dB Hybrid ANC · LDAC Hi-Res Audio · 36h Playback",
      similarity: 0.978,
      vectorId: "vec_dim1536_3392e",
      verifiedSource: "Shopify Sync #SH-9921",
    },
  ],
};

const SEARCH_PRESETS = [
  { label: "Waterproof running shoes", key: "running" },
  { label: "Heavyweight boxy cotton tee", key: "tee" },
  { label: "Active noise cancelling earbuds", key: "audio" },
];

export function CatalogRAGMockup({ className = "" }: CatalogRAGMockupProps) {
  const [activeQueryKey, setActiveQueryKey] = useState<string>("running");
  const [searchTerm, setSearchTerm] = useState("waterproof trail running shoes");
  const [activeTab, setActiveTab] = useState<"results" | "rag-vector">("results");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  const currentProducts = CATALOG_DATA[activeQueryKey] || CATALOG_DATA["running"];
  const activeProduct = currentProducts[selectedProductIndex] || currentProducts[0];

  const handleSelectPreset = (key: string, label: string) => {
    setActiveQueryKey(key);
    setSearchTerm(label);
    setSelectedProductIndex(0);
  };

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide">
              Live Product Knowledge Graph &amp; RAG
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Zero-Hallucination Vector Retrieval Grounded in Stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === "results"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-slate-600 hover:text-[#161616]"
            }`}
          >
            Storefront Catalog View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rag-vector")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "rag-vector"
                ? "bg-[#161616] text-white shadow-xs"
                : "text-slate-600 hover:text-[#161616]"
            }`}
          >
            <Cpu className="w-3 h-3 text-[#EE7D60]" />
            <span>Vector Payload</span>
          </button>
        </div>
      </div>

      {/* Interactive Search Bar & Chips */}
      <div className="mt-4 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search catalog with natural language or customer questions..."
            className="w-full pl-10 pr-24 py-2.5 bg-[#FAF8F5] border border-black/10 rounded-xl text-xs font-medium text-[#161616] focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
            1536-dim
          </span>
        </div>

        {/* Preset Query Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Example Queries:
          </span>
          {SEARCH_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handleSelectPreset(p.key, p.label)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium ${
                activeQueryKey === p.key
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* RAG Engine Engine Metrics Banner */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F5F8FC] p-3 rounded-xl border border-blue-100 text-[11px]">
        <div>
          <span className="text-slate-500 text-[10px] font-medium block">Vector Similarity</span>
          <span className="font-bold text-blue-700 font-mono text-xs">
            {(activeProduct.similarity * 100).toFixed(1)}% Cosine Match
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] font-medium block">Retrieval Latency</span>
          <span className="font-bold text-emerald-600 font-mono text-xs">18ms (Cache Hit)</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] font-medium block">Hallucination Guard</span>
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            100% Grounded
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] font-medium block">Catalog Sync</span>
          <span className="font-bold text-purple-700 text-xs truncate block">
            {activeProduct.verifiedSource}
          </span>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="mt-4">
        {activeTab === "results" ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Product List (5 cols) */}
            <div className="md:col-span-5 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                Top Vector Matches ({currentProducts.length})
              </div>
              {currentProducts.map((prod, idx) => (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    selectedProductIndex === idx
                      ? "bg-[#FAF8F5] border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-black/5 hover:border-black/20"
                  }`}
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-lg object-cover border border-black/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[#161616] truncate">
                        {prod.name}
                      </h5>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded font-mono">
                        {(prod.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                      ₹{prod.price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${prod.stock > 5 ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span>{prod.stock} units available</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Details & Verified Fact Card (7 cols) */}
            <div className="md:col-span-7 bg-[#FAF8F5] p-4 rounded-xl border border-black/5 space-y-3">
              <div className="flex items-start gap-3">
                <img
                  src={activeProduct.image}
                  alt={activeProduct.name}
                  loading="lazy"
                  decoding="async"
                  className="w-20 h-20 rounded-xl object-cover border border-black/10 shadow-xs shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                      {activeProduct.sku}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Verified Catalog Match
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#161616] leading-tight">
                    {activeProduct.name}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-emerald-600 font-mono">
                      ₹{activeProduct.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      ₹{activeProduct.mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] font-bold text-[#EE7D60]">
                      {Math.round(((activeProduct.mrp - activeProduct.price) / activeProduct.mrp) * 100)}% OFF
                    </span>
                  </div>
                </div>
              </div>

              {/* SKU Specs & Warehouse Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-white border border-black/5">
                  <span className="text-slate-500 text-[10px] block font-medium">Stock Status</span>
                  <span className="font-bold text-emerald-700">
                    🟢 {activeProduct.stock} Units ({activeProduct.warehouse})
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-black/5">
                  <span className="text-slate-500 text-[10px] block font-medium">Available Sizes / Variants</span>
                  <span className="font-bold text-slate-800">
                    {activeProduct.sizes.join(", ")}
                  </span>
                </div>
              </div>

              {/* Verified AI Explanation Box */}
              <div className="p-2.5 rounded-xl bg-white border border-black/5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                  <Sparkles className="w-3 h-3 text-[#EE7D60]" />
                  <span>How QuickReply Answers Customer:</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  &quot;Yes! The <strong>{activeProduct.name}</strong> is in stock in sizes {activeProduct.sizes.join(", ")} at ₹{activeProduct.price.toLocaleString("en-IN")} with {activeProduct.specs}. Dispatches today from our {activeProduct.warehouse}!&quot;
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Vector RAG JSON & Embedding Inspector */
          <div className="bg-[#161616] text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[10px] pb-2 border-b border-white/10">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <FileCode className="w-3.5 h-3.5" />
                Pinecone / PGVector Semantic Payload
              </span>
              <span>Model: text-embedding-3-small</span>
            </div>
            <pre className="overflow-x-auto text-emerald-300/90 leading-relaxed text-[10px]">
{`{
  "query": "${searchTerm}",
  "vector_id": "${activeProduct.vectorId}",
  "cosine_similarity": ${activeProduct.similarity},
  "grounded_attributes": {
    "sku": "${activeProduct.sku}",
    "title": "${activeProduct.name}",
    "price_inr": ${activeProduct.price},
    "stock_verified": ${activeProduct.stock},
    "warehouse_location": "${activeProduct.warehouse}",
    "variants": ${JSON.stringify(activeProduct.sizes)},
    "specs": "${activeProduct.specs}"
  },
  "guardrail_status": "PASSED_ZERO_HALLUCINATION_GATEWAY",
  "rag_context_tokens": 142
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
