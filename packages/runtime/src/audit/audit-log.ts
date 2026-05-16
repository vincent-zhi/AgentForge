import type { AuditAction, AuditLogEntry } from '@agentforge/core';

export class AuditLog {
  private readonly entries: AuditLogEntry[] = [];

  record<TPayload extends Record<string, unknown>>(input: Omit<AuditLogEntry<TPayload>, 'id' | 'timestamp'>): AuditLogEntry<TPayload> {
    const entry: AuditLogEntry<TPayload> = {
      ...input,
      id: `audit_${this.entries.length + 1}`,
      timestamp: new Date().toISOString()
    };
    this.entries.push(entry);
    return entry;
  }

  list(filter: { taskId?: string; action?: AuditAction } = {}): AuditLogEntry[] {
    return this.entries.filter((entry) => (!filter.taskId || entry.taskId === filter.taskId) && (!filter.action || entry.action === filter.action));
  }
}
