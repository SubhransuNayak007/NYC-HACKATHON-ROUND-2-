"use client";

import React from "react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { MySamparkHero } from "@/frontend/components/landing/MySamparkHero";
import { SlidingCardsMarquee } from "@/frontend/components/landing/SlidingCardsMarquee";
import { MySamparkMarquee } from "@/frontend/components/landing/MySamparkMarquee";
import { MySamparkProblem } from "@/frontend/components/landing/MySamparkProblem";
import { MySamparkEverythingItDoes } from "@/frontend/components/landing/MySamparkEverythingItDoes";
import { MySamparkComparison } from "@/frontend/components/landing/MySamparkComparison";
import { MySamparkFourSteps } from "@/frontend/components/landing/MySamparkFourSteps";
import { MySamparkProofGrid } from "@/frontend/components/landing/MySamparkProofGrid";
import { MySamparkTestimonials } from "@/frontend/components/landing/MySamparkTestimonials";
import { MySamparkFAQ } from "@/frontend/components/landing/MySamparkFAQ";
import { MySamparkFinalCTA } from "@/frontend/components/landing/MySamparkFinalCTA";
import { MySamparkFooter } from "@/frontend/components/landing/MySamparkFooter";

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

        {/* 4. Omnichannel Logo Marquee */}
        <MySamparkMarquee />

        {/* 5. Editorial Problem -> Solution Highlight Pills */}
        <MySamparkProblem />

        {/* 6. Sequential 7-Story "EVERYTHING IT DOES" Showcase */}
        <MySamparkEverythingItDoes />

        {/* 7. Strategic Comparison Table */}
        <MySamparkComparison />

        {/* 8. Four Steps from Comment to Customer */}
        <MySamparkFourSteps />

        {/* 9. Real Questions, Real Answers, Real Sales Proof Grid */}
        <MySamparkProofGrid />

        {/* 10. Reviews & Testimonial Grid */}
        <MySamparkTestimonials />

        {/* 11. FAQ Accordion Grid */}
        <MySamparkFAQ />

        {/* 12. Final High-Converting CTA */}
        <MySamparkFinalCTA />
      </main>

      {/* 13. Editorial Footer */}
      <MySamparkFooter />
    </div>
  );
}
