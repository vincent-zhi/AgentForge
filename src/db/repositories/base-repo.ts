import type Database from 'better-sqlite3';
import { getDatabase } from '../connection';

export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(tableName: string, db?: Database.Database) {
    this.db = db || getDatabase();
    this.tableName = tableName;
  }

  protected parseJson<R>(json: string | null | undefined, fallback: R): R {
    if (!json) return fallback;
    try {
      return JSON.parse(json) as R;
    } catch {
      return fallback;
    }
  }

  protected toJson(value: unknown): string {
    return JSON.stringify(value);
  }

  findById(id: string): T | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  findAll(limit = 100, offset = 0): T[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`).all(limit, offset) as Record<string, unknown>[];
    return rows.map((row) => this.mapRow(row));
  }

  deleteById(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  protected abstract mapRow(row: Record<string, unknown>): T;
}
