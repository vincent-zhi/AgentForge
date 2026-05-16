export type AgentRole = 'orchestrator' | 'architect' | 'impact' | 'contract' | 'search' | 'coder' | 'tester' | 'reviewer' | 'doc';
export type ToolName = 'read_file' | 'edit_file' | 'create_file' | 'delete_file' | 'rename_file' | 'search' | 'run_shell' | 'run_test' | 'git' | 'preview' | 'mcp';

export interface ContextLease {
  agent: AgentRole | string;
  taskId: string;
  leaseId: string;
  canRead: string[];
  canWrite: string[];
  canUseFacts: string[];
  tools: ToolName[];
  requiresApprovalFor: string[];
}

export interface ContextRequest {
  event: 'request_context';
  agent: string;
  taskId: string;
  reason: string;
  requestedFiles: string[];
  requestedTools?: ToolName[];
}

export interface AgentTimelineEvent<TPayload = Record<string, unknown>> {
  event: string;
  agent?: string;
  taskId: string;
  timestamp: string;
  payload: TPayload;
  evidenceRef?: string;
}
