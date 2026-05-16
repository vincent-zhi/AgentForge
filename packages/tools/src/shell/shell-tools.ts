import { spawn } from 'node:child_process';
import { DEFAULT_ORGANIZATION_POLICY, evaluateCommand } from '@agentforge/core';
import type { ToolCallContext, ToolCallResult } from '../tool-registry.js';
import { assertLeaseAllowsTool } from '@agentforge/runtime';

export interface ShellToolInput { command: string; cwd: string; timeoutMs?: number }

export async function runShellTool(input: ShellToolInput, context: ToolCallContext): Promise<ToolCallResult<{ exitCode: number; output: string }>> {
  assertLeaseAllowsTool(context.lease, 'run_shell', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  const policyDecision = evaluateCommand(context.policy ?? DEFAULT_ORGANIZATION_POLICY, input.command);
  if (policyDecision.status !== 'allow') {
    return { tool: 'run_shell', status: policyDecision.status === 'approval_required' ? 'approval_required' : 'error', error: policyDecision.reasons.join(' '), data: { exitCode: -1, output: '' } };
  }
  return new Promise((resolve) => {
    const child = spawn(input.command, { cwd: input.cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), input.timeoutMs ?? 120_000);
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ tool: 'run_shell', status: code === 0 ? 'ok' : 'error', data: { exitCode: code ?? -1, output }, log: output });
    });
  });
}
