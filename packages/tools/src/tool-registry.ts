import { DEFAULT_ORGANIZATION_POLICY, type ContextLease, type OrganizationPolicy, type ToolName } from '@agentforge/core';
import { assertLeaseAllowsTool, type AuditLog } from '@agentforge/runtime';

export interface ToolCallContext {
  taskId: string;
  agentId: string;
  lease: ContextLease;
  auditLog?: AuditLog;
  policy?: OrganizationPolicy;
}

export interface ToolCallResult<T = unknown> {
  tool: ToolName | string;
  status: 'ok' | 'error' | 'approval_required';
  data?: T;
  error?: string;
  log?: string;
}

export type ToolHandler<TInput = unknown, TOutput = unknown> = (input: TInput, context: ToolCallContext) => Promise<ToolCallResult<TOutput>>;

export class ToolRegistry {
  private readonly tools = new Map<string, { name: ToolName; handler: ToolHandler }>();

  register<TInput, TOutput>(id: string, name: ToolName, handler: ToolHandler<TInput, TOutput>): void {
    this.tools.set(id, { name, handler: handler as ToolHandler });
  }

  async call<TInput, TOutput>(id: string, input: TInput, context: ToolCallContext): Promise<ToolCallResult<TOutput>> {
    const entry = this.tools.get(id);
    if (!entry) return { tool: id, status: 'error', error: `Unknown tool: ${id}` };
    try {
      assertLeaseAllowsTool(context.lease, entry.name, context.policy ?? DEFAULT_ORGANIZATION_POLICY);
      const result = await entry.handler(input, context) as ToolCallResult<TOutput>;
      context.auditLog?.record({
        taskId: context.taskId,
        agentId: context.agentId,
        action: 'tool_call',
        status: result.status,
        target: id,
        payload: { tool: entry.name, error: result.error }
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.auditLog?.record({ taskId: context.taskId, agentId: context.agentId, action: 'tool_call', status: 'error', target: id, payload: { tool: entry.name, error: message } });
      return { tool: id, status: 'error', error: message };
    }
  }
}
