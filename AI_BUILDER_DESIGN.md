# QuickReply Conversational AI Builder & AST Graph Patch Engine

**Document Version:** 3.0  
**Status:** Living Engineering Design Specification  
**Classification:** Core AI & Compiler Architecture  
**Core Modules:** `AutomationPlannerAgent.ts`, `WorkflowPatchEngine.ts`, `WorkflowCompiler.ts`  
**Last Updated:** 2026-11-01  

---

## 1. Executive Summary & Design Goals

The **Conversational AI Workflow Builder** allows business operators, engineers, and non-technical users to build, update, and debug complex enterprise automations purely through natural language. 

Traditional conversational automation tools suffer from two critical architectural failure modes:
1. **Destructive Re-Synthesis**: When a user asks for a modification (e.g. *"Also notify Slack if the deal is greater than $50k"*), naive agents re-generate the entire workflow from scratch, wiping out previously configured parameters, custom code, and connected credential bindings.
2. **Hallucination of Fictional Connectors**: LLMs frequently invent non-existent APIs, impossible trigger modalities, or invalid parameter names.

QuickReply solves these failure modes through:
- **Integration Catalog Grounding**: The AI Planner's prompt is strictly conditioned on the formal, validated schemas from `IntegrationCatalog.ts`.
- **The Non-Destructive AST Graph Patch Engine**: All conversational edits are compiled into atomic **Graph Patch Operations** (`INSERT_NODE`, `INSERT_BRANCH`, `UPDATE_PARAMETERS`, etc.) that mutate the workflow AST without disturbing unaffected nodes.
- **Interactive Clarification & Credential Prompter**: If required parameters or credentials are missing, the agent halts, generating interactive UI chips and modal triggers rather than guessing values.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CONVERSATIONAL BUILDER & PATCH PIPELINE                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [User Natural Language Prompt]                                                       │
│   "When a lead signs up, add to Sheets, score with Claude, and if Enterprise alert CRM"│
│                 │                                                                      │
│                 ▼                                                                      │
│   [AutomationPlannerAgent]                                                             │
│   - Ingests user prompt + current Workflow AST + Conversation Thread History           │
│   - Grounded in `IntegrationCatalog.getAll()`                                          │
│   - Detects Missing Required Fields or Missing Workspace Credentials                   │
│                 │                                                                      │
│                 ├── Missing Parameters? ──► Returns Clarification Chips to UI          │
│                 │                                                                      │
│                 ▼                                                                      │
│   [AST Graph Patch Synthesis]                                                          │
│   Generates atomic operations: `INSERT_NODE`, `INSERT_BRANCH`, `UPDATE_PARAMETERS`     │
│                 │                                                                      │
│                 ▼                                                                      │
│   [WorkflowPatchEngine]                                                                │
│   - Applies operations to current `WorkflowDefinitionV3`                               │
│   - Preserves all unchanged step IDs, credential references, and parameter overrides   │
│                 │                                                                      │
│                 ▼                                                                      │
│   [WorkflowCompiler Validation]                                                        │
│   - Executes DFS Cycle Detection (rejects circular dependencies with HTTP 422)         │
│   - Validates parameter types against Zod schemas                                      │
│                 │                                                                      │
│                 ▼                                                                      │
│   [Canvas Live Synchronization]                                                        │
│   - Pushes updated graph to `@xyflow/react` store via WebSocket / SSE                  │
│   - Triggers Framer Motion smooth auto-layout realignment (Dagre)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NLP Intent Parsing & Catalog Grounding

### 2.1 Catalog Prompt Injection
To guarantee that the planner never invents non-existent platforms or actions, the system prompt injects the verified catalog manifest:

```typescript
export interface CatalogManifestEntry {
  appId: string;
  displayName: string;
  description: string;
  triggers: Array<{ id: string; name: string; description: string; requiredConfig: string[] }>;
  actions: Array<{ id: string; name: string; description: string; requiredFields: string[]; riskLevel: string }>;
}
```

### 2.2 System Prompt Specification (`SYSTEM_PLANNER_PROMPT`)

```markdown
You are the QuickReply Principal Automation Architect & Graph Compiler.
Your role is to translate natural language user goals into deterministic, executable workflow graphs or atomic graph patches.

CRITICAL INVARIANTS:
1. ONLY use apps and action IDs listed in the provided INTEGRATION_CATALOG.
2. NEVER wipe out an existing workflow if the user is asking for an incremental change. Always output targeted `GraphPatchOperation` items.
3. For conditional routing, use a `conditionNode` with `true` and `false` output handles.
4. If a required credential or required configuration parameter (e.g. spreadsheet ID, channel name) is missing, emit a `clarificationRequest`.
5. Output ONLY valid JSON matching the `AIPlannerResponse` schema.
```

### 2.3 Structured Output Schema (`AIPlannerResponse`)

```typescript
export interface AIPlannerResponse {
  replyText: string;                   // Explanation of the automation or changes made
  intent: "CREATE_WORKFLOW" | "MODIFY_WORKFLOW" | "CLARIFY" | "EXPLAIN" | "DEBUG";
  
  // When creating a new workflow from scratch:
  fullWorkflow?: WorkflowDefinitionV3;
  
  // When incrementally modifying an existing workflow (Scenario E):
  graphPatch?: {
    workflowId: string;
    operations: GraphPatchOperation[];
    explanation: string;
  };
  
  // When required inputs are missing:
  clarificationRequests?: Array<{
    type: "PARAMETER" | "CREDENTIAL";
    appId: string;
    parameterName?: string;
    question: string;
    suggestionChips: string[];
  }>;
}
```

---

## 3. The Non-Destructive AST Graph Patch Engine

### 3.1 Formal Patch Operation Definitions

```typescript
export type GraphPatchOperation =
  | {
      op: "INSERT_NODE";
      node: {
        id: string;                    // step_<uuidv4>
        type: "actionNode" | "aiNode" | "customScriptNode" | "loopNode";
        name: string;
        appId: string;
        actionId: string;
        credentialRef?: string;
        parameters: Record<string, any>;
      };
      position: {
        relativeToNodeId: string;      // Anchor node ID
        placement: "before" | "after";
      };
    }
  | {
      op: "INSERT_BRANCH";
      splitAfterNodeId: string;        // Upstream node before condition
      conditionNode: {
        id: string;
        type: "conditionNode";
        name: string;
        expression: string;            // AST expression, e.g. "$json.amount > 50000"
      };
      trueBranchNodes: Array<any>;     // Nodes placed along 'true' handle
      falseBranchNodes: Array<any>;    // Nodes placed along 'false' handle
    }
  | {
      op: "UPDATE_PARAMETERS";
      nodeId: string;
      parameters: Record<string, any>; // Partial or merged parameter updates
    }
  | {
      op: "REMOVE_NODE";
      nodeId: string;
      reconnectStrategy: "bridge" | "orphan"; // "bridge": connects predecessors directly to successors
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
```

---

### 3.2 Detailed Patch Application Algorithm (`WorkflowPatchEngine.ts`)

```typescript
export class WorkflowPatchEngine {
  public static applyPatch(
    currentWorkflow: WorkflowDefinitionV3,
    operations: GraphPatchOperation[]
  ): WorkflowDefinitionV3 {
    // 1. Deep clone current workflow to ensure absolute immutability
    const updated: WorkflowDefinitionV3 = JSON.parse(JSON.stringify(currentWorkflow));
    
    for (const op of operations) {
      switch (op.op) {
        case "INSERT_NODE": {
          const anchorIdx = updated.nodes.findIndex(n => n.id === op.position.relativeToNodeId);
          if (anchorIdx === -1) throw new Error(`Anchor node ${op.position.relativeToNodeId} not found`);
          
          const anchorNode = updated.nodes[anchorIdx];
          const newNode = {
            ...op.node,
            position: { x: anchorNode.position.x + 280, y: anchorNode.position.y }
          };
          
          if (op.position.placement === "after") {
            // Find existing outgoing edges from anchor
            const outgoingEdges = updated.edges.filter(e => e.source === anchorNode.id);
            // Rewire outgoing edges to source from new node
            for (const edge of outgoingEdges) {
              edge.source = newNode.id;
            }
            // Add new edge from anchor to new node
            updated.edges.push({
              id: `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              source: anchorNode.id,
              target: newNode.id,
              sourceHandle: "source",
              targetHandle: "target"
            });
          }
          updated.nodes.push(newNode);
          break;
        }
        
        case "INSERT_BRANCH": {
          const anchorIdx = updated.nodes.findIndex(n => n.id === op.splitAfterNodeId);
          if (anchorIdx === -1) throw new Error(`Split node ${op.splitAfterNodeId} not found`);
          const anchorNode = updated.nodes[anchorIdx];
          
          const condNode = {
            ...op.conditionNode,
            appId: "condition",
            actionId: "evaluate",
            parameters: { expression: op.conditionNode.expression },
            position: { x: anchorNode.position.x + 280, y: anchorNode.position.y }
          };
          updated.nodes.push(condNode);
          
          // Edge from anchor to condition node
          updated.edges.push({
            id: `edge_split_${condNode.id}`,
            source: anchorNode.id,
            target: condNode.id,
            sourceHandle: "source",
            targetHandle: "target"
          });
          
          // Wire true branch
          let lastTrueNodeId = condNode.id;
          let trueHandle: any = "true";
          for (let i = 0; i < op.trueBranchNodes.length; i++) {
            const node = {
              ...op.trueBranchNodes[i],
              position: { x: condNode.position.x + 280 * (i + 1), y: condNode.position.y - 120 }
            };
            updated.nodes.push(node);
            updated.edges.push({
              id: `edge_true_${node.id}`,
              source: lastTrueNodeId,
              target: node.id,
              sourceHandle: trueHandle,
              targetHandle: "target",
              label: trueHandle === "true" ? "True" : undefined
            });
            lastTrueNodeId = node.id;
            trueHandle = "source";
          }
          
          // Wire false branch
          let lastFalseNodeId = condNode.id;
          let falseHandle: any = "false";
          for (let i = 0; i < op.falseBranchNodes.length; i++) {
            const node = {
              ...op.falseBranchNodes[i],
              position: { x: condNode.position.x + 280 * (i + 1), y: condNode.position.y + 120 }
            };
            updated.nodes.push(node);
            updated.edges.push({
              id: `edge_false_${node.id}`,
              source: lastFalseNodeId,
              target: node.id,
              sourceHandle: falseHandle,
              targetHandle: "target",
              label: falseHandle === "false" ? "False" : undefined
            });
            lastFalseNodeId = node.id;
            falseHandle = "source";
          }
          break;
        }
        
        case "UPDATE_PARAMETERS": {
          const node = updated.nodes.find(n => n.id === op.nodeId);
          if (!node) throw new Error(`Node ${op.nodeId} not found`);
          node.parameters = { ...node.parameters, ...op.parameters };
          break;
        }
        
        case "REMOVE_NODE": {
          const nodeIdx = updated.nodes.findIndex(n => n.id === op.nodeId);
          if (nodeIdx === -1) break;
          
          if (op.reconnectStrategy === "bridge") {
            const incoming = updated.edges.filter(e => e.target === op.nodeId);
            const outgoing = updated.edges.filter(e => e.source === op.nodeId);
            
            for (const inEdge of incoming) {
              for (const outEdge of outgoing) {
                updated.edges.push({
                  id: `edge_bridge_${Date.now()}`,
                  source: inEdge.source,
                  target: outEdge.target,
                  sourceHandle: inEdge.sourceHandle,
                  targetHandle: outEdge.targetHandle
                });
              }
            }
          }
          
          updated.nodes.splice(nodeIdx, 1);
          updated.edges = updated.edges.filter(e => e.source !== op.nodeId && e.target !== op.nodeId);
          break;
        }
      }
    }
    
    // 2. Increment version and update timestamp
    updated.version += 1;
    updated.updatedAt = new Date().toISOString();
    
    // 3. Cycle Validation via DFS
    WorkflowCompiler.validateAcyclicDAG(updated);
    
    return updated;
  }
}
```

---

## 4. Scenario E Case Study: Conversational Workflow Modification

To satisfy **Scenario E** of Requirement R8:

### Turn 1: Initial Workflow Creation
- **User Prompt**: *"When a customer pays via Stripe, send a receipt to their WhatsApp."*
- **Planner Action**: Synthesizes 2-step workflow:
  1. `Stripe Trigger` (`payment_succeeded`)
  2. `WhatsApp Action` (`send_message`)
- **Result**: `WorkflowDefinitionV3` (Version 1) committed and rendered on canvas.

### Turn 2: Non-Destructive Conditional Branch Insertion
- **User Prompt**: *"If the payment amount is greater than $500, also notify the #vip-customers Slack channel."*
- **Planner Action**:
  - Recognizes modification context on existing workflow.
  - Generates `INSERT_BRANCH` patch:
    - `splitAfterNodeId`: `step_stripe_trigger`
    - `conditionNode`: `expression: "$json.amount > 500"`
    - `trueBranchNodes`: `[ { appId: "slack", actionId: "post_message", parameters: { channel: "#vip-customers" } } ]`
    - `falseBranchNodes`: `[]` (falls through or routes to standard path)
- **Patch Execution**:
  - The Stripe Trigger parameters and WhatsApp credentials remain 100% intact.
  - A condition node is inserted.
  - The Slack node is connected to the `true` output port.
  - Version increments from $v1 \to v2$.
  - The canvas animates the new condition and branch in real time.

---

## 5. Missing Parameter & Credential Prompter

When a user's instruction is underspecified (e.g. *"Append new emails to Google Sheets"* without mentioning the sheet name or spreadsheet ID):

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PROACTIVE CLARIFICATION CARD                      │
├────────────────────────────────────────────────────────────────────────┤
│ 💬 QuickReply Assistant:                                               │
│ "I've structured your email-to-sheet automation. To complete the       │
│ configuration, which Google Sheet tab should rows be added to?"        │
│                                                                        │
│ [Sheet1]   [Customer Leads]   [Inbound Log]   [+ Custom Name...]       │
│                                                                        │
│ ⚠️ Missing Credential:                                                 │
│ "Google Workspace is not connected in this workspace."                 │
│ [Connect Google Workspace via OAuth ↗]                                 │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Clarification Card UI**: Rendered via `ClarificationPillGroup.tsx` in the chat panel. Clicking any suggestion pill directly answers the prompt and applies the parameter patch.
2. **Credential Prompt Card**: Rendered via `CredentialPromptCard.tsx`. Clicking opens the OAuth popup, connects the service, binds the new `cred_<uuid>` to the pending node, and resumes execution seamlessly.
