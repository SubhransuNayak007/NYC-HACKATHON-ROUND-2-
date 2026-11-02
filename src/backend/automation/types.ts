/**
 * ============================================================================
 * QuickReply AI Automation Operating System — Domain Types & Interfaces
 * src/backend/automation/types.ts
 *
 * Defines the core contracts for:
 * 1. Normalized Workflow Specifications (WorkflowSpec v2.0)
 * 2. Integration Knowledge Catalog & Action Schemas
 * 3. Execution Provider Abstraction (n8n, LangGraph, Native)
 * 4. Human-in-the-Loop Side Effect Governance
 * 5. Multi-turn AI Requirement Discovery & Planning
 * ============================================================================
 */

export type SideEffectClassification =
  | "SAFE_READ"
  | "REVERSIBLE"
  | "EXTERNAL_COMMUNICATION"
  | "FINANCIAL"
  | "DESTRUCTIVE";

export type RuntimeTarget = "n8n" | "langgraph" | "native" | "hybrid";

export type WorkflowStatus =
  | "DRAFT"
  | "REQUIREMENTS_COMPLETE"
  | "GENERATED"
  | "VALIDATING"
  | "VALIDATED"
  | "TESTING"
  | "TEST_PASSED"
  | "TEST_FAILED"
  | "AWAITING_APPROVAL"
  | "DEPLOYING"
  | "ACTIVE"
  | "MONITORING"
  | "PAUSED"
  | "FAILED"
  | "ARCHIVED";

export interface ParameterSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  label?: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  sideEffect: SideEffectClassification;
  requiresApprovalByDefault: boolean;
  inputSchema: Record<string, ParameterSchema>;
  outputSchema: Record<string, ParameterSchema>;
  n8nNodeMapping?: {
    nodeType: string;
    typeVersion: number;
    resource?: string;
    operation?: string;
  };
}

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  type: "schedule" | "webhook" | "poll" | "event";
  inputSchema: Record<string, ParameterSchema>;
  outputSchema: Record<string, ParameterSchema>;
  n8nNodeMapping?: {
    nodeType: string;
    typeVersion: number;
    event?: string;
  };
}

export interface IntegrationDefinition {
  appId: string;
  name: string;
  category: "productivity" | "channels" | "crm" | "finance" | "developer" | "utilities";
  description: string;
  iconName: string;
  authType: "oauth2" | "api_key" | "webhook_secret" | "none";
  requiredScopes?: string[];
  docsUrl?: string;
  triggers: IntegrationTrigger[];
  actions: IntegrationAction[];
}

export interface WorkflowStep {
  id: string;
  appId: string;
  actionId: string;
  label: string;
  credentialRef?: string; // Opaque reference, e.g. "cred_gmail_01" (NEVER plaintext secret)
  parameters: Record<string, any>;
  dependsOn: string[];
  sideEffect: SideEffectClassification;
  approvalRequired: boolean;
  approvalCondition?: string; // e.g. "amount > 50000"
}

export interface WorkflowTriggerSpec {
  type: "schedule" | "webhook" | "event" | "manual";
  appId: string;
  triggerId: string;
  credentialRef?: string;
  config: Record<string, any>; // e.g. { cron: "0 9 * * *", timezone: "Asia/Kolkata" }
}

export interface WorkflowSpec {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  description: string;
  businessObjective: string;
  runtimeTarget: RuntimeTarget;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTriggerSpec;
  steps: WorkflowStep[];
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    jitter: boolean;
  };
  syntheticTests?: SyntheticTestCase[];
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
}

export interface SyntheticTestCase {
  id: string;
  name: string;
  description: string;
  inputPayload: Record<string, any>;
  expectedAssertions: Array<{
    stepId: string;
    field: string;
    operator: "equals" | "greater_than" | "contains" | "exists";
    value: any;
  }>;
}

export interface ClarificationQuestion {
  id: string;
  field: string;
  question: string;
  reason: string;
  suggestedOptions?: string[];
  defaultValue?: any;
}

export interface IntentAnalysisResult {
  businessObjective: string;
  confidence: number;
  identifiedApps: string[];
  triggerType: "schedule" | "webhook" | "event" | "manual";
  missingRequirements: ClarificationQuestion[];
  suggestedRuntime: RuntimeTarget;
  estimatedRisk: "low" | "medium" | "high";
}

export interface DeploymentResult {
  deploymentId: string;
  workflowId: string;
  version: number;
  provider: RuntimeTarget;
  status: "ACTIVE" | "INACTIVE";
  externalWorkflowId?: string;
  editorUrl?: string;
  webhookUrl?: string;
  deployedAt: string;
}

export interface TestExecutionResult {
  success: boolean;
  durationMs: number;
  stepResults: Array<{
    stepId: string;
    label: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    simulatedOutput?: Record<string, any>;
    error?: string;
  }>;
  assertionFailures?: string[];
}

export interface IExecutionProvider {
  readonly providerId: RuntimeTarget;
  deploy(spec: WorkflowSpec, credentials: Record<string, any>): Promise<DeploymentResult>;
  executeDryRun(spec: WorkflowSpec, testInputs: Record<string, any>): Promise<TestExecutionResult>;
  activate(deploymentId: string): Promise<boolean>;
  deactivate(deploymentId: string): Promise<boolean>;
  getExecutionLogs(executionId: string): Promise<any[]>;
}


// ============================================================================
// MASTER PROMPT V2 — HUMAN-LIKE AI AUTOMATION ENGINEER DOMAIN CONTRACTS
// ============================================================================

export type DiscoveryState =
  | "DISCOVERY"
  | "INTENT_ANALYSIS"
  | "REQUIREMENT_EXTRACTION"
  | "CONNECTOR_DISCOVERY"
  | "CONNECTOR_CAPABILITY_VERIFICATION"
  | "MISSING_INFORMATION_RESOLUTION"
  | "AUTHENTICATION"
  | "TARGET_RESOURCE_RESOLUTION"
  | "TECHNICAL_FEASIBILITY_CHECK"
  | "PLAN_GENERATION"
  | "USER_APPROVAL"
  | "WORKFLOW_CONSTRUCTION"
  | "STATIC_VALIDATION"
  | "CONFIGURATION_VALIDATION"
  | "TESTING"
  | "USER_ACTIVATION_APPROVAL"
  | "PUBLISHING"
  | "ACTIVE"
  | "MONITORING"
  | "PAUSED"
  | "CANCELLED"
  | "FAILED"
  | "NEEDS_REVISION";

export type ConnectorPrerequisiteStatus =
  | "READY"
  | "MISSING_CREDENTIAL"
  | "INVALID_CREDENTIAL"
  | "MISSING_RECIPIENT"
  | "MISSING_RESOURCE"
  | "MISSING_PARAMETER"
  | "INSUFFICIENT_PERMISSION"
  | "PROVIDER_CONFIGURATION_REQUIRED"
  | "UNSUPPORTED_OPERATION"
  | "NEEDS_USER_APPROVAL"
  | "BLOCKED";

export interface RequirementSlot {
  id: string;
  category:
    | "objective"
    | "trigger"
    | "input"
    | "processing"
    | "destination"
    | "identity"
    | "configuration"
    | "safety"
    | "reliability"
    | "activation";
  name: string;
  value?: any;
  status: "resolved" | "missing" | "inferred";
  source?: "user_prompt" | "clarification" | "connector_metadata" | "default" | "inferred";
  description: string;
  validationRule?: string;
}

export interface RequirementDocument {
  id: string;
  objective: string;
  trigger: {
    type: string;
    source: string;
    details?: Record<string, any>;
  };
  actions: Array<{
    service: string;
    operation: string;
    details?: Record<string, any>;
  }>;
  recipient: {
    required: boolean;
    resolved: boolean;
    value?: string;
    source?: string;
  };
  message: {
    required: boolean;
    templateId?: string;
    content?: string;
    dynamicFields?: string[];
  };
  credentials: Record<string, "required" | "connected" | "missing">;
  executionMode: "event_driven" | "scheduled" | "manual" | "batch";
  approvalRequired: boolean;
  status: "missing_requirements" | "requirements_complete" | "approved";
  slots: Record<string, RequirementSlot>;
  riskLevel: "low" | "medium" | "high";
}

export interface PlanDataMapping {
  targetField: string;
  expression: string;
  sourceNodeId: string;
  sourceField: string;
  sampleValue?: any;
}

export interface PlanStep {
  id: string;
  appId: string;
  actionId: string;
  label: string;
  description: string;
  credentialRef?: string;
  parameters: Record<string, any>;
  dataMappings: PlanDataMapping[];
  dependsOn: string[];
  sideEffect: SideEffectClassification;
  approvalRequired: boolean;
  retryPolicy?: { maxAttempts: number; backoffMs: number };
}

export interface PlanConnectorRequirement {
  connectorId: string;
  name: string;
  operation: string;
  accountIdentity?: string;
  connectionStatus: "connected" | "missing" | "reauth_needed";
  authorizationStatus: "authorized" | "unauthorized" | "pending";
  requiredPermissions: string[];
  selectedResources?: Record<string, any>;
  prerequisiteStatus: ConnectorPrerequisiteStatus;
  prerequisiteReason?: string;
}

export interface AutomationPlan {
  id: string;
  conversationId: string;
  tenantId: string;
  workspaceId: string;
  version: number;
  title: string;
  objective: string;
  trigger: {
    appId: string;
    triggerId: string;
    label: string;
    config: Record<string, any>;
  };
  connectors: PlanConnectorRequirement[];
  steps: PlanStep[];
  dataMappings: PlanDataMapping[];
  conditionalLogic?: Array<{
    condition: string;
    trueStepIds: string[];
    falseStepIds: string[];
  }>;
  recipients: Array<{
    destination: string;
    addressOrChannel: string;
    verified: boolean;
  }>;
  safety: {
    externalSideEffects: boolean;
    externalDestinations: string[];
    financialOrDestructive: boolean;
    dataModificationPolicy: string;
  };
  reliability: {
    maxRetries: number;
    retryBackoffMs: number;
    failureNotificationChannel?: string;
  };
  executionBehavior: "event_driven" | "scheduled" | "webhook" | "manual" | "batch";
  outstandingRequirements: string[];
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanApprovalRecord {
  id: string;
  planId: string;
  planVersion: number;
  tenantId: string;
  userId: string;
  approvedAt: string;
  planSnapshot: AutomationPlan;
  signature: string;
}

export interface ActivationApprovalRecord {
  id: string;
  workflowId: string;
  tenantId: string;
  activatedAt: string;
  activatedBy: string;
  executionLimits: {
    maxRunsPerHour: number;
    allowedDestinations: string[];
  };
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  stage?: DiscoveryState;
  onboardingCard?: any;
  planCard?: AutomationPlan;
  timestamp: string;
}

export interface AutomationConversation {
  id: string;
  tenantId: string;
  workspaceId: string;
  state: DiscoveryState;
  turns: ConversationTurn[];
  activeRequirementDocId?: string;
  activePlanId?: string;
  activeWorkflowDraftId?: string;
  outstandingQuestions: ClarificationQuestion[];
  createdAt: string;
  updatedAt: string;
}
