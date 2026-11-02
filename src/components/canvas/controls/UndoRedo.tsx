"use client";

import React, { useEffect } from "react";
import { Undo2, Redo2 } from "lucide-react";

export interface UndoRedoProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  pastCount?: number;
  futureCount?: number;
}

export const UndoRedo: React.FC<UndoRedoProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pastCount = 0,
  futureCount = 0,
}) => {
  // Global keyboard shortcuts (Ctrl+Z and Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          if (canRedo) {
            e.preventDefault();
            onRedo();
          }
        } else {
          if (canUndo) {
            e.preventDefault();
            onUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (canRedo) {
          e.preventDefault();
          onRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl text-zinc-300">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 hover:text-orange-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-300 transition text-xs"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span className="text-[11px] font-mono">{pastCount}</span>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 hover:text-orange-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-300 transition text-xs"
        title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
      >
        <Redo2 className="w-3.5 h-3.5" />
        <span className="text-[11px] font-mono">{futureCount}</span>
      </button>
    </div>
  );
};
