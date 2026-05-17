import type { ContextLease, AgentRole } from '@/types/core';
import { checkReadPermission, checkWritePermission, checkFactPermission, checkToolPermission } from './permission-checker';
import type { ProjectPolicy } from '../security/policy-manager';

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

export type LeaseEventCallback = (event: string, data: Record<string, unknown>) => void;

interface PendingEscalationRequest {
  id: string;
  leaseId: string;
  resource: string;
  reason: string;
  resolve: (approved: boolean) => void;
}

export class LeaseManager {
  private leases: Map<string, ContextLease> = new Map();
  private violations: Array<{ leaseId: string; action: string; target: string; timestamp: string }> = [];
  private policy: ProjectPolicy | null = null;
  onPermissionViolation?: (data: { leaseId: string; agentId: string; action: string; target: string; timestamp: string }) => void;
  private expiryCheckerTimer: ReturnType<typeof setInterval> | null = null;
  private onLeaseEvent: LeaseEventCallback | null = null;
  private pendingEscalationRequests: Map<string, PendingEscalationRequest> = new Map();

  setPolicy(policy: ProjectPolicy): void {
    this.policy = policy;
  }

  setLeaseEventCallback(callback: LeaseEventCallback): void {
    this.onLeaseEvent = callback;
  }

  startExpiryChecker(intervalMs: number = 30000): void {
    this.stopExpiryChecker();
    this.expiryCheckerTimer = setInterval(() => {
      const now = new Date();
      for (const lease of this.leases.values()) {
        if (lease.status === 'active' && new Date(lease.expiresAt) < now) {
          lease.status = 'expired';
          if (this.onLeaseEvent) {
            this.onLeaseEvent('lease_expired', { leaseId: lease.id, taskId: lease.taskId, agentId: lease.agentId });
          }
        }
      }
    }, intervalMs);
  }

  stopExpiryChecker(): void {
    if (this.expiryCheckerTimer !== null) {
      clearInterval(this.expiryCheckerTimer);
      this.expiryCheckerTimer = null;
    }
  }

  async requestPermissionEscalation(leaseId: string, resource: string, reason: string): Promise<boolean> {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.status !== 'active') return false;

    const requestId = `escalation-${leaseId}-${Date.now()}`;
    return new Promise<boolean>((resolve) => {
      this.pendingEscalationRequests.set(requestId, {
        id: requestId,
        leaseId,
        resource,
        reason,
        resolve,
      });
      if (this.onLeaseEvent) {
        this.onLeaseEvent('escalation_requested', { requestId, leaseId, resource, reason });
      }
    });
  }

  resolvePermissionEscalation(requestId: string, approved: boolean): void {
    const request = this.pendingEscalationRequests.get(requestId);
    if (!request) return;
    request.resolve(approved);
    this.pendingEscalationRequests.delete(requestId);
  }

  escalateLease(leaseId: string, additionalRead: string[], additionalWrite: string[]): void {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.status !== 'active') return;
    for (const r of additionalRead) {
      if (!lease.canRead.includes(r)) {
        lease.canRead.push(r);
      }
    }
    for (const w of additionalWrite) {
      if (!lease.canWrite.includes(w)) {
        lease.canWrite.push(w);
      }
    }
    if (this.onLeaseEvent) {
      this.onLeaseEvent('lease_escalated', { leaseId, additionalRead, additionalWrite });
    }
  }

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
    if (!lease || lease.status !== 'active') {
      if (this.onPermissionViolation) {
        this.onPermissionViolation({ leaseId, agentId: lease?.agentId ?? 'unknown', action, target, timestamp: new Date().toISOString() });
      }
      return false;
    }

    if (new Date(lease.expiresAt) < new Date()) {
      lease.status = 'expired';
      if (this.onPermissionViolation) {
        this.onPermissionViolation({ leaseId, agentId: lease.agentId, action, target, timestamp: new Date().toISOString() });
      }
      return false;
    }

    if (this.policy) {
      if (action === 'write' && this.policy.forbiddenPatterns.length > 0) {
        const isForbidden = this.policy.forbiddenPatterns.some((pattern) => {
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
        });
        if (isForbidden) {
          if (this.onPermissionViolation) {
            this.onPermissionViolation({ leaseId, agentId: lease.agentId, action, target, timestamp: new Date().toISOString() });
          }
          return false;
        }
      }

      if (action === 'use_tool' && this.policy.commandWhitelist.length > 0) {
        const baseCommand = target.trim().split(/\s+/)[0];
        const isAllowed = this.policy.commandWhitelist.some((allowed) => {
          if (allowed === baseCommand) return true;
          return baseCommand.endsWith(`/${allowed}`);
        });
        if (!isAllowed) {
          if (this.onPermissionViolation) {
            this.onPermissionViolation({ leaseId, agentId: lease.agentId, action, target, timestamp: new Date().toISOString() });
          }
          return false;
        }
      }
    }

    let result: boolean;
    switch (action) {
      case 'read':
        result = checkReadPermission(lease, target);
        break;
      case 'write':
        result = checkWritePermission(lease, target) && !this.requiresApproval(lease, target);
        break;
      case 'use_fact':
        result = checkFactPermission(lease, target);
        break;
      case 'use_tool':
        result = checkToolPermission(lease, target);
        break;
      default:
        result = false;
    }

    if (!result && this.onPermissionViolation) {
      this.onPermissionViolation({ leaseId, agentId: lease.agentId, action, target, timestamp: new Date().toISOString() });
    }

    return result;
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
