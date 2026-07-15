"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export type MascotMode = "idle" | "email_focused" | "password_focused" | "password_peeking" | "submitting" | "success";

interface InteractiveYetiMascotProps {
  mode?: MascotMode;
}

export function InteractiveYetiMascot({ mode = "idle" }: InteractiveYetiMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  // Raw mouse coordinates normalized from -1 to 1
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for natural follower latency
  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D Parallax tilt
  const rotateY = useTransform(smoothMouseX, [-1, 1], [-8, 8]);
  const rotateX = useTransform(smoothMouseY, [-1, 1], [6, -6]);

  // Pupil offsets (constrained within eyeball bounds)
  const pupilOffsetX = useTransform(smoothMouseX, [-1, 1], [-9, 9]);
  const pupilOffsetY = useTransform(smoothMouseY, [-1, 1], [-7, 7]);

  // Left & Right eye light reflections
  const glintOffsetX = useTransform(smoothMouseX, [-1, 1], [-3, 3]);
  const glintOffsetY = useTransform(smoothMouseY, [-1, 1], [-2, 2]);

  // Track global pointer movements
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.4; // Focus on face area

      // Normalized coordinates (-1 to 1)
      const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight / 2)));

      if (mode === "password_focused") {
        // Look away / down when covering eyes
        mouseX.set(0);
        mouseY.set(0.5);
      } else if (mode === "email_focused") {
        // Look toward the input field (right and slightly down)
        mouseX.set(0.65);
        mouseY.set(0.35);
      } else {
        mouseX.set(dx);
        mouseY.set(dy);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [mode, mouseX, mouseY]);

  // Natural spontaneous blinking cycle
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const scheduleBlink = () => {
      const delay = Math.random() * 3500 + 2500; // Blink every 2.5 - 6s
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 180);
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  const isCovering = mode === "password_focused";
  const isPeeking = mode === "password_peeking";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[480px] sm:min-h-[540px] rounded-[28px] overflow-hidden select-none flex flex-col justify-between"
      style={{
        background: "linear-gradient(180deg, #A2D2F2 0%, #C3E5F9 45%, #88C488 88%, #6CAE6C 100%)",
      }}
    >
      {/* ── Sunny Sky & Fluffy Cloud Layers ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sun Glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/40 blur-2xl" />
        
        {/* Soft Background Clouds */}
        <motion.div
          animate={{ x: [0, 15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-8 left-6 w-32 h-12 bg-white/70 rounded-full blur-[1px]"
        />
        <motion.div
          animate={{ x: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-4 w-44 h-16 bg-white/80 rounded-full blur-[1px]"
        />
        <div className="absolute top-24 -left-8 w-40 h-14 bg-white/60 rounded-full blur-xs" />

        {/* Rolling Grassy Hills in Background */}
        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#589B58] via-[#74BA74] to-transparent rounded-t-[50%] scale-125 opacity-90" />
        <div className="absolute -bottom-6 -right-10 w-64 h-36 bg-[#6BAF6B] rounded-t-full opacity-80" />
      </div>

      {/* ── Interactive Mascot Character ── */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center pt-8">
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            perspective: 1000,
          }}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-[300px] h-[340px] flex items-center justify-center"
        >
          {/* ══════════════════════════════════════════════════════════
              BASE HIGH-RESOLUTION 3D RENDER WITH DYNAMIC SVG EYE RIG
              ══════════════════════════════════════════════════════════ */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 3D Render Image Backdrop */}
            <img
              src="/assets/mascot/yeti_mascot.jpg"
              alt="Interactive Yeti Mascot"
              className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.22)] pointer-events-none"
            />

            {/* ── DYNAMIC EYE TRACKING OVERLAY ── */}
            {/* Positioned accurately over the 3D Yeti's face */}
            <div className="absolute top-[28.5%] left-[34%] w-[33%] h-[16%] flex items-center justify-between pointer-events-none">
              
              {/* LEFT EYE CONTAINER */}
              <div className="relative w-[38px] h-[38px] rounded-full bg-[#121820] flex items-center justify-center overflow-hidden shadow-inner">
                {/* Iris & Pupil that tracks mouse */}
                <motion.div
                  style={{
                    x: pupilOffsetX,
                    y: pupilOffsetY,
                  }}
                  className="relative w-[30px] h-[30px] rounded-full bg-[#0a0d14] flex items-center justify-center"
                >
                  {/* Outer Iris Ring */}
                  <div className="absolute inset-0 rounded-full border border-sky-400/30 bg-gradient-to-b from-[#182838] to-[#0a0d14]" />
                  {/* Pupil Center */}
                  <div className="w-[20px] h-[20px] rounded-full bg-[#000000]" />
                  {/* Glossy Glint Specular Highlight */}
                  <motion.div
                    style={{ x: glintOffsetX, y: glintOffsetY }}
                    className="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-white shadow-xs"
                  />
                  <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-white/70" />
                </motion.div>

                {/* Eyelid for Blinking & Closing */}
                <motion.div
                  animate={{
                    height: isCovering ? "100%" : isPeeking ? "40%" : isBlinking ? "100%" : "0%",
                  }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-0 inset-x-0 bg-[#A6D5F2] border-b-2 border-[#82B9DC] origin-top z-20"
                />
              </div>

              {/* RIGHT EYE CONTAINER */}
              <div className="relative w-[38px] h-[38px] rounded-full bg-[#121820] flex items-center justify-center overflow-hidden shadow-inner">
                {/* Iris & Pupil that tracks mouse */}
                <motion.div
                  style={{
                    x: pupilOffsetX,
                    y: pupilOffsetY,
                  }}
                  className="relative w-[30px] h-[30px] rounded-full bg-[#0a0d14] flex items-center justify-center"
                >
                  {/* Outer Iris Ring */}
                  <div className="absolute inset-0 rounded-full border border-sky-400/30 bg-gradient-to-b from-[#182838] to-[#0a0d14]" />
                  {/* Pupil Center */}
                  <div className="w-[20px] h-[20px] rounded-full bg-[#000000]" />
                  {/* Glossy Glint Specular Highlight */}
                  <motion.div
                    style={{ x: glintOffsetX, y: glintOffsetY }}
                    className="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-white shadow-xs"
                  />
                  <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-white/70" />
                </motion.div>

                {/* Eyelid for Blinking & Closing */}
                <motion.div
                  animate={{
                    height: isCovering ? "100%" : isPeeking ? "0%" : isBlinking ? "100%" : "0%",
                  }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-0 inset-x-0 bg-[#A6D5F2] border-b-2 border-[#82B9DC] origin-top z-20"
                />
              </div>
            </div>

            {/* ── SHY / PASSWORD COVERING PAWS ── */}
            <motion.div
              initial={false}
              animate={{
                opacity: isCovering ? 1 : isPeeking ? 0.85 : 0,
                y: isCovering ? 0 : isPeeking ? 18 : 60,
                scale: isCovering ? 1 : isPeeking ? 0.95 : 0.8,
              }}
              transition={{ type: "spring", damping: 20, stiffness: 140 }}
              className="absolute top-[26%] left-[28%] w-[44%] h-[26%] pointer-events-none z-30 flex items-center justify-between"
            >
              {/* Left Cute Fluffy Paw */}
              <div className="w-14 h-14 rounded-full bg-white border-2 border-[#D8EEF8] shadow-lg flex items-center justify-center -rotate-12">
                <div className="flex gap-1">
                  <div className="w-2.5 h-3 rounded-full bg-[#6EB8E4]" />
                  <div className="w-2.5 h-3.5 rounded-full bg-[#6EB8E4]" />
                  <div className="w-2.5 h-3 rounded-full bg-[#6EB8E4]" />
                </div>
              </div>

              {/* Right Cute Fluffy Paw */}
              <div className="w-14 h-14 rounded-full bg-white border-2 border-[#D8EEF8] shadow-lg flex items-center justify-center rotate-12">
                <div className="flex gap-1">
                  <div className="w-2.5 h-3 rounded-full bg-[#6EB8E4]" />
                  <div className="w-2.5 h-3.5 rounded-full bg-[#6EB8E4]" />
                  <div className="w-2.5 h-3 rounded-full bg-[#6EB8E4]" />
                </div>
              </div>
            </motion.div>

            {/* Blushing Cheeks when shy/peeking */}
            <motion.div
              animate={{
                opacity: isCovering || isPeeking ? 0.75 : 0.25,
                scale: isCovering || isPeeking ? 1.15 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="absolute top-[37%] left-[30%] w-[40%] flex justify-between pointer-events-none z-10"
            >
              <div className="w-5 h-3 rounded-full bg-[#FF8DA1] blur-[2px]" />
              <div className="w-5 h-3 rounded-full bg-[#FF8DA1] blur-[2px]" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Tracked Headline: EXPLORE. LEARN. GROW. ── */}
      <div className="relative z-10 p-6 sm:p-8">
        <h2 className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight drop-shadow-[0_3px_8px_rgba(0,0,0,0.35)] uppercase">
          EXPLORE.
          <br />
          <span className="tracking-tight">LEARN. GROW.</span>
        </h2>
      </div>
    </div>
  );
}
