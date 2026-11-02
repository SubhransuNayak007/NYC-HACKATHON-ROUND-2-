"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Bot, Sparkles, BrainCircuit, Cpu } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const AI_THEME = {
  border: "border-violet-500/40",
  bg: "bg-violet-500/10",
  text: "text-violet-400",
  glow: "shadow-[0_0_15px_rgba(139,92,246,0.25)]",
  badge: "bg-violet-500/20 text-violet-300",
};

export const AINode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const model = nodeData.model || (typeof nodeData.parameters?.model === "string" ? nodeData.parameters.model : "claude-3-5-sonnet");
  const taskType = nodeData.taskType || (typeof nodeData.parameters?.task === "string" ? nodeData.parameters.task : "classification");
  const prompt = nodeData.prompt || (typeof nodeData.parameters?.prompt === "string" ? nodeData.parameters.prompt : "Classify inbound customer inquiry intent");

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={AI_THEME}
      categoryLabel="AI Agent"
      title={nodeData.label || "Cognitive Model"}
      subtitle={`${model} · ${taskType}`}
      icon={<BrainCircuit className="w-4 h-4 text-violet-400" />}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3.5 h-3.5 !bg-violet-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="w-3.5 h-3.5 !bg-violet-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
        </>
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2.5 border border-zinc-800/60 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 font-mono">Model:</span>
          <span className="text-violet-300 font-semibold font-mono bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.5 rounded">
            {model}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 font-mono">Task:</span>
          <span className="text-zinc-300 capitalize font-medium">{taskType}</span>
        </div>

        <div className="pt-1 border-t border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 font-mono block mb-0.5">Prompt:</span>
          <p className="text-[11px] text-zinc-300 italic line-clamp-2 bg-zinc-900/80 p-1.5 rounded border border-zinc-800/60 font-sans">
            "{prompt}"
          </p>
        </div>
      </div>
    </BaseNode>
  );
};
