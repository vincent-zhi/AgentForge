import type { ContextLease, AgentRole, BlackboardEvent } from '@/types/core';
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
  private subscriptions: Array<() => void> = [];

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

  protected subscribeToEvent(eventType: string, handler: (event: BlackboardEvent) => void): void {
    const unsubscribe = this.blackboard.subscribe(eventType, (event) => {
      if (event.taskId === this.taskId) {
        handler(event);
      }
    });
    this.subscriptions.push(unsubscribe);
  }

  protected waitForEvent(eventType: string, timeoutMs: number = 30000): Promise<BlackboardEvent | null> {
    return new Promise((resolve) => {
      const existing = this.blackboard.getEvents(this.taskId).find((e) => e.type === eventType);
      if (existing) {
        resolve(existing);
        return;
      }

      const unsubscribe = this.blackboard.subscribe(eventType, (event) => {
        if (event.taskId === this.taskId) {
          clearTimeout(timer);
          cleanup();
          resolve(event);
        }
      });

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      const cleanup = () => {
        unsubscribe();
        const idx = this.subscriptions.indexOf(unsubscribe);
        if (idx >= 0) this.subscriptions.splice(idx, 1);
      };

      this.subscriptions.push(unsubscribe);
    });
  }

  protected getLatestEvent(eventType: string): BlackboardEvent | null {
    const events = this.blackboard.getEvents(this.taskId).filter((e) => e.type === eventType);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  protected getEventsByType(eventType: string): BlackboardEvent[] {
    return this.blackboard.getEvents(this.taskId).filter((e) => e.type === eventType);
  }

  protected checkPermission(action: string, target: string): boolean {
    if (!this.lease || !this.leaseManager) return false;
    return this.leaseManager.checkPermission(this.lease.id, action as 'read' | 'write' | 'use_fact' | 'use_tool', target);
  }

  protected logAction(action: string, target: string): void {
    this.publishEvent('agent_log', { action, target, role: this.role });
  }

  protected auditLog(action: string, target: string, details?: Record<string, unknown>): void {
    this.blackboard.publish({
      type: 'audit_log',
      agentId: this.id,
      taskId: this.taskId,
      data: {
        agentId: this.id,
        role: this.role,
        action,
        target,
        details,
        timestamp: new Date().toISOString(),
      },
    });
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

  cleanup(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions = [];
  }
}
