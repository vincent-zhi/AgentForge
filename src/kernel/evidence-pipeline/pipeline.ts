import type { EvidenceEntry } from '@/types/core';
import { EvidenceRepository } from '../../db/repositories/evidence-repo';
import { CommandTracker } from './command-tracker';
import { TestCollector } from './test-collector';
import { GitTracker } from './git-tracker';
import type { SandboxExecResult } from '../sandbox/sandbox-runner';

export class EvidencePipeline {
  private evidenceRepo: EvidenceRepository;
  private commandTracker: CommandTracker;
  private testCollector: TestCollector;
  private gitTracker: GitTracker;

  constructor(evidenceRepo?: EvidenceRepository) {
    this.evidenceRepo = evidenceRepo || new EvidenceRepository();
    this.commandTracker = new CommandTracker(this.evidenceRepo);
    this.testCollector = new TestCollector(this.evidenceRepo);
    this.gitTracker = new GitTracker(this.evidenceRepo);
  }

  getEvidenceStack(taskId: string): EvidenceEntry[] {
    return this.evidenceRepo.findByTaskId(taskId);
  }

  getTestResults(taskId: string): EvidenceEntry[] {
    return this.evidenceRepo.findByTaskAndType(taskId, 'test');
  }

  addSandboxResult(taskId: string, agentId: string, command: string, result: SandboxExecResult): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: `ev-sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      agentId,
      type: 'sandbox',
      content: `[sandbox] ${command}`,
      result: result.exitCode === 0 ? 'success' : `exit ${result.exitCode}`,
      timestamp: new Date().toISOString(),
      metadata: {
        sandboxId: result.sandboxId,
        exitCode: result.exitCode,
        duration: result.duration,
        stdout: result.stdout.slice(0, 2000),
        stderr: result.stderr.slice(0, 2000),
      },
    };
    this.evidenceRepo.insert(entry);
    return entry;
  }

  collectCiEvidence(workflowName: string, status: string, duration: number, logSummary: string): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: `ev-ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId: '',
      agentId: '',
      type: 'ci',
      content: `[ci] ${workflowName}`,
      result: status,
      timestamp: new Date().toISOString(),
      metadata: {
        workflowName,
        status,
        duration,
        logSummary,
      },
    };
    this.evidenceRepo.insert(entry);
    return entry;
  }

  getCommandTracker(): CommandTracker {
    return this.commandTracker;
  }

  getTestCollector(): TestCollector {
    return this.testCollector;
  }

  getGitTracker(): GitTracker {
    return this.gitTracker;
  }
}
