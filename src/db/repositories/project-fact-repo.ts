import { BaseRepository } from './base-repo';
import type { ProjectFact, FactStatus, Confidence, FactType } from '@/types/core';

export class ProjectFactRepository extends BaseRepository<ProjectFact> {
  constructor() {
    super('project_facts');
  }

  protected mapRow(row: Record<string, unknown>): ProjectFact {
    return {
      id: row.id as string,
      type: row.type as FactType,
      statement: row.statement as string,
      scope: this.parseJson(row.scope as string, { modules: [] }),
      evidence: this.parseJson(row.evidence as string, []),
      confidence: row.confidence as Confidence,
      status: row.status as FactStatus,
      expiresWhen: this.parseJson(row.expires_when as string, []),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  insert(fact: ProjectFact): void {
    this.db.prepare(`
      INSERT INTO project_facts (id, type, statement, scope, evidence, confidence, status, expires_when, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fact.id, fact.type, fact.statement,
      this.toJson(fact.scope), this.toJson(fact.evidence),
      fact.confidence, fact.status, this.toJson(fact.expiresWhen),
      fact.createdAt, fact.updatedAt
    );
  }

  updateStatus(id: string, status: FactStatus): void {
    this.db.prepare(`
      UPDATE project_facts SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);
  }

  updateConfidence(id: string, confidence: Confidence): void {
    this.db.prepare(`
      UPDATE project_facts SET confidence = ?, updated_at = datetime('now') WHERE id = ?
    `).run(confidence, id);
  }

  findByType(type: FactType): ProjectFact[] {
    const rows = this.db.prepare('SELECT * FROM project_facts WHERE type = ?').all(type) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByStatus(status: FactStatus): ProjectFact[] {
    const rows = this.db.prepare('SELECT * FROM project_facts WHERE status = ?').all(status) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  findByModule(module: string): ProjectFact[] {
    const rows = this.db.prepare("SELECT * FROM project_facts WHERE scope LIKE ?").all(`%"${module}"%`) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  search(query: string): ProjectFact[] {
    const rows = this.db.prepare('SELECT * FROM project_facts WHERE id IN (SELECT id FROM project_facts_fts WHERE project_facts_fts MATCH ?)').all(query) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  markStaleByFile(filePath: string): void {
    const facts = this.findAll(10000);
    for (const fact of facts) {
      const expires = fact.expiresWhen.filter((e) => e.type === 'file_change' && e.value === filePath);
      if (expires.length > 0) {
        this.updateStatus(fact.id, 'stale');
      }
    }
  }
}
