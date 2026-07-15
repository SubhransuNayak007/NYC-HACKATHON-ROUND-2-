"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brand.config";
import ThemeToggle from "@/frontend/components/ThemeToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-[#FAF8F5]/90 dark:bg-[#050810]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] shadow-2xs py-3.5"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-zinc-950 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#111827] dark:text-[#F0F2F5]">
                {BRAND_CONFIG.name}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-mono">
                OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {BRAND_CONFIG.navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-[#111827] dark:hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center gap-3.5">
            <ThemeToggle size="sm" />

            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-2 text-[#111827] dark:text-[#F0F2F5] hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#111827] text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-slate-100 transition-all duration-150 shadow-xs group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-700 dark:text-slate-300 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#050810] px-4 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {BRAND_CONFIG.navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#111827] dark:hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-[#111827] dark:text-white bg-white dark:bg-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-xs font-bold bg-[#111827] text-white dark:bg-white dark:text-zinc-950"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
