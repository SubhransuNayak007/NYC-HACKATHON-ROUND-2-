"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Zap, Clock, Webhook, Play, Radio } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const TRIGGER_THEME = {
  border: "border-emerald-500/40",
  bg: "bg-emerald-500/10",
  text: "text-emerald-400",
  glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
  badge: "bg-emerald-500/20 text-emerald-300",
};

export const TriggerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const triggerType = nodeData.triggerType || "webhook";

  let TriggerIcon = Zap;
  let typeLabel = "Inbound Trigger";

  if (triggerType === "cron") {
    TriggerIcon = Clock;
    typeLabel = "Schedule Cron";
  } else if (triggerType === "webhook") {
    TriggerIcon = Webhook;
    typeLabel = "Webhook Listener";
  } else if (triggerType === "manual") {
    TriggerIcon = Play;
    typeLabel = "Manual Trigger";
  } else if (triggerType === "app_event") {
    TriggerIcon = Radio;
    typeLabel = "App Event";
  }

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={TRIGGER_THEME}
      categoryLabel="Trigger"
      title={nodeData.label || typeLabel}
      subtitle={nodeData.service || "Event Source"}
      icon={<TriggerIcon className="w-4 h-4 text-emerald-400" />}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3.5 h-3.5 !bg-emerald-500 border-2 !border-zinc-950 transition hover:scale-125"
        />
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/60 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-mono uppercase">Type:</span>
          <span className="text-emerald-400 font-semibold uppercase">{triggerType}</span>
        </div>

        {nodeData.cronExpression && (
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-mono">Cron:</span>
            <code className="text-zinc-200 font-mono bg-zinc-800/80 px-1 rounded">
              {nodeData.cronExpression}
            </code>
          </div>
        )}

        {nodeData.webhookPath && (
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-mono">Path:</span>
            <span className="text-zinc-300 font-mono truncate max-w-[120px]">
              {nodeData.webhookPath}
            </span>
          </div>
        )}

        {nodeData.parameters?.path && !nodeData.webhookPath && (
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-mono">Path:</span>
            <span className="text-zinc-300 font-mono truncate max-w-[120px]">
              {nodeData.parameters.path}
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
