import { runShellTool, type ShellToolInput } from '../shell/shell-tools.js';
import type { ToolCallContext, ToolCallResult } from '../tool-registry.js';
import { assertLeaseAllowsTool } from '@agentforge/runtime';

export async function gitTool(input: Omit<ShellToolInput, 'command'> & { args: string[] }, context: ToolCallContext): Promise<ToolCallResult<{ exitCode: number; output: string }>> {
  assertLeaseAllowsTool(context.lease, 'git');
  return runShellTool({ ...input, command: `git ${input.args.map(quote).join(' ')}` }, { ...context, lease: { ...context.lease, tools: [...new Set([...context.lease.tools, 'run_shell' as const])] } });
}

function quote(value: string): string {
  return JSON.stringify(value);
}
