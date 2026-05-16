import type { ContextLease } from '@/types/core';
import { matchGlob } from './lease-manager';

export function checkReadPermission(lease: ContextLease, filePath: string): boolean {
  if (lease.status !== 'active') return false;
  return lease.canRead.some((pattern) => matchGlob(pattern, filePath));
}

export function checkWritePermission(lease: ContextLease, filePath: string): boolean {
  if (lease.status !== 'active') return false;
  return lease.canWrite.some((pattern) => matchGlob(pattern, filePath));
}

export function checkFactPermission(lease: ContextLease, factId: string): boolean {
  if (lease.status !== 'active') return false;
  return lease.canUseFacts.some((pattern) => matchGlob(pattern, factId));
}

export function checkToolPermission(lease: ContextLease, toolName: string): boolean {
  if (lease.status !== 'active') return false;
  return lease.tools.includes(toolName);
}

export function requiresApproval(lease: ContextLease, target: string): boolean {
  return lease.requiresApprovalFor.some((pattern) => matchGlob(pattern, target));
}
