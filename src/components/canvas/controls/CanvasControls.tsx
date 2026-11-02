"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Workflow,
  ArrowRight,
  ArrowDown,
  LayoutGrid,
} from "lucide-react";
import dagre from "dagre";
import type { AppNode, AppEdge } from "../types";

export interface CanvasControlsProps {
  nodes: AppNode[];
  edges: AppEdge[];
  setNodes: (nodes: AppNode[]) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export function layoutElements(
  nodes: AppNode[],
  edges: AppEdge[],
  direction: "LR" | "TB" = "LR"
): AppNode[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: isHorizontal ? 80 : 60,
    nodesep: isHorizontal ? 50 : 70,
  });

  nodes.forEach((node) => {
    // Standard node dimensions
    dagreGraph.setNode(node.id, { width: 260, height: 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - 130 : node.position.x,
        y: nodeWithPosition ? nodeWithPosition.y - 80 : node.position.y,
      },
    };
  });
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  nodes,
  edges,
  setNodes,
  isLocked = false,
  onToggleLock,
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleAutoLayout = (direction: "LR" | "TB") => {
    const arrangedNodes = layoutElements(nodes, edges, direction);
    setNodes(arrangedNodes);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl text-zinc-300">
      <button
        onClick={() => zoomIn({ duration: 300 })}
        className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-orange-400 transition"
        title="Zoom In (+)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={() => zoomOut({ duration: 300 })}
        className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-orange-400 transition"
        title="Zoom Out (-)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={() => fitView({ padding: 0.25, duration: 400 })}
        className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-orange-400 transition"
        title="Fit All Nodes into View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-zinc-800 my-auto" />

      {/* Auto-Layout Buttons */}
      <button
        onClick={() => handleAutoLayout("LR")}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 hover:text-orange-400 text-xs font-medium transition"
        title="Auto Layout (Horizontal Flow LR)"
      >
        <Workflow className="w-3.5 h-3.5" />
        <span className="text-[11px]">Auto Layout</span>
        <ArrowRight className="w-3 h-3 text-zinc-500" />
      </button>

      <button
        onClick={() => handleAutoLayout("TB")}
        className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-orange-400 transition"
        title="Auto Layout (Vertical Flow TB)"
      >
        <ArrowDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>

      <div className="w-px h-4 bg-zinc-800 my-auto" />

      {onToggleLock && (
        <button
          onClick={onToggleLock}
          className={`p-1.5 rounded-lg transition ${
            isLocked ? "bg-orange-500/20 text-orange-400" : "hover:bg-zinc-800 hover:text-zinc-100"
          }`}
          title={isLocked ? "Unlock Canvas Viewport" : "Lock Canvas Viewport"}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
