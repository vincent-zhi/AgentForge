import { BaseRepository } from './base-repo';
import type { ImpactMap, RiskLevel } from '@/types/core';

export class ImpactMapRepository extends BaseRepository<ImpactMap> {
  constructor() {
    super('impact_maps');
  }

  protected mapRow(row: Record<string, unknown>): ImpactMap {
    return {
      taskId: row.task_id as string,
      target: this.parseJson(row.target as string, { module: '', files: [] }),
      upstreamDependencies: this.parseJson(row.upstream_dependencies as string, []),
      downstreamDependents: this.parseJson(row.downstream_dependents as string, []),
      contractsTouched: this.parseJson(row.contracts_touched as string, []),
      affectedTests: this.parseJson(row.affected_tests as string, []),
      forbiddenChanges: this.parseJson(row.forbidden_changes as string, []),
      risk: this.parseJson(row.risk as string, { level: 'low' as RiskLevel, reasons: [] }),
      reviewFocus: this.parseJson(row.review_focus as string, []),
      plannedImpactHash: row.planned_impact_hash as string,
      actualImpactHash: row.actual_impact_hash as string | undefined,
    };
  }

  insert(map: ImpactMap): void {
    this.db.prepare(`
      INSERT INTO impact_maps (id, task_id, target, upstream_dependencies, downstream_dependents,
        contracts_touched, affected_tests, forbidden_changes, risk, review_focus,
        planned_impact_hash, actual_impact_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      map.taskId, map.taskId, this.toJson(map.target),
      this.toJson(map.upstreamDependencies), this.toJson(map.downstreamDependents),
      this.toJson(map.contractsTouched), this.toJson(map.affectedTests),
      this.toJson(map.forbiddenChanges), this.toJson(map.risk),
      this.toJson(map.reviewFocus), map.plannedImpactHash, map.actualImpactHash ?? null
    );
  }

  findByTaskId(taskId: string): ImpactMap | null {
    const row = this.db.prepare('SELECT * FROM impact_maps WHERE task_id = ?').get(taskId) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  updateActualImpact(taskId: string, actualImpactHash: string): void {
    this.db.prepare(`
      UPDATE impact_maps SET actual_impact_hash = ?, updated_at = datetime('now') WHERE task_id = ?
    `).run(actualImpactHash, taskId);
  }
}
