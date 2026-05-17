import type { ContextLease, AgentRole } from '@/types/core';
import { checkReadPermission, checkWritePermission, checkFactPermission, checkToolPermission } from './permission-checker';

const ROLE_DEFAULTS: Record<AgentRole, { canRead: string[]; canWrite: string[]; canUseFacts: string[]; tools: string[]; requiresApprovalFor: string[] }> = {
  orchestrator: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['impact_guard', 'contract_checker', 'search', 'delegate'],
    requiresApprovalFor: [],
  },
  architect: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['search', 'read_files'],
    requiresApprovalFor: ['write'],
  },
  impact: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['impact_guard', 'search', 'read_files'],
    requiresApprovalFor: ['write'],
  },
  contract: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['contract_checker', 'search', 'read_files'],
    requiresApprovalFor: ['write'],
  },
  search: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['search', 'read_files'],
    requiresApprovalFor: ['write'],
  },
  coder: {
    canRead: ['**'],
    canWrite: ['src/**'],
    canUseFacts: ['**'],
    tools: ['read_files', 'write_files', 'run_command', 'search'],
    requiresApprovalFor: ['config/**', 'infra/**', '.env*'],
  },
  tester: {
    canRead: ['**'],
    canWrite: ['test/**', '*.test.*', '*.spec.*'],
    canUseFacts: ['**'],
    tools: ['read_files', 'run_test', 'search'],
    requiresApprovalFor: ['src/**', 'config/**'],
  },
  reviewer: {
    canRead: ['**'],
    canWrite: [],
    canUseFacts: ['**'],
    tools: ['read_files', 'diff', 'search'],
    requiresApprovalFor: ['write'],
  },
  doc: {
    canRead: ['**'],
    canWrite: ['docs/**', '*.md', 'README*'],
    canUseFacts: ['**'],
    tools: ['read_files', 'write_files', 'search'],
    requiresApprovalFor: ['src/**'],
  },
};

export class LeaseManager {
  private leases: Map<string, ContextLease> = new Map();
  private violations: Array<{ leaseId: string; action: string; target: string; timestamp: string }> = [];

  createLease(taskId: string, agentId: string, agentRole: AgentRole, capsule: { writable: string[]; readonly: string[]; forbidden: string[]; mustPreserve: import('@/types/core').ContractRef[] }): ContextLease {
    const defaults = ROLE_DEFAULTS[agentRole];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const lease: ContextLease = {
      id: `lease-${agentId}-${Date.now()}`,
      taskId,
      agentId,
      agentRole,
      canRead: capsule.readonly.length > 0 ? [...defaults.canRead] : defaults.canRead,
      canWrite: capsule.writable.length > 0 ? capsule.writable : defaults.canWrite,
      canUseFacts: defaults.canUseFacts,
      tools: defaults.tools,
      expiresAt,
      requiresApprovalFor: [...defaults.requiresApprovalFor, ...capsule.forbidden],
      status: 'active',
    };

    this.leases.set(lease.id, lease);
    return lease;
  }

  checkPermission(leaseId: string, action: 'read' | 'write' | 'use_fact' | 'use_tool', target: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.status !== 'active') return false;

    if (new Date(lease.expiresAt) < new Date()) {
      lease.status = 'expired';
      return false;
    }

    switch (action) {
      case 'read':
        return checkReadPermission(lease, target);
      case 'write':
        if (checkWritePermission(lease, target)) {
          return !this.requiresApproval(lease, target);
        }
        return false;
      case 'use_fact':
        return checkFactPermission(lease, target);
      case 'use_tool':
        return checkToolPermission(lease, target);
      default:
        return false;
    }
  }

  revokeLease(leaseId: string): void {
    const lease = this.leases.get(leaseId);
    if (lease) {
      lease.status = 'revoked';
    }
  }

  expireLeases(taskId: string): void {
    const now = new Date();
    for (const lease of this.leases.values()) {
      if (lease.taskId === taskId && lease.status === 'active' && new Date(lease.expiresAt) < now) {
        lease.status = 'expired';
      }
    }
  }

  recordViolation(leaseId: string, action: string, target: string): void {
    this.violations.push({
      leaseId,
      action,
      target,
      timestamp: new Date().toISOString(),
    });
  }

  getLease(leaseId: string): ContextLease | undefined {
    return this.leases.get(leaseId);
  }

  getLeasesForTask(taskId: string): ContextLease[] {
    const leases: ContextLease[] = [];
    for (const lease of this.leases.values()) {
      if (lease.taskId === taskId) {
        leases.push(lease);
      }
    }
    return leases;
  }

  getViolations(leaseId?: string): Array<{ leaseId: string; action: string; target: string; timestamp: string }> {
    if (leaseId) {
      return this.violations.filter((v) => v.leaseId === leaseId);
    }
    return this.violations;
  }

  private requiresApproval(lease: ContextLease, target: string): boolean {
    return lease.requiresApprovalFor.some((pattern) => matchGlob(pattern, target));
  }
}

function matchGlob(pattern: string, target: string): boolean {
  if (pattern === '**') return true;
  if (pattern === target) return true;
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{DOUBLESTAR}}/g, '.*');
  try {
    return new RegExp(`^${regexStr}$`).test(target);
  } catch {
    return pattern === target;
  }
}

export { matchGlob };
