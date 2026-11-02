"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { CanvasControls, layoutElements } from "./controls/CanvasControls";
import { MiniMap } from "./controls/MiniMap";
import { UndoRedo } from "./controls/UndoRedo";
import { ParameterInspector } from "./inspector/ParameterInspector";
import type {
  AppNode,
  AppEdge,
  CanvasNodeData,
  ExecutionNodeStatus,
  WorkflowDefinitionV3,
} from "./types";
import { toExecutableWorkflow, fromExecutableWorkflow } from "./types";
import {
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Zap,
  Split,
  Repeat,
  BrainCircuit,
  Code2,
  Trash2,
} from "lucide-react";

export interface WorkflowCanvasProps {
  initialWorkflow?: WorkflowDefinitionV3;
  onWorkflowChange?: (workflow: WorkflowDefinitionV3) => void;
  executionStatus?: Record<string, { status: ExecutionNodeStatus; durationMs?: number; error?: string }>;
  executionStreamUrl?: string;
  activeExecutionId?: string;
  isExecuting?: boolean;
  onRunTest?: () => void;
}

const DEFAULT_NODES: AppNode[] = [
  {
    id: "trigger_1",
    type: "triggerNode",
    position: { x: 80, y: 160 },
    data: {
      label: "Webhook Inbound Lead",
      nodeType: "trigger",
      triggerType: "webhook",
      webhookPath: "/api/v1/inbound-leads",
      service: "webhook",
      parameters: { path: "/api/v1/inbound-leads" },
      status: "IDLE",
      sideEffect: "SAFE_READ",
    },
  },
  {
    id: "step_ai_1",
    type: "aiNode",
    position: { x: 380, y: 160 },
    data: {
      label: "AI Intent Classifier",
      nodeType: "ai",
      model: "claude-3-5-sonnet",
      taskType: "classify",
      prompt: "Classify incoming lead urgency and enterprise potential",
      parameters: { model: "claude-3-5-sonnet", task: "classify" },
      status: "IDLE",
      sideEffect: "SAFE_READ",
    },
  },
  {
    id: "step_cond_1",
    type: "conditionNode",
    position: { x: 680, y: 160 },
    data: {
      label: "High Urgency Check",
      nodeType: "condition",
      expression: "$json.urgency === 'HIGH'",
      parameters: { condition: "$json.urgency === 'HIGH'" },
      status: "IDLE",
      sideEffect: "SAFE_READ",
    },
  },
  {
    id: "step_hubspot_1",
    type: "actionNode",
    position: { x: 980, y: 80 },
    data: {
      label: "HubSpot Priority Lead",
      nodeType: "action",
      service: "hubspot",
      operation: "create_contact",
      parameters: { pipeline: "Enterprise Sales", dealValue: 25000 },
      credentialRef: "cred_hubspot_crm_sales",
      status: "IDLE",
      sideEffect: "EXTERNAL_COMMUNICATION",
      approvalRequired: false,
    },
  },
  {
    id: "step_slack_1",
    type: "actionNode",
    position: { x: 980, y: 260 },
    data: {
      label: "Slack Standard Digest",
      nodeType: "action",
      service: "slack",
      operation: "post_message",
      parameters: { channel: "#leads-digest", message: "Standard lead received" },
      credentialRef: "cred_slack_prod_ops",
      status: "IDLE",
      sideEffect: "EXTERNAL_COMMUNICATION",
    },
  },
];

const DEFAULT_EDGES: AppEdge[] = [
  {
    id: "e_trigger_ai",
    source: "trigger_1",
    target: "step_ai_1",
    type: "smoothstep",
    style: { stroke: "#64748B", strokeWidth: 2 },
  },
  {
    id: "e_ai_cond",
    source: "step_ai_1",
    target: "step_cond_1",
    type: "smoothstep",
    style: { stroke: "#64748B", strokeWidth: 2 },
  },
  {
    id: "e_cond_true_hubspot",
    source: "step_cond_1",
    sourceHandle: "true",
    target: "step_hubspot_1",
    type: "smoothstep",
    style: { stroke: "#10B981", strokeWidth: 2 },
  },
  {
    id: "e_cond_false_slack",
    source: "step_cond_1",
    sourceHandle: "false",
    target: "step_slack_1",
    type: "smoothstep",
    style: { stroke: "#F43F5E", strokeWidth: 2 },
  },
];

export function WorkflowCanvasInner({
  initialWorkflow,
  onWorkflowChange,
  executionStatus,
  executionStreamUrl,
  activeExecutionId,
  isExecuting = false,
  onRunTest,
}: WorkflowCanvasProps) {
  // State for nodes and edges
  const [nodes, setNodes] = useState<AppNode[]>(() => {
    if (initialWorkflow && initialWorkflow.nodes.length > 0) {
      return fromExecutableWorkflow(initialWorkflow).nodes;
    }
    return DEFAULT_NODES;
  });

  const [edges, setEdges] = useState<AppEdge[]>(() => {
    if (initialWorkflow && initialWorkflow.nodes.length > 0) {
      return fromExecutableWorkflow(initialWorkflow).edges;
    }
    return DEFAULT_EDGES;
  });

  // Selected node for inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Live SSE stream execution status
  const [liveStreamStatus, setLiveStreamStatus] = useState<
    Record<string, { status: ExecutionNodeStatus; durationMs?: number; error?: string }>
  >({});

  // Merge executionStatus prop with live SSE stream status
  const combinedExecutionStatus = React.useMemo(() => {
    return {
      ...(executionStatus || {}),
      ...liveStreamStatus,
    };
  }, [executionStatus, liveStreamStatus]);

  // Subscribe to SSE event stream if streamUrl or activeExecutionId is provided
  useEffect(() => {
    const streamUrl =
      executionStreamUrl ||
      (activeExecutionId ? `/api/workflows/executions/${activeExecutionId}/stream` : null);
    if (!streamUrl || typeof window === "undefined" || !window.EventSource) return;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { eventType, nodeId, durationMs, error } = payload;
        if (!nodeId) return;

        let status: ExecutionNodeStatus = "IDLE";
        if (eventType === "node.started" || eventType === "node_started") status = "RUNNING";
        else if (eventType === "node.completed" || eventType === "node_completed") status = "SUCCESS";
        else if (eventType === "node.failed" || eventType === "node_failed") status = "FAILED";
        else return;

        setLiveStreamStatus((prev) => ({
          ...prev,
          [nodeId]: { status, durationMs, error },
        }));
      } catch (err) {
        console.error("Execution stream parse error", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [executionStreamUrl, activeExecutionId]);

  // Undo / Redo history stack
  const historyRef = useRef<{
    past: Array<{ nodes: AppNode[]; edges: AppEdge[] }>;
    future: Array<{ nodes: AppNode[]; edges: AppEdge[] }>;
  }>({
    past: [],
    future: [],
  });

  const [, forceUpdate] = useState({});

  // Helper to notify parent only on user-initiated changes
  const notifyWorkflowChange = useCallback(
    (currentNodes: AppNode[], currentEdges: AppEdge[]) => {
      if (onWorkflowChange) {
        const def = toExecutableWorkflow(currentNodes, currentEdges, initialWorkflow);
        onWorkflowChange(def);
      }
    },
    [onWorkflowChange, initialWorkflow]
  );

  // Track last synced workflow signature to prevent redundant canvas resets & loops
  const lastSyncedSignatureRef = useRef<string>("");

  // Sync external workflow changes if provided
  useEffect(() => {
    if (!initialWorkflow || !initialWorkflow.nodes || initialWorkflow.nodes.length === 0) return;
    const signature = `${initialWorkflow.id}_v${initialWorkflow.version}_${initialWorkflow.nodes.length}_${initialWorkflow.edges?.length || 0}`;
    if (lastSyncedSignatureRef.current === signature) return;
    lastSyncedSignatureRef.current = signature;

    const converted = fromExecutableWorkflow(initialWorkflow);
    setNodes(converted.nodes);
    setEdges(converted.edges);
  }, [initialWorkflow]);

  // Sync execution status into node states
  useEffect(() => {
    const hasStatus = Object.keys(combinedExecutionStatus).length > 0;
    if (!hasStatus) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const update = combinedExecutionStatus[node.id];
        if (update) {
          return {
            ...node,
            data: {
              ...node.data,
              status: update.status,
              durationMs: update.durationMs,
              errorMessage: update.error,
            },
          };
        }
        return node;
      })
    );

    // Also update edge animated particle status during execution
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const sourceStatus = combinedExecutionStatus[edge.source]?.status;
        const targetStatus = combinedExecutionStatus[edge.target]?.status;

        if (sourceStatus === "RUNNING" || targetStatus === "RUNNING") {
          return {
            ...edge,
            animated: true,
            style: { stroke: "#F97316", strokeWidth: 3 },
          };
        } else if (sourceStatus === "SUCCESS" && targetStatus === "SUCCESS") {
          return {
            ...edge,
            animated: false,
            style: { stroke: "#10B981", strokeWidth: 2 },
          };
        } else if (sourceStatus === "SUCCESS") {
          return {
            ...edge,
            animated: false,
            style: { stroke: "#10B981", strokeWidth: 2 },
          };
        } else if (sourceStatus === "FAILED" || targetStatus === "FAILED") {
          return {
            ...edge,
            animated: false,
            style: { stroke: "#EF4444", strokeWidth: 2 },
          };
        }
        return edge;
      })
    );
  }, [combinedExecutionStatus]);

  // Record history snapshot before mutations
  const pushHistorySnapshot = useCallback(() => {
    historyRef.current.past.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    // Limit history depth to 30
    if (historyRef.current.past.length > 30) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    forceUpdate({});
  }, [nodes, edges]);

  // Handle node changes (drag, select, remove)
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Handle edge changes (remove, select)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  // Handle new connection between handles
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      pushHistorySnapshot();
      const edgeStyle =
        params.sourceHandle === "true"
          ? { stroke: "#10B981", strokeWidth: 2 }
          : params.sourceHandle === "false"
          ? { stroke: "#F43F5E", strokeWidth: 2 }
          : { stroke: "#64748B", strokeWidth: 2 };

      const newEdge: AppEdge = {
        ...params,
        id: `e_${params.source}_${params.sourceHandle || "out"}_${params.target}`,
        type: "smoothstep",
        style: edgeStyle,
      };

      setEdges((eds) => {
        const nextEdges = addEdge(newEdge, eds);
        notifyWorkflowChange(nodes, nextEdges);
        return nextEdges;
      });
    },
    [pushHistorySnapshot, nodes, notifyWorkflowChange]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop();
    if (!previous) return;

    historyRef.current.future.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setNodes(previous.nodes);
    setEdges(previous.edges);
    notifyWorkflowChange(previous.nodes, previous.edges);
    forceUpdate({});
  }, [nodes, edges, notifyWorkflowChange]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop();
    if (!next) return;

    historyRef.current.past.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setNodes(next.nodes);
    setEdges(next.edges);
    notifyWorkflowChange(next.nodes, next.edges);
    forceUpdate({});
  }, [nodes, edges, notifyWorkflowChange]);

  // Update node data from Inspector
  const handleUpdateNodeData = useCallback(
    (id: string, partialData: Partial<CanvasNodeData>) => {
      pushHistorySnapshot();
      setNodes((nds) => {
        const nextNodes = nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                ...partialData,
              },
            };
          }
          return n;
        });
        notifyWorkflowChange(nextNodes, edges);
        return nextNodes;
      });
    },
    [pushHistorySnapshot, edges, notifyWorkflowChange]
  );

  // Delete selected node
  const handleDeleteNode = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      const nextNodes = nodes.filter((n) => n.id !== id);
      const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
      setNodes(nextNodes);
      setEdges(nextEdges);
      notifyWorkflowChange(nextNodes, nextEdges);
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [pushHistorySnapshot, nodes, edges, notifyWorkflowChange, selectedNodeId]
  );

  // Add new node from Catalog
  const handleAddNode = (type: "trigger" | "action" | "condition" | "loop" | "ai" | "script") => {
    pushHistorySnapshot();
    const newId = `node_${Date.now()}`;
    const xOffset = 200 + (nodes.length % 4) * 220;
    const yOffset = 180 + Math.floor(nodes.length / 4) * 160;

    let nodeType: AppNode["type"] = "actionNode";
    let defaultData: CanvasNodeData = {
      label: "New Action",
      nodeType: "action",
      service: "generic",
      parameters: {},
      status: "IDLE",
    };

    if (type === "trigger") {
      nodeType = "triggerNode";
      defaultData = {
        label: "Inbound Webhook",
        nodeType: "trigger",
        triggerType: "webhook",
        webhookPath: `/api/v1/trigger-${Date.now()}`,
        parameters: {},
        status: "IDLE",
      };
    } else if (type === "condition") {
      nodeType = "conditionNode";
      defaultData = {
        label: "Condition Filter",
        nodeType: "condition",
        expression: "$json.amount > 1000",
        parameters: { condition: "$json.amount > 1000" },
        status: "IDLE",
      };
    } else if (type === "loop") {
      nodeType = "loopNode";
      defaultData = {
        label: "Batch Records Loop",
        nodeType: "loop",
        collectionPath: "$json.items",
        batchSize: 1,
        parameters: { items: "$json.items", batchSize: 1 },
        status: "IDLE",
      };
    } else if (type === "ai") {
      nodeType = "aiNode";
      defaultData = {
        label: "AI Reasoning Step",
        nodeType: "ai",
        model: "claude-3-5-sonnet",
        taskType: "classify",
        prompt: "Analyze payload and extract action items",
        parameters: { model: "claude-3-5-sonnet" },
        status: "IDLE",
      };
    } else if (type === "script") {
      nodeType = "customScriptNode";
      defaultData = {
        label: "Data Transform Code",
        nodeType: "script",
        code: "return { count: $json.items.length };",
        parameters: {},
        status: "IDLE",
      };
    }

    const newNode: AppNode = {
      id: newId,
      type: nodeType,
      position: { x: xOffset, y: yOffset },
      data: defaultData,
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    notifyWorkflowChange(nextNodes, edges);
    setSelectedNodeId(newId);
    setShowAddMenu(false);
  };

  // Find currently selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="relative w-full h-full flex bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* Canvas Viewport */}
      <div className="flex-1 relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={() => notifyWorkflowChange(nodes, edges)}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { strokeWidth: 2, stroke: "#64748B" },
          }}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          className="bg-zinc-950"
        >
          {/* Subtle Canvas Dot Grid Background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#27272A"
          />

          {/* Top-Left: Add Node Catalog Drawer Trigger */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-950/40 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Node</span>
              </button>

              {/* Quick Add Node Dropdown */}
              {showAddMenu && (
                <div className="absolute top-12 left-0 w-52 p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl z-30 space-y-1">
                  <button
                    onClick={() => handleAddNode("trigger")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Inbound Trigger</span>
                  </button>

                  <button
                    onClick={() => handleAddNode("action")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sky-500/10 hover:text-sky-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Service Action</span>
                  </button>

                  <button
                    onClick={() => handleAddNode("condition")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <Split className="w-4 h-4 text-amber-400" />
                    <span>Condition Filter</span>
                  </button>

                  <button
                    onClick={() => handleAddNode("loop")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-teal-500/10 hover:text-teal-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <Repeat className="w-4 h-4 text-teal-400" />
                    <span>Loop Batching</span>
                  </button>

                  <button
                    onClick={() => handleAddNode("ai")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-violet-500/10 hover:text-violet-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <BrainCircuit className="w-4 h-4 text-violet-400" />
                    <span>AI Reasoning Node</span>
                  </button>

                  <button
                    onClick={() => handleAddNode("script")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-zinc-300 text-xs transition font-medium"
                  >
                    <Code2 className="w-4 h-4 text-rose-400" />
                    <span>Custom Script Node</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sandbox Execution Trigger */}
            {onRunTest && (
              <button
                onClick={onRunTest}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 hover:text-emerald-400 text-zinc-300 text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isExecuting ? "Executing..." : "Test Run"}</span>
              </button>
            )}
          </div>

          {/* Top-Right: Undo / Redo Stack Controls */}
          <div className="absolute top-4 right-4 z-20">
            <UndoRedo
              canUndo={historyRef.current.past.length > 0}
              canRedo={historyRef.current.future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              pastCount={historyRef.current.past.length}
              futureCount={historyRef.current.future.length}
            />
          </div>

          {/* Bottom-Left: Canvas Navigation Controls (Zoom, Fit, Auto Layout) */}
          <div className="absolute bottom-4 left-4 z-20">
            <CanvasControls
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              isLocked={isLocked}
              onToggleLock={() => setIsLocked(!isLocked)}
            />
          </div>

          {/* Bottom-Right: Canvas Mini-Map */}
          <div className="absolute bottom-4 right-4 z-20">
            <MiniMap />
          </div>
        </ReactFlow>
      </div>

      {/* Right Drawer: Dynamic Schema Parameter Inspector */}
      {selectedNode && (
        <ParameterInspector
          selectedNode={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNodeData={handleUpdateNodeData}
        />
      )}
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
