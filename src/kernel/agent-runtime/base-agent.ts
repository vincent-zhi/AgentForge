import type { ContextLease, AgentRole } from '@/types/core';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import type { ModelGateway } from '../model-gateway/model-gateway';

export abstract class BaseAgent {
  id: string;
  role: AgentRole;
  lease: ContextLease | null = null;
  protected blackboard: Blackboard;
  protected leaseManager: LeaseManager | null = null;
  protected modelGateway: ModelGateway | null = null;
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

  setModelGateway(gateway: ModelGateway): void {
    this.modelGateway = gateway;
  }

  async executeWithTimeout(timeoutMs: number): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Agent ${this.id} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    await Promise.race([this.execute(), timeoutPromise]);
  }

  async retryOnFailure(maxRetries: number): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.execute();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
