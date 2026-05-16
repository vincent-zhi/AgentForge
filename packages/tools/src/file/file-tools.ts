import { readFile, writeFile, mkdir, rm, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assertLeaseAllowsFile, assertLeaseAllowsTool, requiresApproval } from '@agentforge/runtime';
import { DEFAULT_ORGANIZATION_POLICY } from '@agentforge/core';
import type { ToolCallContext, ToolCallResult } from '../tool-registry.js';

export interface FileToolInput { rootPath: string; file: string; content?: string; to?: string }

export async function readFileTool(input: FileToolInput, context: ToolCallContext): Promise<ToolCallResult<{ content: string }>> {
  assertLeaseAllowsTool(context.lease, 'read_file', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  assertLeaseAllowsFile(context.lease, input.file, 'read', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  const content = await readFile(join(input.rootPath, input.file), 'utf8');
  return { tool: 'read_file', status: 'ok', data: { content } };
}

export async function editFileTool(input: FileToolInput, context: ToolCallContext): Promise<ToolCallResult<{ file: string }>> {
  assertLeaseAllowsTool(context.lease, 'edit_file', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  assertLeaseAllowsFile(context.lease, input.file, 'write', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  if (requiresApproval(context.lease, input.file, context.policy ?? DEFAULT_ORGANIZATION_POLICY)) return { tool: 'edit_file', status: 'approval_required', data: { file: input.file } };
  await mkdir(dirname(join(input.rootPath, input.file)), { recursive: true });
  await writeFile(join(input.rootPath, input.file), input.content ?? '', 'utf8');
  return { tool: 'edit_file', status: 'ok', data: { file: input.file } };
}

export async function deleteFileTool(input: FileToolInput, context: ToolCallContext): Promise<ToolCallResult<{ file: string }>> {
  assertLeaseAllowsTool(context.lease, 'delete_file', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  assertLeaseAllowsFile(context.lease, input.file, 'write', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  await rm(join(input.rootPath, input.file), { force: true });
  return { tool: 'delete_file', status: 'ok', data: { file: input.file } };
}

export async function renameFileTool(input: FileToolInput, context: ToolCallContext): Promise<ToolCallResult<{ from: string; to: string }>> {
  assertLeaseAllowsTool(context.lease, 'rename_file', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  assertLeaseAllowsFile(context.lease, input.file, 'write', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  if (!input.to) throw new Error('renameFileTool requires input.to');
  assertLeaseAllowsFile(context.lease, input.to, 'write', context.policy ?? DEFAULT_ORGANIZATION_POLICY);
  await mkdir(dirname(join(input.rootPath, input.to)), { recursive: true });
  await rename(join(input.rootPath, input.file), join(input.rootPath, input.to));
  return { tool: 'rename_file', status: 'ok', data: { from: input.file, to: input.to } };
}
