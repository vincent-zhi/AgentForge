import { v4 as uuidv4 } from 'uuid';
import type { CommandRisk } from '@/types/core';
import { AuditLogRepository } from '../../db/repositories/audit-log-repo';

export class AuditLogger {
  private auditLogRepo: AuditLogRepository;

  constructor(auditLogRepo?: AuditLogRepository) {
    this.auditLogRepo = auditLogRepo || new AuditLogRepository();
  }

  logAccess(agentId: string, action: string, target: string, details?: Record<string, unknown>): void {
    this.auditLogRepo.insert({
      id: uuidv4(),
      agentId,
      action,
      target,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  logFileRead(agentId: string, filePath: string, allowed: boolean): void {
    this.logAccess(agentId, 'file_read', filePath, { allowed });
  }

  logFileWrite(agentId: string, filePath: string, allowed: boolean): void {
    this.logAccess(agentId, 'file_write', filePath, { allowed });
  }

  logCommandExecution(agentId: string, command: string, riskLevel: CommandRisk, allowed: boolean): void {
    this.logAccess(agentId, 'command_execution', command, { riskLevel, allowed });
  }

  logLeaseEvent(leaseId: string, event: string): void {
    this.logAccess('system', 'lease_event', leaseId, { event });
  }
}
