import { DEFAULT_ORGANIZATION_POLICY, evaluateFileRead, evaluateFileWrite, evaluateToolUse, type ContextLease, type OrganizationPolicy, type ToolName } from '@agentforge/core';

export type LeaseAction = 'read' | 'write';

export function createContextLease(input: Omit<ContextLease, 'leaseId'> & { leaseId?: string }): ContextLease {
  return { ...input, leaseId: input.leaseId ?? `ctx_${Math.random().toString(16).slice(2, 10)}` };
}

export function assertLeaseAllowsFile(lease: ContextLease, filePath: string, action: LeaseAction, policy: OrganizationPolicy = DEFAULT_ORGANIZATION_POLICY): void {
  const policyDecision = action === 'read' ? evaluateFileRead(policy, filePath) : evaluateFileWrite(policy, filePath);
  if (policyDecision.status === 'deny') {
    throw new Error(`${policyDecision.reasons.join(' ')} Matched: ${policyDecision.matchedPatterns.join(', ')}`);
  }
  if (!leaseAllowsFile(lease, filePath, action)) {
    throw new Error(`Context Lease ${lease.leaseId} does not allow ${action} access to ${filePath}`);
  }
}

export function leaseAllowsFile(lease: ContextLease, filePath: string, action: LeaseAction): boolean {
  const patterns = action === 'read' ? lease.canRead : lease.canWrite;
  return patterns.some((pattern) => matchGlob(pattern, filePath));
}

export function assertLeaseAllowsTool(lease: ContextLease, tool: ToolName, policy: OrganizationPolicy = DEFAULT_ORGANIZATION_POLICY): void {
  const policyDecision = evaluateToolUse(policy, tool);
  if (policyDecision.status === 'deny') {
    throw new Error(policyDecision.reasons.join(' '));
  }
  if (!lease.tools.includes(tool)) {
    throw new Error(`Context Lease ${lease.leaseId} does not allow tool ${tool}`);
  }
}

export function requiresApproval(lease: ContextLease, filePath: string, policy: OrganizationPolicy = DEFAULT_ORGANIZATION_POLICY): boolean {
  return evaluateFileWrite(policy, filePath).status === 'approval_required' || lease.requiresApprovalFor.some((pattern) => matchGlob(pattern, filePath));
}

function matchGlob(pattern: string, value: string): boolean {
  if (pattern === value || pattern === '**') return true;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(value);
}
