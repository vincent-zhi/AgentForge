export type FactType = 'module' | 'contract' | 'command' | 'risk' | 'decision' | 'test' | 'api' | 'schema';
export type Confidence = 'low' | 'medium' | 'high';
export type FactStatus = 'candidate' | 'active' | 'stale' | 'rejected' | 'replaced';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type LeaseStatus = 'active' | 'expired' | 'revoked';
export type TaskStatus = 'draft' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed' | 'cancelled';
export type IntentType = 'business_fix' | 'compatibility' | 'test_coverage' | 'documentation' | 'refactor';
export type ContractType = 'api' | 'type' | 'behavior' | 'ui' | 'data' | 'api_route' | 'type_export' | 'event_handler' | 'function_export' | 'class_export' | 'enum_export';
export type CommandRisk = 'safe' | 'medium' | 'high';
export type AgentRole = 'orchestrator' | 'architect' | 'impact' | 'contract' | 'search' | 'coder' | 'tester' | 'reviewer' | 'doc';

export interface Scope {
  modules: string[];
}

export interface Evidence {
  source: 'code' | 'test' | 'pr' | 'ci' | 'human' | 'agent_inference';
  files?: string[];
  commit?: string;
  command?: string;
}

export interface ExpiryCondition {
  type: 'file_change' | 'time' | 'manual';
  value: string;
}

export interface ProjectFact {
  id: string;
  type: FactType;
  statement: string;
  scope: Scope;
  evidence: Evidence[];
  confidence: Confidence;
  status: FactStatus;
  expiresWhen: ExpiryCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleRef {
  name: string;
  path: string;
  type: 'package' | 'directory' | 'file';
}

export interface ContractRef {
  id: string;
  type: ContractType;
  name: string;
  provider: string;
  consumers: string[];
  compatibility: 'must_preserve' | 'should_preserve' | 'flexible' | 'may_evolve' | 'internal';
  signature?: string;
  location?: { file: string; line: number };
}

export interface TestCommand {
  command: string;
  cwd?: string;
  module: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export interface ChangeTarget {
  module: string;
  files: string[];
}

export interface ImpactMap {
  taskId: string;
  target: ChangeTarget;
  upstreamDependencies: ModuleRef[];
  downstreamDependents: ModuleRef[];
  contractsTouched: ContractRef[];
  affectedTests: TestCommand[];
  forbiddenChanges: string[];
  risk: RiskAssessment;
  reviewFocus: string[];
  plannedImpactHash: string;
  actualImpactHash?: string;
}

export interface ReviewPolicy {
  requireImpactGuard: boolean;
  requireAllTests: boolean;
  maxRiskLevel: RiskLevel;
  requireHumanApproval: boolean;
}

export interface TaskCapsule {
  id: string;
  goal: string;
  nonGoals: string[];
  writable: string[];
  readonly: string[];
  forbidden: string[];
  mustPreserve: ContractRef[];
  affectedModules: ModuleRef[];
  requiredTests: TestCommand[];
  reviewPolicy: ReviewPolicy;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContextLease {
  id: string;
  taskId: string;
  agentId: string;
  agentRole: AgentRole;
  canRead: string[];
  canWrite: string[];
  canUseFacts: string[];
  tools: string[];
  expiresAt: string;
  requiresApprovalFor: string[];
  status: LeaseStatus;
}

export interface ChangedFile {
  path: string;
  intent: IntentType;
  additions: number;
  deletions: number;
  outOfScope?: boolean;
}

export interface IntentDiff {
  file: string;
  hunks: IntentHunk[];
}

export interface IntentHunk {
  intent: IntentType;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface VerificationResult {
  type: 'test' | 'contract' | 'lint' | 'build';
  name: string;
  passed: boolean;
  details?: string;
}

export interface UnverifiedItem {
  type: 'test' | 'contract' | 'assumption' | 'path';
  description: string;
  risk: RiskLevel;
}

export interface MemoryUpdateProposal {
  factId?: string;
  action: 'create' | 'update' | 'stale' | 'reject';
  fact: Partial<ProjectFact>;
  reason: string;
}

export interface SuggestedPr {
  title: string;
  body: string;
  labels: string[];
  reviewers: string[];
}

export interface ReviewPacket {
  taskId: string;
  result: 'success' | 'partial' | 'failed';
  changedFiles: ChangedFile[];
  intentDiff: IntentDiff[];
  impactMap: ImpactMap;
  verification: VerificationResult[];
  risks: RiskAssessment[];
  reviewerFocus: string[];
  unverifiedItems: UnverifiedItem[];
  memoryUpdates: MemoryUpdateProposal[];
  suggestedPr: SuggestedPr;
  isOutOfScope: boolean;
  hasBreakingChange: boolean;
  plannedVsActual?: {
    match: boolean;
    outOfScopeFiles: string[];
    newContractsTouched: number;
    newAffectedTests: number;
  };
}

export interface EvidenceEntry {
  id: string;
  taskId: string;
  agentId: string;
  type: 'command' | 'test' | 'git' | 'agent_log' | 'file_read' | 'file_write' | 'sandbox' | 'ci';
  content: string;
  result?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  agentId: string;
  action: string;
  target: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface BlackboardEvent {
  id: string;
  type: string;
  agentId: string;
  taskId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ModuleInfo {
  name: string;
  path: string;
  type: 'package' | 'directory';
  language?: string;
  framework?: string;
  dependencies: string[];
  exports: string[];
  testCommand?: string;
  riskLevel: RiskLevel;
}

export type FeatureTier = 'free' | 'pro' | 'team' | 'enterprise';
export type FeatureName = 'project_brain' | 'impact_guard' | 'single_agent' | 'multi_agent' | 'context_lease' | 'evidence_review' | 'worktree_sandbox' | 'team_brain' | 'pr_integration' | 'team_policy' | 'agent_audit' | 'custom_agent' | 'private_model' | 'sso' | 'rbac';

export type MonorepoType = 'pnpm' | 'nx' | 'lerna' | 'yarn' | 'npm' | 'turborepo' | 'none';

export interface TsconfigPathMapping {
  pattern: string;
  paths: string[];
}

export interface TsconfigReference {
  path: string;
}

export interface ProjectScanResult {
  rootPath: string;
  name: string;
  language: string;
  framework?: string;
  packageManager?: string;
  modules: ModuleInfo[];
  testCommands: TestCommand[];
  highRiskPaths: string[];
  monorepo?: MonorepoType;
  workspaces?: string[];
  tsconfigPaths?: TsconfigPathMapping[];
  tsconfigReferences?: TsconfigReference[];
}

export type ModelPermissionPolicy = {
  allowedModels: string[];
  localOnlyPaths: string[];
  maxCostPerTask: number;
  allowThirdParty: boolean;
  maxContextSize: number;
};
