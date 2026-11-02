"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GitFork, Split, HelpCircle } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const CONDITION_THEME = {
  border: "border-amber-500/40",
  bg: "bg-amber-500/10",
  text: "text-amber-400",
  glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
  badge: "bg-amber-500/20 text-amber-300",
};

export const ConditionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const expression =
    nodeData.expression ||
    nodeData.approvalCondition ||
    (typeof nodeData.parameters?.condition === "string" ? nodeData.parameters.condition : "$json.amount > 50000");

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={CONDITION_THEME}
      categoryLabel="Condition"
      title={nodeData.label || "Branch Router"}
      subtitle="Evaluate Logic Expression"
      icon={<Split className="w-4 h-4 text-amber-400" />}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <>
          {/* Incoming connection */}
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3.5 h-3.5 !bg-amber-500 border-2 !border-zinc-950 transition hover:scale-125"
          />

          {/* True Handle: Upper Right */}
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: "32%" }}
            className="w-3.5 h-3.5 !bg-emerald-500 border-2 !border-zinc-950 transition hover:scale-125"
          />

          {/* False Handle: Lower Right */}
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: "68%" }}
            className="w-3.5 h-3.5 !bg-rose-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
        </>
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2.5 border border-zinc-800/60 space-y-2">
        <div>
          <span className="text-[10px] text-zinc-400 font-mono block mb-1">Expression:</span>
          <code className="text-[11px] text-amber-300 font-mono bg-zinc-900/90 px-2 py-1 rounded block border border-zinc-800 break-all">
            {expression}
          </code>
        </div>

        {/* Dual Port Visual Badges */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRUE</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>FALSE</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
