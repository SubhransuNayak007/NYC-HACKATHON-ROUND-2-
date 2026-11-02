"use client";

/**
 * ============================================================
 *  QuickReply — Message Fragments Typography Layer
 *  src/frontend/components/auth/message-machine/nodes/MessageFragments.tsx
 * ============================================================
 */

import React, { useEffect, useState } from "react";
import { PhysicsEngine, MessageFragment } from "../physicsEngine";

interface MessageFragmentsProps {
  physics: PhysicsEngine;
  contractionProgress: number;
}

export function MessageFragments({
  physics,
  contractionProgress,
}: MessageFragmentsProps) {
  const [fragments, setFragments] = useState<MessageFragment[]>([]);

  useEffect(() => {
    let reqId: number;
    const sync = () => {
      setFragments([...physics.state.fragments]);
      reqId = requestAnimationFrame(sync);
    };
    reqId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(reqId);
  }, [physics]);

  if (contractionProgress > 0.4) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {fragments.map((frag) => (
        <div
          key={frag.id}
          className="absolute top-1/2 left-1/2 font-mono text-[10px] text-[#6C6C65] bg-white/70 backdrop-blur-2xs px-2 py-0.5 rounded border border-[#DFDFD7]/80 select-none shadow-2xs"
          style={{
            transform: `translate3d(${frag.x}px, ${frag.y}px, 0) translate(-50%, -50%)`,
            opacity: frag.life * (1.0 - contractionProgress * 2),
          }}
        >
          &ldquo;{frag.text}&rdquo;
        </div>
      ))}
    </div>
  );
}
