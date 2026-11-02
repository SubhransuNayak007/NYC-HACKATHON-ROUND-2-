"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Layers,
  Table,
  Mail,
  MessageSquare,
  Sparkles,
  Palette,
  CreditCard,
  Send,
  Lock,
  Globe,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNodeData } from "../types";

const ACTION_THEME = {
  border: "border-sky-500/40",
  bg: "bg-sky-500/10",
  text: "text-sky-400",
  glow: "shadow-[0_0_15px_rgba(14,165,233,0.2)]",
  badge: "bg-sky-500/20 text-sky-300",
};

export const ActionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CanvasNodeData;
  const service = (nodeData.service || nodeData.appId || "generic").toLowerCase();
  const operation = nodeData.operation || nodeData.actionId || "execute";

  // App-specific brand icons
  let ServiceIcon = Layers;
  let serviceDisplay = "Action Connector";

  if (service.includes("sheet")) {
    ServiceIcon = FileSpreadsheet;
    serviceDisplay = "Google Sheets";
  } else if (service.includes("gmail") || service.includes("email") || service.includes("mail")) {
    ServiceIcon = Mail;
    serviceDisplay = "Gmail";
  } else if (service.includes("slack")) {
    ServiceIcon = MessageSquare;
    serviceDisplay = "Slack";
  } else if (service.includes("hubspot")) {
    ServiceIcon = Globe;
    serviceDisplay = "HubSpot CRM";
  } else if (service.includes("canva")) {
    ServiceIcon = Palette;
    serviceDisplay = "Canva Connect";
  } else if (service.includes("stripe")) {
    ServiceIcon = CreditCard;
    serviceDisplay = "Stripe Payments";
  } else if (service.includes("whatsapp")) {
    ServiceIcon = Send;
    serviceDisplay = "WhatsApp";
  }

  const hasCredentials = Boolean(nodeData.credentialRef);

  return (
    <BaseNode
      id={id}
      selected={selected}
      status={nodeData.status || "IDLE"}
      categoryTheme={ACTION_THEME}
      categoryLabel="Action"
      title={nodeData.label || `${serviceDisplay} Action`}
      subtitle={`${serviceDisplay} · ${operation}`}
      icon={<ServiceIcon className="w-4 h-4 text-sky-400" />}
      sideEffect={nodeData.sideEffect}
      durationMs={nodeData.durationMs}
      errorMessage={nodeData.errorMessage}
      handles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3.5 h-3.5 !bg-sky-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="w-3.5 h-3.5 !bg-sky-500 border-2 !border-zinc-950 transition hover:scale-125"
          />
        </>
      }
    >
      <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/60 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 font-mono">Operation:</span>
          <span className="text-zinc-200 font-semibold font-mono truncate max-w-[130px]">
            {operation}
          </span>
        </div>

        {/* Credential Status Pill */}
        <div className="flex items-center justify-between text-[10px] pt-0.5">
          <span className="text-zinc-400">Credential:</span>
          {hasCredentials ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded">
              <Lock className="w-2.5 h-2.5" />
              {nodeData.credentialRef?.substring(0, 10)}...
            </span>
          ) : (
            <span className="text-[9px] text-zinc-500 italic">Default Workspace</span>
          )}
        </div>

        {/* Parameter summary */}
        {nodeData.parameters && Object.keys(nodeData.parameters).length > 0 && (
          <div className="pt-1 border-t border-zinc-800/80 text-[10px] text-zinc-400 truncate">
            <span className="text-zinc-500">Params: </span>
            <span className="text-zinc-300 font-mono">
              {Object.keys(nodeData.parameters).slice(0, 2).join(", ")}
              {Object.keys(nodeData.parameters).length > 2 ? "..." : ""}
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
