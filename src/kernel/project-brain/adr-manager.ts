import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../db/connection';

export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  date: string;
  supersededBy?: string;
}

export class ADRManager {
  private ensureTable(): void {
    try {
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS adr_records (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'proposed',
          context TEXT NOT NULL DEFAULT '',
          decision TEXT NOT NULL DEFAULT '',
          consequences TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          supersededBy TEXT
        )
      `);
    } catch {}
  }

  createADR(data: Omit<ADR, 'id' | 'date'>): ADR {
    this.ensureTable();
    const adr: ADR = {
      id: uuidv4(),
      title: data.title,
      status: data.status,
      context: data.context,
      decision: data.decision,
      consequences: data.consequences,
      date: new Date().toISOString(),
      supersededBy: data.supersededBy,
    };

    try {
      const db = getDatabase();
      db.prepare(
        'INSERT INTO adr_records (id, title, status, context, decision, consequences, date, supersededBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(adr.id, adr.title, adr.status, adr.context, adr.decision, adr.consequences, adr.date, adr.supersededBy ?? null);
    } catch {}

    return adr;
  }

  updateADR(id: string, updates: Partial<ADR>): void {
    this.ensureTable();
    const existing = this.getADR(id);
    if (!existing) return;

    const updated = { ...existing, ...updates };
    try {
      const db = getDatabase();
      db.prepare(
        'UPDATE adr_records SET title = ?, status = ?, context = ?, decision = ?, consequences = ?, supersededBy = ? WHERE id = ?'
      ).run(updated.title, updated.status, updated.context, updated.decision, updated.consequences, updated.supersededBy ?? null, id);
    } catch {}
  }

  listADRs(): ADR[] {
    this.ensureTable();
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM adr_records ORDER BY date DESC').all() as ADR[];
    } catch {
      return [];
    }
  }

  getADR(id: string): ADR | null {
    this.ensureTable();
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM adr_records WHERE id = ?').get(id) as ADR | null;
    } catch {
      return null;
    }
  }
}
