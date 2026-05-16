export type AuditAction = 'tool_call' | 'file_read' | 'file_write' | 'command_run' | 'lease_granted' | 'context_requested' | 'checkpoint_created' | 'changes_applied' | 'changes_discarded';

export interface AuditLogEntry<TPayload = Record<string, unknown>> {
  id: string;
  taskId: string;
  agentId: string;
  action: AuditAction;
  timestamp: string;
  target?: string;
  status: 'ok' | 'error' | 'approval_required';
  payload: TPayload;
}
