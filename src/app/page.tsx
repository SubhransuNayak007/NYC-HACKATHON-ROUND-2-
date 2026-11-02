"use client";

import React from "react";
import dynamic from "next/dynamic";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkHero } from "@/frontend/components/landing/MySamparkHero";
import { SlidingCardsMarquee } from "@/frontend/components/landing/SlidingCardsMarquee";
import { MySamparkMarquee } from "@/frontend/components/landing/MySamparkMarquee";
import { MySamparkProblem } from "@/frontend/components/landing/MySamparkProblem";

// Code-split below-the-fold heavy modules to maximize LCP and minimize initial bundle
const MySamparkEverythingItDoes = dynamic(
  () => import("@/frontend/components/landing/MySamparkEverythingItDoes").then((mod) => mod.MySamparkEverythingItDoes)
);
const MySamparkComparison = dynamic(
  () => import("@/frontend/components/landing/MySamparkComparison").then((mod) => mod.MySamparkComparison)
);
const MySamparkFourSteps = dynamic(
  () => import("@/frontend/components/landing/MySamparkFourSteps").then((mod) => mod.MySamparkFourSteps)
);
const MySamparkProofGrid = dynamic(
  () => import("@/frontend/components/landing/MySamparkProofGrid").then((mod) => mod.MySamparkProofGrid)
);
const MySamparkTestimonials = dynamic(
  () => import("@/frontend/components/landing/MySamparkTestimonials").then((mod) => mod.MySamparkTestimonials)
);
const MySamparkFAQ = dynamic(
  () => import("@/frontend/components/landing/MySamparkFAQ").then((mod) => mod.MySamparkFAQ)
);
const MySamparkFinalCTA = dynamic(
  () => import("@/frontend/components/landing/MySamparkFinalCTA").then((mod) => mod.MySamparkFinalCTA)
);
const MySamparkFooter = dynamic(
  () => import("@/frontend/components/landing/MySamparkFooter").then((mod) => mod.MySamparkFooter)
);

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F0] text-[#161616] selection:bg-[#EE7D60]/20 font-sans">
      {/* 1. Header with Top Attached Tab & Inverted Corner Wings */}
      <MySamparkHeader />

      <main className="flex-1">
        {/* 2. Hero with Word Cycle Animation & 4 Tilted Mockup Display Cards */}
        <MySamparkHero />

        {/* 3. Bi-Directional Sliding Cards Suite */}
        <SlidingCardsMarquee />

        {/* 5. Omnichannel Logo Marquee */}
        <MySamparkMarquee />

        {/* 6. Editorial Problem -> Solution Highlight Pills */}
        <MySamparkProblem />

        {/* 7. Sequential 7-Story "EVERYTHING IT DOES" Showcase */}
        <MySamparkEverythingItDoes />

        {/* 8. Strategic Comparison Table */}
        <MySamparkComparison />

        {/* 9. Four Steps from Comment to Customer */}
        <MySamparkFourSteps />

        {/* 10. Real Questions, Real Answers, Real Sales Proof Grid */}
        <MySamparkProofGrid />

        {/* 11. Reviews & Testimonial Grid */}
        <MySamparkTestimonials />

        {/* 12. FAQ Accordion Grid */}
        <MySamparkFAQ />

        {/* 13. Final High-Converting CTA */}
        <MySamparkFinalCTA />
      </main>

      {/* 14. Editorial Footer */}
      <MySamparkFooter />
    </div>
  );
}
