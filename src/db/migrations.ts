import type Database from 'better-sqlite3';
import { SCHEMA_VERSION, CREATE_TABLES, CREATE_FTS5, CREATE_INDEXES } from './schema';

export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  if (currentVersion < SCHEMA_VERSION) {
    db.exec(CREATE_TABLES);
    db.exec(CREATE_FTS5);
    db.exec(CREATE_INDEXES);
    db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }
}

function getCurrentVersion(db: Database.Database): number {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'").get() as { name: string } | undefined;
  if (!table) return 0;
  const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
  return row.version ?? 0;
}
