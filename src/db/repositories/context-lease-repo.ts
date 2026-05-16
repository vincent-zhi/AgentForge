import { BaseRepository } from './base-repo';
import type { ContextLease, LeaseStatus, AgentRole } from '@/types/core';

export class ContextLeaseRepository extends BaseRepository<ContextLease> {
  constructor() {
    super('context_leases');
  }

  protected mapRow(row: Record<string, unknown>): ContextLease {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      agentId: row.agent_id as string,
      agentRole: row.agent_role as AgentRole,
      canRead: this.parseJson(row.can_read as string, []),
      canWrite: this.parseJson(row.can_write as string, []),
      canUseFacts: this.parseJson(row.can_use_facts as string, []),
      tools: this.parseJson(row.tools as string, []),
      expiresAt: row.expires_at as string,
      requiresApprovalFor: this.parseJson(row.requires_approval_for as string, []),
      status: row.status as LeaseStatus,
    };
  }

  insert(lease: ContextLease): void {
    this.db.prepare(`
      INSERT INTO context_leases (id, task_id, agent_id, agent_role, can_read, can_write,
        can_use_facts, tools, expires_at, requires_approval_for, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lease.id, lease.taskId, lease.agentId, lease.agentRole,
      this.toJson(lease.canRead), this.toJson(lease.canWrite),
      this.toJson(lease.canUseFacts), this.toJson(lease.tools),
      lease.expiresAt, this.toJson(lease.requiresApprovalFor), lease.status
    );
  }

  updateStatus(id: string, status: LeaseStatus): void {
    this.db.prepare(`
      UPDATE context_leases SET status = ? WHERE id = ?
    `).run(status, id);
  }

  findByTaskId(taskId: string): ContextLease[] {
    const rows = this.db.prepare('SELECT * FROM context_leases WHERE task_id = ?').all(taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByAgentId(agentId: string): ContextLease | null {
    const row = this.db.prepare('SELECT * FROM context_leases WHERE agent_id = ? AND status = ?').get(agentId, 'active') as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  findActiveByTask(taskId: string): ContextLease[] {
    const rows = this.db.prepare('SELECT * FROM context_leases WHERE task_id = ? AND status = ?').all(taskId, 'active') as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  expireLeases(taskId: string): void {
    this.db.prepare(`
      UPDATE context_leases SET status = 'expired' WHERE task_id = ? AND status = 'active' AND expires_at < datetime('now')
    `).run(taskId);
  }
}
