import { BaseRepository } from './base-repo';
import type { AuditLogEntry } from '@/types/core';

export class AuditLogRepository extends BaseRepository<AuditLogEntry> {
  constructor() {
    super('audit_logs');
  }

  protected mapRow(row: Record<string, unknown>): AuditLogEntry {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      action: row.action as string,
      target: row.target as string,
      timestamp: row.timestamp as string,
      details: this.parseJson(row.details as string, {}),
    };
  }

  insert(entry: AuditLogEntry): void {
    this.db.prepare(`
      INSERT INTO audit_logs (id, agent_id, action, target, timestamp, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.agentId, entry.action, entry.target,
      entry.timestamp, this.toJson(entry.details)
    );
  }

  findByAgentId(agentId: string): AuditLogEntry[] {
    const rows = this.db.prepare('SELECT * FROM audit_logs WHERE agent_id = ? ORDER BY timestamp DESC').all(agentId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByAction(action: string): AuditLogEntry[] {
    const rows = this.db.prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC').all(action) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByTimeRange(start: string, end: string): AuditLogEntry[] {
    const rows = this.db.prepare('SELECT * FROM audit_logs WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC').all(start, end) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }
}
