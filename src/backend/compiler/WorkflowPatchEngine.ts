/**
 * QuickReply AST Graph Patch Engine
 * src/backend/compiler/WorkflowPatchEngine.ts
 *
 * Implements:
 * Non-destructive AST graph mutation operations that preserve all unaffected
 * nodes, credentials, parameters, coordinates, and edges.
 *
 * Supported operations:
 * - INSERT_NODE
 * - INSERT_BRANCH
 * - UPDATE_PARAMETERS
 * - REMOVE_NODE
 * - RECONNECT_EDGE
 * - REPLACE_NODE
 * - UPDATE_TRIGGER
 *
 * Enforces DFS / Kahn's algorithm topological DAG cycle detection.
 */

export type GraphPatchOperation =
  | {
      op: "INSERT_NODE";
      node: {
        id: string;
        type: string;
        name?: string;
        label?: string;
        appId?: string;
        actionId?: string;
        service?: string;
        operation?: string;
        credentialRef?: string;
        parameters?: Record<string, any>;
        position?: { x: number; y: number };
        policies?: Record<string, any>;
      };
      position?: {
        relativeToNodeId?: string;
        placement?: "before" | "after";
        x?: number;
        y?: number;
      };
    }
  | {
      op: "INSERT_BRANCH";
      splitAfterNodeId: string;
      conditionNode: {
        id: string;
        type?: string;
        name?: string;
        label?: string;
        expression?: string;
        parameters?: Record<string, any>;
        position?: { x: number; y: number };
      };
      trueBranchNodes?: Array<any>;
      falseBranchNodes?: Array<any>;
      vipActionNode?: any; // For Scenario E compatibility
    }
  | {
      op: "UPDATE_PARAMETERS";
      nodeId: string;
      parameters: Record<string, any>;
    }
  | {
      op: "REMOVE_NODE";
      nodeId: string;
      reconnectStrategy?: "bridge" | "orphan";
    }
  | {
      op: "RECONNECT_EDGE";
      edgeId?: string;
      oldEdge?: { source: string; target: string };
      newEdge: {
        id?: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
        label?: string;
      };
    }
  | {
      op: "REPLACE_NODE";
      nodeId: string;
      replacementNode: any;
    }
  | {
      op: "UPDATE_TRIGGER";
      triggerId: string;
      config: Record<string, any>;
    };

export class WorkflowPatchEngine {
  /**
   * Apply an array of atomic graph patch operations to an existing workflow AST,
   * returning an immutable, updated WorkflowDefinitionV3.
   */
  public static applyPatch(
    currentWorkflow: any,
    operations: GraphPatchOperation[]
  ): any {
    if (!currentWorkflow || !Array.isArray(currentWorkflow.nodes)) {
      throw new Error("Invalid workflow definition: 'nodes' array required");
    }

    // 1. Deep clone the workflow definition to ensure absolute immutability
    const updated = JSON.parse(JSON.stringify(currentWorkflow));
    if (!Array.isArray(updated.edges)) {
      updated.edges = [];
    }

    // 2. Sequentially apply each patch operation
    for (const op of operations) {
      switch (op.op) {
        case "INSERT_NODE": {
          this.applyInsertNode(updated, op);
          break;
        }

        case "INSERT_BRANCH": {
          this.applyInsertBranch(updated, op);
          break;
        }

        case "UPDATE_PARAMETERS": {
          const targetNode = updated.nodes.find((n: any) => n.id === op.nodeId);
          if (!targetNode) {
            throw new Error(`Node '${op.nodeId}' not found for UPDATE_PARAMETERS`);
          }
          targetNode.parameters = {
            ...(targetNode.parameters || {}),
            ...op.parameters,
          };
          break;
        }

        case "REMOVE_NODE": {
          this.applyRemoveNode(updated, op);
          break;
        }

        case "RECONNECT_EDGE": {
          this.applyReconnectEdge(updated, op);
          break;
        }

        case "REPLACE_NODE": {
          const idx = updated.nodes.findIndex((n: any) => n.id === op.nodeId);
          if (idx === -1) {
            throw new Error(`Node '${op.nodeId}' not found for REPLACE_NODE`);
          }
          const oldNode = updated.nodes[idx];
          updated.nodes[idx] = {
            ...oldNode,
            ...op.replacementNode,
            id: oldNode.id, // preserve ID unless explicitly overridden
          };
          break;
        }

        case "UPDATE_TRIGGER": {
          if (Array.isArray(updated.triggers)) {
            const trg = updated.triggers.find((t: any) => t.id === op.triggerId);
            if (trg) {
              trg.config = { ...(trg.config || {}), ...op.config };
            }
          }
          break;
        }

        default:
          throw new Error(`Unsupported graph patch operation: ${(op as any).op}`);
      }
    }

    // 3. Increment version and touch timestamp
    updated.version = (updated.version || 1) + 1;
    updated.updatedAt = new Date().toISOString();

    // 4. Validate graph DAG integrity (must be acyclic)
    this.validateAcyclicDAG(updated);

    return updated;
  }

  private static applyInsertNode(updated: any, op: Extract<GraphPatchOperation, { op: "INSERT_NODE" }>): void {
    const relativeId = op.position?.relativeToNodeId;
    let anchorNode: any = null;
    let anchorIdx = -1;

    if (relativeId) {
      anchorIdx = updated.nodes.findIndex((n: any) => n.id === relativeId);
      if (anchorIdx === -1) {
        throw new Error(`Anchor node '${relativeId}' not found for INSERT_NODE`);
      }
      anchorNode = updated.nodes[anchorIdx];
    }

    const anchorPos = anchorNode?.position || { x: 100, y: 100 };
    const newNodePos = op.position?.x !== undefined && op.position?.y !== undefined
      ? { x: op.position.x, y: op.position.y }
      : op.node.position || {
          x: anchorPos.x + (op.position?.placement === "before" ? -280 : 280),
          y: anchorPos.y,
        };

    const newNode = {
      ...op.node,
      name: op.node.name || op.node.label || op.node.id,
      label: op.node.label || op.node.name || op.node.id,
      position: newNodePos,
    };

    if (anchorNode && op.position?.placement === "after") {
      // Find outgoing edges from anchor node
      const outgoingEdges = updated.edges.filter((e: any) => e.source === anchorNode.id);
      // Rewire outgoing edges to source from new node
      for (const edge of outgoingEdges) {
        edge.source = newNode.id;
      }
      // Connect anchor to new node
      updated.edges.push({
        id: `edge_${anchorNode.id}_to_${newNode.id}`,
        source: anchorNode.id,
        target: newNode.id,
        sourceHandle: "source",
        targetHandle: "target",
      });
    } else if (anchorNode && op.position?.placement === "before") {
      // Find incoming edges to anchor node
      const incomingEdges = updated.edges.filter((e: any) => e.target === anchorNode.id);
      // Rewire incoming edges to target new node
      for (const edge of incomingEdges) {
        edge.target = newNode.id;
      }
      // Connect new node to anchor
      updated.edges.push({
        id: `edge_${newNode.id}_to_${anchorNode.id}`,
        source: newNode.id,
        target: anchorNode.id,
        sourceHandle: "source",
        targetHandle: "target",
      });
    }

    updated.nodes.push(newNode);
  }

  private static applyInsertBranch(updated: any, op: Extract<GraphPatchOperation, { op: "INSERT_BRANCH" }>): void {
    const anchorIdx = updated.nodes.findIndex((n: any) => n.id === op.splitAfterNodeId);
    if (anchorIdx === -1) {
      throw new Error(`Split node '${op.splitAfterNodeId}' not found for INSERT_BRANCH`);
    }
    const anchorNode = updated.nodes[anchorIdx];
    const anchorPos = anchorNode.position || { x: 100, y: 100 };

    // 1. Condition Node
    const condNode = {
      id: op.conditionNode.id,
      type: op.conditionNode.type || "conditionNode",
      name: op.conditionNode.name || op.conditionNode.label || "Condition Check",
      label: op.conditionNode.label || op.conditionNode.name || "Condition Check",
      appId: "condition",
      actionId: "evaluate",
      parameters: {
        expression: op.conditionNode.expression || op.conditionNode.parameters?.expression || "",
        ...(op.conditionNode.parameters || {}),
      },
      position: op.conditionNode.position || { x: anchorPos.x + 280, y: anchorPos.y },
    };
    updated.nodes.push(condNode);

    // Save existing edges from anchor
    const originalAnchorEdges = updated.edges.filter((e: any) => e.source === anchorNode.id);

    // Connect anchor -> condition node
    updated.edges.push({
      id: `edge_${anchorNode.id}_${condNode.id}`,
      source: anchorNode.id,
      target: condNode.id,
      sourceHandle: "source",
      targetHandle: "target",
    });

    // 2. True Branch
    const trueNodes = op.trueBranchNodes || [];
    if (op.vipActionNode && trueNodes.length === 0) {
      trueNodes.push(op.vipActionNode);
    }

    let lastTrueId = condNode.id;
    let trueHandle = "true";
    for (let i = 0; i < trueNodes.length; i++) {
      const nodeDef = trueNodes[i];
      const node = {
        ...nodeDef,
        name: nodeDef.name || nodeDef.label || nodeDef.id,
        label: nodeDef.label || nodeDef.name || nodeDef.id,
        position: nodeDef.position || {
          x: condNode.position.x + 280 * (i + 1),
          y: condNode.position.y - 120,
        },
      };
      if (!updated.nodes.some((n: any) => n.id === node.id)) {
        updated.nodes.push(node);
      }
      updated.edges.push({
        id: `edge_true_${lastTrueId}_${node.id}`,
        source: lastTrueId,
        target: node.id,
        sourceHandle: trueHandle,
        targetHandle: "target",
        label: trueHandle === "true" ? "True" : undefined,
      });
      lastTrueId = node.id;
      trueHandle = "source";
    }

    // 3. False Branch
    const falseNodes = op.falseBranchNodes || [];
    let lastFalseId = condNode.id;
    let falseHandle = "false";
    for (let i = 0; i < falseNodes.length; i++) {
      const nodeDef = falseNodes[i];
      const node = {
        ...nodeDef,
        name: nodeDef.name || nodeDef.label || nodeDef.id,
        label: nodeDef.label || nodeDef.name || nodeDef.id,
        position: nodeDef.position || {
          x: condNode.position.x + 280 * (i + 1),
          y: condNode.position.y + 120,
        },
      };
      if (!updated.nodes.some((n: any) => n.id === node.id)) {
        updated.nodes.push(node);
      }
      updated.edges.push({
        id: `edge_false_${lastFalseId}_${node.id}`,
        source: lastFalseId,
        target: node.id,
        sourceHandle: falseHandle,
        targetHandle: "target",
        label: falseHandle === "false" ? "False" : undefined,
      });
      lastFalseId = node.id;
      falseHandle = "source";
    }

    // If there were original anchor outgoing edges and falseBranchNodes were empty,
    // reconnect the original successor to the false handle
    if (falseNodes.length === 0 && originalAnchorEdges.length > 0) {
      for (const edge of originalAnchorEdges) {
        // remove original edge from anchor
        const eIdx = updated.edges.findIndex((e: any) => e.id === edge.id);
        if (eIdx !== -1) {
          updated.edges.splice(eIdx, 1);
        }
        // reconnect from condition false handle
        updated.edges.push({
          id: `edge_${condNode.id}_${edge.target}_false`,
          source: condNode.id,
          target: edge.target,
          sourceHandle: "false",
          targetHandle: edge.targetHandle || "target",
          label: "False",
        });
      }
    }
  }

  private static applyRemoveNode(updated: any, op: Extract<GraphPatchOperation, { op: "REMOVE_NODE" }>): void {
    const nodeIdx = updated.nodes.findIndex((n: any) => n.id === op.nodeId);
    if (nodeIdx === -1) return;

    if (op.reconnectStrategy === "bridge") {
      const incoming = updated.edges.filter((e: any) => e.target === op.nodeId);
      const outgoing = updated.edges.filter((e: any) => e.source === op.nodeId);

      for (const inEdge of incoming) {
        for (const outEdge of outgoing) {
          updated.edges.push({
            id: `edge_bridge_${inEdge.source}_to_${outEdge.target}`,
            source: inEdge.source,
            target: outEdge.target,
            sourceHandle: inEdge.sourceHandle || "source",
            targetHandle: outEdge.targetHandle || "target",
          });
        }
      }
    }

    // Remove node
    updated.nodes.splice(nodeIdx, 1);
    // Remove all edges referencing the node
    updated.edges = updated.edges.filter((e: any) => e.source !== op.nodeId && e.target !== op.nodeId);
  }

  private static applyReconnectEdge(updated: any, op: Extract<GraphPatchOperation, { op: "RECONNECT_EDGE" }>): void {
    if (op.edgeId) {
      const edge = updated.edges.find((e: any) => e.id === op.edgeId);
      if (edge) {
        edge.source = op.newEdge.source;
        edge.target = op.newEdge.target;
        if (op.newEdge.sourceHandle) edge.sourceHandle = op.newEdge.sourceHandle;
        if (op.newEdge.targetHandle) edge.targetHandle = op.newEdge.targetHandle;
        if (op.newEdge.label) edge.label = op.newEdge.label;
        return;
      }
    }

    if (op.oldEdge) {
      const idx = updated.edges.findIndex(
        (e: any) => e.source === op.oldEdge!.source && e.target === op.oldEdge!.target
      );
      if (idx !== -1) {
        updated.edges.splice(idx, 1);
      }
    }

    updated.edges.push({
      id: op.newEdge.id || `edge_${op.newEdge.source}_to_${op.newEdge.target}`,
      source: op.newEdge.source,
      target: op.newEdge.target,
      sourceHandle: op.newEdge.sourceHandle || "source",
      targetHandle: op.newEdge.targetHandle || "target",
      label: op.newEdge.label,
    });
  }

  /**
   * Topological Sort & Kahn's Algorithm for DAG cycle detection.
   * Throws an error if a cycle or self-referential loop is detected.
   */
  public static validateAcyclicDAG(workflow: any): void {
    const nodes: any[] = workflow.nodes || [];
    const edges: any[] = workflow.edges || [];

    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adj.set(node.id, []);
    }

    for (const edge of edges) {
      if (!adj.has(edge.source) || !inDegree.has(edge.target)) {
        continue;
      }
      if (edge.source === edge.target) {
        throw new Error(`Self-referential cyclic edge detected on node: '${edge.source}'`);
      }
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    let visitedCount = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      visitedCount++;

      for (const neighbor of adj.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (visitedCount !== nodes.length) {
      throw new Error(`Cycle detected in workflow graph: topological sort could not visit all ${nodes.length} nodes`);
    }
  }

  /**
   * Parse conversational, natural language graph modification instructions
   * into minimal, non-destructive AST GraphPatchOperation[]
   */
  public static parseConversationalPatch(
    instruction: string,
    currentWorkflow: any
  ): GraphPatchOperation[] {
    const text = instruction.toLowerCase().trim();
    const ops: GraphPatchOperation[] = [];
    const nodes: any[] = currentWorkflow.nodes || [];

    // 1. Branch / Condition Insertion
    // e.g. "Add high priority check after lead classification", "Insert condition amount > 50000"
    if (
      text.includes("condition") ||
      text.includes("branch") ||
      text.includes("split") ||
      text.includes("high priority") ||
      text.includes("urgent") ||
      text.includes("filter")
    ) {
      // Find anchor node to split after
      let anchorNode = nodes.find(
        (n) =>
          n.type === "aiNode" ||
          n.appId === "ai_extractor" ||
          n.id.includes("classify") ||
          n.id.includes("ai")
      );
      if (!anchorNode && nodes.length > 0) {
        anchorNode = nodes[0]; // fallback to trigger
      }

      let expression = "$json.urgency === 'HIGH'";
      if (text.includes("amount") || text.includes("50000") || text.includes("high value")) {
        expression = "$json.amount > 50000";
      } else if (text.includes("deal") || text.includes("10000")) {
        expression = "$json.dealValue > 10000";
      }

      const condId = `cond_${Date.now()}`;
      const vipNodeId = `vip_${Date.now()}`;

      // VIP Action Node (True branch)
      let vipService = "slack";
      let vipLabel = "High-Priority Slack Alert";
      let vipParams: Record<string, any> = { channel: "#high-priority-leads", message: "Urgent lead!" };

      if (text.includes("telegram")) {
        vipService = "telegram";
        vipLabel = "Telegram Urgent Alert";
        vipParams = { chatId: "@VIPAlerts", text: "🚨 High-Priority Lead Detected!" };
      }

      ops.push({
        op: "INSERT_BRANCH",
        splitAfterNodeId: anchorNode ? anchorNode.id : nodes[0]?.id || "trigger_1",
        conditionNode: {
          id: condId,
          type: "conditionNode",
          name: "High Urgency Check",
          label: "High Urgency Check",
          expression,
        },
        vipActionNode: {
          id: vipNodeId,
          type: "actionNode",
          appId: vipService,
          service: vipService,
          name: vipLabel,
          label: vipLabel,
          parameters: vipParams,
        },
      });

      return ops;
    }

    // 2. Remove Node
    // e.g. "Remove the Telegram step", "Delete slack node"
    if (text.startsWith("remove") || text.startsWith("delete")) {
      for (const node of nodes) {
        const idMatch = text.includes(node.id.toLowerCase());
        const serviceMatch =
          (node.service && text.includes(node.service.toLowerCase())) ||
          (node.appId && text.includes(node.appId.toLowerCase()));
        const labelMatch = node.label && text.includes(node.label.toLowerCase());

        if (idMatch || serviceMatch || labelMatch) {
          ops.push({
            op: "REMOVE_NODE",
            nodeId: node.id,
            reconnectStrategy: "bridge",
          });
          return ops;
        }
      }
    }

    // 3. Update Parameters
    // e.g. "Change Slack channel to #leads-alerts", "Update chatId to @MyFinance"
    if (text.includes("change") || text.includes("update") || text.includes("set")) {
      // Channel update
      const channelMatch = instruction.match(/#([a-zA-Z0-9_\-]+)/);
      if (channelMatch) {
        const slackNode = nodes.find(
          (n) => n.service === "slack" || n.appId === "slack" || n.id.includes("slack")
        );
        if (slackNode) {
          ops.push({
            op: "UPDATE_PARAMETERS",
            nodeId: slackNode.id,
            parameters: { channel: `#${channelMatch[1]}` },
          });
          return ops;
        }
      }

      // Telegram chat ID update
      const chatMatch = instruction.match(/@([a-zA-Z0-9_]+)/);
      if (chatMatch) {
        const tgNode = nodes.find(
          (n) => n.service === "telegram" || n.appId === "telegram" || n.id.includes("telegram")
        );
        if (tgNode) {
          ops.push({
            op: "UPDATE_PARAMETERS",
            nodeId: tgNode.id,
            parameters: { chatId: `@${chatMatch[1]}` },
          });
          return ops;
        }
      }

      // Query or folder update
      const folderMatch = instruction.match(/(?:folder|directory)\s+['"]?([a-zA-Z0-9_\-\/ ]+)['"]?/i);
      if (folderMatch) {
        const driveNode = nodes.find(
          (n) => n.service === "google_drive" || n.appId === "google_drive" || n.id.includes("drive")
        );
        if (driveNode) {
          ops.push({
            op: "UPDATE_PARAMETERS",
            nodeId: driveNode.id,
            parameters: { folderId: folderMatch[1].trim() },
          });
          return ops;
        }
      }
    }

    // 4. Insert Node
    // e.g. "Add Slack notification after Drive upload"
    if (text.includes("add") || text.includes("insert")) {
      let targetService = "slack";
      let targetType = "actionNode";
      let label = "Slack Notification";
      let params: Record<string, any> = { channel: "#general", message: "Step completed" };

      if (text.includes("telegram")) {
        targetService = "telegram";
        label = "Telegram Notification";
        params = { chatId: "@MyAlerts", text: "Notification" };
      } else if (text.includes("drive")) {
        targetService = "google_drive";
        label = "Upload to Drive";
        params = { folderId: "Invoices" };
      } else if (text.includes("ai") || text.includes("classifier")) {
        targetService = "ai_extractor";
        targetType = "aiNode";
        label = "AI Intent Classifier";
        params = { task: "classify" };
      }

      // Relative node anchor
      const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : undefined;
      const newNodeId = `node_${targetService}_${Date.now()}`;

      ops.push({
        op: "INSERT_NODE",
        node: {
          id: newNodeId,
          type: targetType,
          service: targetService,
          appId: targetService,
          label,
          parameters: params,
        },
        position: {
          relativeToNodeId: lastNode?.id,
          placement: "after",
        },
      });

      return ops;
    }

    // Default fallback: parameter update or no-op
    return ops;
  }
}
