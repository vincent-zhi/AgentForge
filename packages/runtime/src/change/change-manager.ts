import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DEFAULT_ORGANIZATION_POLICY, type ApplyDecision, type ChangeSet, type OrganizationPolicy, type RollbackCheckpoint } from '@agentforge/core';
import { AuditLog } from '../audit/audit-log.js';
import { assertLeaseAllowsFile, type LeaseAction } from '../context/context-lease.js';
import type { ContextLease } from '@agentforge/core';

export interface ChangeManagerOptions {
  rootPath: string;
  auditLog?: AuditLog;
  policy?: OrganizationPolicy;
}

export interface ApplyChangeSetInput {
  changeSet: ChangeSet;
  lease: ContextLease;
  agentId: string;
  decision: ApplyDecision;
}

export class ChangeManager {
  private readonly checkpoints = new Map<string, RollbackCheckpoint>();
  private readonly auditLog: AuditLog;

  constructor(private readonly options: ChangeManagerOptions) {
    this.auditLog = options.auditLog ?? new AuditLog();
  }

  async createCheckpoint(changeSet: ChangeSet, agentId: string): Promise<RollbackCheckpoint> {
    const files = await Promise.all(changeSet.patches.map(async (patch) => ({ file: patch.file, content: await readOptionalFile(this.absolute(patch.file)) })));
    const checkpoint: RollbackCheckpoint = {
      checkpointId: `checkpoint_${changeSet.changeSetId}`,
      taskId: changeSet.taskId,
      files,
      createdAt: new Date().toISOString()
    };
    this.checkpoints.set(checkpoint.checkpointId, checkpoint);
    this.auditLog.record({ taskId: changeSet.taskId, agentId, action: 'checkpoint_created', status: 'ok', target: checkpoint.checkpointId, payload: { files: files.map((file) => file.file) } });
    return checkpoint;
  }

  async applyChangeSet(input: ApplyChangeSetInput): Promise<{ checkpoint: RollbackCheckpoint; appliedFiles: string[] }> {
    if (input.decision.action !== 'apply') {
      this.auditLog.record({ taskId: input.changeSet.taskId, agentId: input.agentId, action: 'changes_discarded', status: 'ok', target: input.changeSet.changeSetId, payload: { decision: input.decision.action, reason: input.decision.reason } });
      return { checkpoint: await this.createCheckpoint(input.changeSet, input.agentId), appliedFiles: [] };
    }

    const checkpoint = await this.createCheckpoint(input.changeSet, input.agentId);
    for (const patch of input.changeSet.patches) {
      this.assertLease(input.lease, patch.file, 'write');
      const absolutePath = this.absolute(patch.file);
      if (patch.after === undefined) {
        await rm(absolutePath, { force: true });
      } else {
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, patch.after, 'utf8');
      }
    }
    const appliedFiles = input.changeSet.patches.map((patch) => patch.file);
    this.auditLog.record({ taskId: input.changeSet.taskId, agentId: input.agentId, action: 'changes_applied', status: 'ok', target: input.changeSet.changeSetId, payload: { files: appliedFiles } });
    return { checkpoint, appliedFiles };
  }

  async rollback(checkpointId: string, agentId: string): Promise<string[]> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new Error(`Unknown rollback checkpoint: ${checkpointId}`);
    for (const file of checkpoint.files) {
      const absolutePath = this.absolute(file.file);
      if (file.content === undefined) {
        await rm(absolutePath, { force: true });
      } else {
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, file.content, 'utf8');
      }
    }
    const files = checkpoint.files.map((file) => file.file);
    this.auditLog.record({ taskId: checkpoint.taskId, agentId, action: 'changes_discarded', status: 'ok', target: checkpoint.checkpointId, payload: { files, reason: 'rollback' } });
    return files;
  }

  listCheckpoints(taskId?: string): RollbackCheckpoint[] {
    const checkpoints = [...this.checkpoints.values()];
    return taskId ? checkpoints.filter((checkpoint) => checkpoint.taskId === taskId) : checkpoints;
  }

  getAuditLog(): AuditLog {
    return this.auditLog;
  }

  private assertLease(lease: ContextLease, file: string, action: LeaseAction): void {
    assertLeaseAllowsFile(lease, file, action, this.options.policy ?? DEFAULT_ORGANIZATION_POLICY);
  }

  private absolute(file: string): string {
    return join(this.options.rootPath, file);
  }
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}
