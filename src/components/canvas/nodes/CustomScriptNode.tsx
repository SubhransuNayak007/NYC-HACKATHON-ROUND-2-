"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Code2, ShieldAlert, Terminal, Cpu } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const SCRIPT_THEME = {
  border: "border-rose-500/40",
  bg: "bg-rose-500/10",
  text: "text-rose-400",
  glow: "shadow-[0_0_15px_rgba(244,63,94,0.25)]",
  badge: "bg-rose-500/20 text-rose-300",
};

export const CustomScriptNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const code =
    nodeData.code ||
    (typeof nodeData.parameters?.code === "string" ? nodeData.parameters.code : "return { transformed: $json.amount * 1.18 };");
  const timeoutMs = nodeData.timeoutMs || 2000;
  const memoryLimitMb = nodeData.memoryLimitMb || 64;

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={SCRIPT_THEME}
      categoryLabel="Custom Script"
      title={nodeData.label || "JS Transform"}
      subtitle="Sandboxed V8 Execution"
      icon={<Code2 className="w-4 h-4 text-rose-400" />}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3.5 h-3.5 !bg-rose-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="w-3.5 h-3.5 !bg-rose-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
        </>
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2.5 border border-zinc-800/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-1 font-mono">
            <Terminal className="w-3 h-3 text-rose-400" />
            Sandbox Limits:
          </span>
          <span className="text-zinc-300 font-mono text-[9px] bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
            {memoryLimitMb}MB · {timeoutMs}ms
          </span>
        </div>

        <pre className="p-2 rounded bg-zinc-900/90 font-mono text-[10px] text-rose-200 border border-zinc-800/80 overflow-x-auto max-h-16 leading-relaxed">
          {code}
        </pre>
      </div>
    </BaseNode>
  );
};
