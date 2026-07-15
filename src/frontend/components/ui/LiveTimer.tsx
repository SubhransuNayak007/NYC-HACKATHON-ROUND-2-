"use client";
import React, { useState, useEffect } from "react";

interface LiveTimerProps {
  startedAt: string; // ISO string
  className?: string;
}

export default function LiveTimer({ startedAt, className = "" }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    function update() {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s < 10 ? "0" : ""}${s}`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <span className={`font-mono text-[10px] font-semibold timer-pulse ${className}`}>
      · {elapsed}
    </span>
  );
}
