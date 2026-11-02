"use client";

import React from "react";
import { MiniMap as XYFlowMiniMap } from "@xyflow/react";
import type { AppNode } from "../types";

export const MiniMap: React.FC = () => {
  const getNodeColor = (node: AppNode): string => {
    switch (node.type) {
      case "triggerNode":
        return "#10B981"; // Emerald
      case "actionNode":
        return "#0EA5E9"; // Sky Blue
      case "conditionNode":
        return "#F59E0B"; // Amber
      case "loopNode":
        return "#14B8A6"; // Teal
      case "aiNode":
        return "#8B5CF6"; // Violet
      case "customScriptNode":
        return "#F43F5E"; // Rose
      default:
        return "#64748B"; // Slate
    }
  };

  return (
    <XYFlowMiniMap
      nodeColor={getNodeColor as any}
      nodeStrokeWidth={2}
      maskColor="rgba(9, 9, 11, 0.75)"
      className="!bg-zinc-950/90 !border !border-zinc-800 !rounded-xl !shadow-2xl overflow-hidden"
      style={{
        width: 140,
        height: 100,
      }}
      zoomable
      pannable
    />
  );
};
