"use client";

/**
 * ============================================================
 *  QuickReply — The Message Machine Master Experience
 *  src/frontend/components/auth/message-machine/MessageMachineExperience.tsx
 * ============================================================
 */

import React, { useReducer, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MM_CHANNELS, MM_COLORS } from "./tokens";
import { experienceReducer, ExperienceContext, AuthMode } from "./stateMachine";
import { PhysicsEngine } from "./physicsEngine";
import { detectDeviceCapabilities } from "./graphics/CapabilityDetector";
import { MessageMachineScene } from "./graphics/MessageMachineScene";
import { Fallback2DCanvas } from "./graphics/Fallback2DCanvas";
import { CustomCursorField } from "./interaction/CustomCursorField";
import { MagneticButton } from "./interaction/MagneticButton";
import { SemanticChannelNode } from "./nodes/SemanticChannelNode";
import { MessageFragments } from "./nodes/MessageFragments";
import { CleanAuthPanel } from "./auth-panel/CleanAuthPanel";

interface MessageMachineExperienceProps {
  initialMode?: AuthMode;
}

export function MessageMachineExperience({
  initialMode = "signup",
}: MessageMachineExperienceProps) {
  // 1. State Machine
  const [state, dispatch] = useReducer(experienceReducer, {
    state: "INTRO",
    authMode: initialMode,
    selectedChannel: null,
    introProgress: 0,
    hoveredElement: null,
    errorMessage: null,
  } as ExperienceContext);

  // 2. Hardware Capability Detection
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  // 3. Physics Engine Instance (Runs outside React state)
  const physics = useMemo(
    () => new PhysicsEngine(capabilities.particleCount),
    [capabilities.particleCount]
  );

  // 4. Intro Progression & Skip
  useEffect(() => {
    let startTime = performance.now();
    const duration = 2400; // 2.4s intro sequence

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      dispatch({ type: "INTRO_TICK", progress });

      if (progress < 1.0) {
        requestAnimationFrame(tick);
      } else {
        dispatch({ type: "INTRO_COMPLETE" });
      }
    };

    const animId = requestAnimationFrame(tick);

    // Skip on user interaction
    const handleEarlyInteract = () => {
      dispatch({ type: "SKIP_INTRO" });
    };

    window.addEventListener("keydown", handleEarlyInteract, { once: true });
    window.addEventListener("pointerdown", handleEarlyInteract, { once: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleEarlyInteract);
      window.removeEventListener("pointerdown", handleEarlyInteract);
    };
  }, []);

  // 5. Track Mouse in Physics Engine
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const normX = e.clientX - rect.left - centerX;
    const normY = e.clientY - rect.top - centerY;

    physics.updatePointer(normX, normY, true);
  };

  const handleMouseLeave = () => {
    physics.updatePointer(0, 0, false);
  };

  const isAuthOpen = state.state === "AUTH_PANEL" || state.state === "AUTHENTICATING";
  const contractionProgress = isAuthOpen ? 1.0 : state.state === "ENTERING" ? 0.6 : 0.0;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-screen h-screen overflow-hidden bg-[#F7F7F3] font-sans text-[#111111] antialiased select-none"
    >
      {/* ── Desktop Custom Cursor Layer ── */}
      <CustomCursorField isReducedMotion={capabilities.prefersReducedMotion} />

      {/* ── 3D / 2D Canvas Layer ── */}
      {capabilities.hasWebGL ? (
        <MessageMachineScene
          physics={physics}
          contractionProgress={contractionProgress}
          selectedChannel={state.selectedChannel}
          isReducedMotion={capabilities.prefersReducedMotion}
        />
      ) : (
        <Fallback2DCanvas
          physics={physics}
          contractionProgress={contractionProgress}
          isReducedMotion={capabilities.prefersReducedMotion}
        />
      )}

      {/* ── Message Fragments Typography Layer ── */}
      <MessageFragments physics={physics} contractionProgress={contractionProgress} />

      {/* ── Semantic Platform Channel Nodes ── */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {MM_CHANNELS.map((channel) => (
          <SemanticChannelNode
            key={channel.id}
            channel={channel}
            isSelected={state.selectedChannel === channel.id}
            onHover={(id) => dispatch({ type: "HOVER_CHANNEL", channelId: id })}
            onUnhover={() => dispatch({ type: "UNHOVER_CHANNEL" })}
            onClick={() => dispatch({ type: "TRIGGER_ENTER" })}
            contractionProgress={contractionProgress}
          />
        ))}
      </div>

      {/* ── Top Bar: Brand & System Status ── */}
      <header className="absolute top-0 left-0 right-0 p-6 sm:p-8 flex items-center justify-between z-30 pointer-events-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-4 h-4 bg-[#F3C515] rounded-xs group-hover:rotate-45 transition-transform duration-200" />
          <span className="font-mono text-xs font-bold tracking-widest text-[#111111]">
            QUICKREPLY
          </span>
        </Link>

        {/* Live Instrument Telemetry */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#6C6C65]">
          <span className="w-2 h-2 rounded-full bg-[#218A61] animate-pulse" />
          <span>NETWORK ONLINE</span>
        </div>
      </header>

      {/* ── Bottom Left: Editorial Statement (Fades smoothly when Auth is open) ── */}
      <div
        className={`absolute bottom-8 left-8 z-20 pointer-events-none transition-opacity duration-300 max-w-sm ${
          isAuthOpen ? "opacity-20" : "opacity-100"
        }`}
      >
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6C6C65]">
            SYSTEM CORE / KINETIC ROUTER
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] leading-[1.1]">
            THE INTERNET <br />
            DOESN&apos;T SLEEP.
          </h1>
          <p className="font-mono text-xs text-[#6C6C65] pt-1">
            EVERY MESSAGE HAS A RESPONSE.
          </p>
        </div>
      </div>

      {/* ── Bottom Right: Magnetic Entry Trigger ── */}
      {!isAuthOpen && (
        <div className="absolute bottom-8 right-8 z-30 pointer-events-auto">
          <MagneticButton
            onClick={() => dispatch({ type: "TRIGGER_ENTER" })}
            className="group px-6 py-3.5 bg-[#111111] hover:bg-[#F3C515] hover:text-[#111111] text-white rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-md shadow-black/10 flex items-center gap-2"
          >
            <span>ENTER QUICKREPLY</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </MagneticButton>
        </div>
      )}

      {/* ── Center: Clean Auth Panel (Revealed on Enter) ── */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-40 pointer-events-none">
        <AnimatePresence>
          {isAuthOpen && (
            <div className="pointer-events-auto">
              <CleanAuthPanel
                initialMode={state.authMode}
                onClose={() => dispatch({ type: "CLOSE_AUTH_PANEL" })}
                onSuccess={() => dispatch({ type: "AUTH_SUCCESS" })}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Subtle Texture Overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018] z-5"
        style={{
          backgroundImage:
            "radial-gradient(#111111 1px, transparent 1px), radial-gradient(#111111 1px, #F7F7F3 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
