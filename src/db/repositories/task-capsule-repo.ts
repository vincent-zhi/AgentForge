import { BaseRepository } from './base-repo';
import type { TaskCapsule, TaskStatus } from '@/types/core';

export class TaskCapsuleRepository extends BaseRepository<TaskCapsule> {
  constructor() {
    super('task_capsules');
  }

  protected mapRow(row: Record<string, unknown>): TaskCapsule {
    return {
      id: row.id as string,
      goal: row.goal as string,
      nonGoals: this.parseJson(row.non_goals as string, []),
      writable: this.parseJson(row.writable as string, []),
      readonly: this.parseJson(row.readonly_scope as string, []),
      forbidden: this.parseJson(row.forbidden as string, []),
      mustPreserve: this.parseJson(row.must_preserve as string, []),
      affectedModules: this.parseJson(row.affected_modules as string, []),
      requiredTests: this.parseJson(row.required_tests as string, []),
      reviewPolicy: this.parseJson(row.review_policy as string, {
        requireImpactGuard: true,
        requireAllTests: false,
        maxRiskLevel: 'high',
        requireHumanApproval: false,
      }),
      status: row.status as TaskStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  insert(capsule: TaskCapsule): void {
    this.db.prepare(`
      INSERT INTO task_capsules (id, goal, non_goals, writable, readonly_scope, forbidden,
        must_preserve, affected_modules, required_tests, review_policy, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      capsule.id, capsule.goal, this.toJson(capsule.nonGoals),
      this.toJson(capsule.writable), this.toJson(capsule.readonly),
      this.toJson(capsule.forbidden), this.toJson(capsule.mustPreserve),
      this.toJson(capsule.affectedModules), this.toJson(capsule.requiredTests),
      this.toJson(capsule.reviewPolicy), capsule.status,
      capsule.createdAt, capsule.updatedAt
    );
  }

  updateStatus(id: string, status: TaskStatus): void {
    this.db.prepare(`
      UPDATE task_capsules SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);
  }

  findByStatus(status: TaskStatus): TaskCapsule[] {
    const rows = this.db.prepare('SELECT * FROM task_capsules WHERE status = ?').all(status) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }
}
