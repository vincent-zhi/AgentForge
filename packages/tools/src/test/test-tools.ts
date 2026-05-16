import { runShellTool } from '../shell/shell-tools.js';
import type { ToolCallContext, ToolCallResult } from '../tool-registry.js';
import { assertLeaseAllowsTool } from '@agentforge/runtime';

export interface RunTestInput { command: string; cwd: string }

export async function runTestTool(input: RunTestInput, context: ToolCallContext): Promise<ToolCallResult<{ passed: boolean; output: string }>> {
  assertLeaseAllowsTool(context.lease, 'run_test');
  const result = await runShellTool({ ...input, timeoutMs: 180_000 }, { ...context, lease: { ...context.lease, tools: [...new Set([...context.lease.tools, 'run_shell' as const])] } });
  return { tool: 'run_test', status: result.status, data: { passed: result.status === 'ok', output: result.data?.output ?? '' }, log: result.log };
}
