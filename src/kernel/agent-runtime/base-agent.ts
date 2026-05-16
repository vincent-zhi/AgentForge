import type { ContextLease, AgentRole } from '@/types/core';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export abstract class BaseAgent {
  id: string;
  role: AgentRole;
  lease: ContextLease | null = null;
  protected blackboard: Blackboard;
  protected leaseManager: LeaseManager | null = null;
  protected taskId: string;

  constructor(id: string, role: AgentRole, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    this.id = id;
    this.role = role;
    this.taskId = taskId;
    this.blackboard = blackboard;
    this.leaseManager = leaseManager || null;
  }

  abstract execute(): Promise<void>;

  protected publishEvent(type: string, data: Record<string, unknown>): void {
    this.blackboard.publish({
      type,
      agentId: this.id,
      taskId: this.taskId,
      data,
    });
  }

  protected checkPermission(action: string, target: string): boolean {
    if (!this.lease || !this.leaseManager) return false;
    return this.leaseManager.checkPermission(this.lease.id, action as 'read' | 'write' | 'use_fact' | 'use_tool', target);
  }

  protected logAction(action: string, target: string): void {
    this.publishEvent('agent_log', { action, target, role: this.role });
  }

  setLease(lease: ContextLease): void {
    this.lease = lease;
  }
}
