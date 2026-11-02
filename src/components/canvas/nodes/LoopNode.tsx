"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Repeat, RefreshCw, ListFilter } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const LOOP_THEME = {
  border: "border-teal-500/40",
  bg: "bg-teal-500/10",
  text: "text-teal-400",
  glow: "shadow-[0_0_15px_rgba(20,184,166,0.2)]",
  badge: "bg-teal-500/20 text-teal-300",
};

export const LoopNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const collectionPath =
    nodeData.collectionPath ||
    (typeof nodeData.parameters?.items === "string" ? nodeData.parameters.items : "$json.items");
  const batchSize = nodeData.batchSize || (typeof nodeData.parameters?.batchSize === "number" ? nodeData.parameters.batchSize : 1);

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={LOOP_THEME}
      categoryLabel="Loop"
      title={nodeData.label || "Array Iterator"}
      subtitle="Batch Iteration Over Items"
      icon={<Repeat className="w-4 h-4 text-teal-400" />}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3.5 h-3.5 !bg-teal-500 border-2 !border-zinc-950 transition hover:scale-125"
          />

          {/* Loop Body Handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="loop_body"
            style={{ top: "32%" }}
            className="w-3.5 h-3.5 !bg-teal-400 border-2 !border-zinc-950 transition hover:scale-125"
          />

          {/* Completed Handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="completed"
            style={{ top: "68%" }}
            className="w-3.5 h-3.5 !bg-sky-400 border-2 !border-zinc-950 transition hover:scale-125"
          />
        </>
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2.5 border border-zinc-800/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-mono">Collection:</span>
          <code className="text-teal-300 font-mono bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-800">
            {collectionPath}
          </code>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-mono">Batch Size:</span>
          <span className="text-zinc-200 font-mono">{batchSize} item{batchSize > 1 ? "s" : ""}</span>
        </div>

        {/* Dual Loop Output Badges */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>ITEM BODY</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>ON DONE</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
