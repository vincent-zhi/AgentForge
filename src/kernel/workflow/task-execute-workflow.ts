import type { TaskCapsule, EvidenceEntry } from '@/types/core';
import { AgentRuntime } from '../agent-runtime/agent-runtime';
import { LeaseManager } from '../context-lease/lease-manager';
import { EvidencePipeline } from '../evidence-pipeline/pipeline';
import { GuardEngine } from '../impact-guard/guard-engine';
import { AuditLogger } from '../security/audit-logger';

export class TaskExecuteWorkflow {
  private agentRuntime: AgentRuntime;
  private leaseManager: LeaseManager;
  private evidencePipeline: EvidencePipeline;
  private guardEngine: GuardEngine;
  private auditLogger: AuditLogger;

  constructor(
    agentRuntime?: AgentRuntime,
    leaseManager?: LeaseManager,
    evidencePipeline?: EvidencePipeline,
    guardEngine?: GuardEngine,
    auditLogger?: AuditLogger,
  ) {
    this.leaseManager = leaseManager || new LeaseManager();
    this.agentRuntime = agentRuntime || new AgentRuntime(undefined, this.leaseManager);
    this.evidencePipeline = evidencePipeline || new EvidencePipeline();
    this.guardEngine = guardEngine || new GuardEngine();
    this.auditLogger = auditLogger || new AuditLogger();
  }

  async executeTask(capsule: TaskCapsule): Promise<void> {
    this.createContextLeases(capsule);

    this.auditLogger.logLeaseEvent(capsule.id, 'task_execution_started');

    await this.startAgentRuntime(capsule);

    this.collectEvidence(capsule.id);

    this.comparePlannedVsActual(capsule.id);
  }

  private createContextLeases(capsule: TaskCapsule): void {
    const roles: import('@/types/core').AgentRole[] = ['orchestrator', 'architect', 'impact', 'contract', 'search', 'coder', 'tester', 'reviewer', 'doc'];

    for (const role of roles) {
      const agentId = `agent-${role}-${capsule.id}`;
      this.leaseManager.createLease(capsule.id, agentId, role, capsule);
      this.auditLogger.logLeaseEvent(agentId, 'lease_created');
    }
  }

  private async startAgentRuntime(capsule: TaskCapsule): Promise<void> {
    await this.agentRuntime.startTask(capsule);
  }

  private collectEvidence(taskId: string): EvidenceEntry[] {
    return this.evidencePipeline.getEvidenceStack(taskId);
  }

  private comparePlannedVsActual(taskId: string): void {
    const comparison = this.guardEngine.comparePlannedVsActual(taskId);
    if (!comparison.match) {
      this.auditLogger.logAccess('system', 'impact_mismatch', taskId, {
        differences: comparison.differences,
      });
    }
  }
}
