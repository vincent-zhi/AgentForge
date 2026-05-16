import { BaseRepository } from './base-repo';
import type { EvidenceEntry } from '@/types/core';

export class EvidenceRepository extends BaseRepository<EvidenceEntry> {
  constructor() {
    super('evidence_stack');
  }

  protected mapRow(row: Record<string, unknown>): EvidenceEntry {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      agentId: row.agent_id as string,
      type: row.type as EvidenceEntry['type'],
      content: row.content as string,
      result: row.result as string | undefined,
      timestamp: row.timestamp as string,
      metadata: this.parseJson(row.metadata as string, {}),
    };
  }

  insert(entry: EvidenceEntry): void {
    this.db.prepare(`
      INSERT INTO evidence_stack (id, task_id, agent_id, type, content, result, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.taskId, entry.agentId, entry.type,
      entry.content, entry.result ?? null, entry.timestamp,
      this.toJson(entry.metadata)
    );
  }

  findByTaskId(taskId: string): EvidenceEntry[] {
    const rows = this.db.prepare('SELECT * FROM evidence_stack WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByAgentId(agentId: string): EvidenceEntry[] {
    const rows = this.db.prepare('SELECT * FROM evidence_stack WHERE agent_id = ? ORDER BY timestamp ASC').all(agentId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByTaskAndType(taskId: string, type: EvidenceEntry['type']): EvidenceEntry[] {
    const rows = this.db.prepare('SELECT * FROM evidence_stack WHERE task_id = ? AND type = ? ORDER BY timestamp ASC').all(taskId, type) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }
}
