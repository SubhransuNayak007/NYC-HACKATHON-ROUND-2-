"use client";

/**
 * ============================================================================
 *  QuickReply — 3D Studio Mockup (High-Precision 120Hz/240Hz Compositor Engine)
 *  src/frontend/components/auth/StudioMockupIllustration.tsx
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { bindCompositorTilt } from "@/frontend/lib/motion/PointerTracker";

export interface StudioMockupIllustrationProps {
  isTyping?: boolean;
}

export function StudioMockupIllustration({
  isTyping = false,
}: StudioMockupIllustrationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeColor, setActiveColor] = useState("#5B4DF5");
  const [blink, setBlink] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Bind zero-React-render Compositor Motion Engine
  useEffect(() => {
    const container = containerRef.current;
    const tilt = tiltRef.current;
    if (!container || !tilt) return;

    const unbind = bindCompositorTilt(container, tilt, {
      maxRotateX: 7,
      maxRotateY: 9,
      maxTranslateZ: 8,
    });

    return () => unbind();
  }, []);

  // Periodic blinking eye animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[480px] h-[370px] flex items-center justify-center select-none transform-gpu"
    >
      {/* ── Background Soft Pastel Concentric Rings & Geometry ── */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full border border-pink-200/40 pointer-events-none -z-10" />
      <div className="absolute top-2 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#FFAAA6]/50 to-[#FF8E88]/40 pointer-events-none shadow-sm -z-10" />
      <div className="absolute bottom-2 left-8 w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD3B6]/50 to-[#FFB7B2]/40 pointer-events-none -z-10" />

      {/* ── 3D Hardware Accelerated Tilt Stage ── */}
      <div
        ref={tiltRef}
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        className="relative z-10 w-full flex items-center justify-center transition-transform duration-75"
      >
        {/* ── Main 3D Desktop Monitor ── */}
        <div className="relative z-10 w-[324px] h-[218px] bg-white rounded-[24px] border-[5px] border-[#E8EEF5] shadow-[0_24px_50px_-12px_rgba(80,100,150,0.22),0_6px_0_#D1DCED] flex flex-col overflow-hidden">
          
          {/* Top Window Bezel Bar */}
          <div className="h-6.5 bg-[#F4F7FC] border-b border-[#E2E8F0] px-3.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-2xs hover:scale-110 transition-transform cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-2xs hover:scale-110 transition-transform cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-2xs hover:scale-110 transition-transform cursor-pointer" />
            </div>
            <div className="w-28 h-3 bg-white rounded-full border border-slate-200 shadow-inner flex items-center px-2">
              <span className="text-[8px] font-mono text-slate-400 font-bold">quickreply.ai</span>
            </div>
            <div className="w-3" />
          </div>

          {/* Screen Content: QuickReply AI Chat Automation Canvas */}
          <div className="flex-1 bg-[#FAFBFE] p-3 flex flex-col justify-between relative overflow-hidden">
            
            {/* Interactive Upper Tools and Canvas */}
            <div className="flex gap-2.5 items-start">
              
              {/* Interactive Palette Card */}
              <div className="w-16 h-21 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-1.5 flex flex-col items-center justify-center gap-1 cursor-pointer group hover:scale-[1.03] transition-transform">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveColor("#FF8E72")}
                    className="w-3.5 h-3.5 rounded-full bg-[#FF8E72] shadow-xs hover:scale-125 transition-transform"
                    title="Coral"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveColor("#FFC75F")}
                    className="w-3.5 h-3.5 rounded-full bg-[#FFC75F] shadow-xs hover:scale-125 transition-transform"
                    title="Gold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveColor("#5B4DF5")}
                  className="w-3.5 h-3.5 rounded-full bg-[#5B4DF5] shadow-xs hover:scale-125 transition-transform"
                  title="Indigo"
                />
                <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-tighter group-hover:text-indigo-600 transition-colors">
                  AI AGENT
                </span>
              </div>

              {/* 3D Color Dropper Tool */}
              <div className="w-6 h-10 rounded-full bg-slate-900 shadow-md flex items-center justify-center text-white -rotate-12 -mt-1 shadow-slate-900/30">
                <div
                  className="w-2 h-3.5 rounded-xs transition-colors duration-200"
                  style={{ backgroundColor: activeColor }}
                />
              </div>

              {/* Active Automation Rule Card */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-2 bg-indigo-100 rounded-full" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                
                <div className="space-y-1">
                  <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                  {isTyping && (
                    <div className="h-2 w-4/5 bg-indigo-200 rounded-full animate-pulse" />
                  )}
                </div>

                <div
                  className="h-4.5 w-full rounded-lg flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition-all"
                  style={{ backgroundColor: activeColor }}
                >
                  <span className="text-[8px] text-white font-bold tracking-tight">
                    {isPlaying ? "▶ Broadcasting Active" : "⚡ Auto-Reply Trigger"}
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Selection Node with Typography Badge */}
            <div className="flex items-center justify-between pt-1">
              <div className="p-1 px-2.5 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/70 flex items-center gap-1.5 shadow-2xs">
                <span className="text-xs font-black text-indigo-700 font-serif">Aa</span>
                <span className="text-[9px] font-mono font-bold text-indigo-600">Neural RAG</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-mono font-extrabold text-emerald-700">99.4% MATCH</span>
              </div>
            </div>

          </div>

        </div>

        {/* ── Monitor Stand Base ── */}
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-14 h-9 bg-[#E2E8F0] shadow-sm rounded-b-md" />
        <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-24 h-3 bg-[#D4DEEC] rounded-full shadow-md" />

        {/* ── Floating 3D Video Player Card ── */}
        <div className="absolute top-2 right-1 z-20 w-[100px] h-[120px] bg-white rounded-2xl border-[3.5px] border-[#F1F5F9] shadow-[0_16px_30px_-6px_rgba(0,0,0,0.14),0_4px_0_#CBD5E1] p-2 flex flex-col items-center justify-between hover:-translate-y-1 transition-transform">
          <div className="w-full h-15 bg-gradient-to-br from-[#FFAAA6] via-[#FF9292] to-[#FF7575] rounded-xl flex items-center justify-center shadow-xs relative overflow-hidden">
            {isPlaying && (
              <div className="absolute inset-0 bg-white/30 rounded-xl animate-pulse" />
            )}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-7 h-7 rounded-full bg-white/95 shadow-md flex items-center justify-center pl-0.5 cursor-pointer z-10 hover:scale-110 active:scale-95 transition-transform"
              title="Click to play demo"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-[#FF6B6B] fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 text-[#FF6B6B] fill-current" />
              )}
            </button>
          </div>
          <div className="w-full space-y-1">
            <div className="w-full h-2 bg-[#FFD3B6] rounded-full" />
            <div className="w-2/3 h-1.5 bg-slate-100 rounded-full mx-auto" />
          </div>
        </div>

        {/* ── Floating Backing Card Behind Video ── */}
        <div className="absolute top-0 right-6 z-15 w-[90px] h-[110px] bg-[#F8FAFC] rounded-2xl border-2 border-slate-200 shadow-sm -rotate-6 pointer-events-none" />

        {/* ── 3D Miniature Keyboard in Front ── */}
        <div className="absolute bottom-1 left-9 z-25 w-[145px] h-[36px] bg-white rounded-xl border-2 border-slate-200 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.12),0_3px_0_#CBD5E1] p-1.5 flex flex-col justify-between">
          <div className="grid grid-cols-8 gap-0.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-[2px] border border-slate-200 shadow-2xs transition-colors duration-150 ${
                  isTyping && i % 4 === 0 ? "bg-indigo-400" : "bg-slate-100"
                }`}
              />
            ))}
          </div>
          <div
            className="w-14 h-2 rounded-full mx-auto shadow-xs transition-colors duration-200"
            style={{ backgroundColor: activeColor }}
          />
        </div>

        {/* ── 3D Camera / Eye Sensor ── */}
        <div className="absolute bottom-0 right-13 z-25 w-[68px] h-[58px] bg-white rounded-2xl border-[3.5px] border-[#F1F5F9] shadow-[0_14px_28px_-6px_rgba(0,0,0,0.14),0_3px_0_#CBD5E1] p-2 flex flex-col items-center justify-between cursor-pointer hover:scale-105 transition-transform">
          <div className="w-3.5 h-1.5 bg-[#FF8B8B] rounded-t-sm -mt-2.5 shadow-2xs" />
          
          <div className="w-7.5 h-7.5 rounded-full bg-slate-900 border-2 border-slate-300 flex items-center justify-center shadow-inner relative overflow-hidden">
            <div
              className={`w-3.5 h-3.5 rounded-full shadow-xs flex items-center justify-center transition-all duration-150 ${
                blink ? "scale-y-10" : "scale-y-100"
              }`}
              style={{ backgroundColor: activeColor }}
            >
              <div className="w-1 h-1 bg-white rounded-full -mt-1 -ml-1" />
            </div>
          </div>

          <div className="w-2 h-2 rounded-full bg-amber-400 self-end -mr-0.5 shadow-2xs" />
        </div>

      </div>

    </div>
  );
}

export default StudioMockupIllustration;
