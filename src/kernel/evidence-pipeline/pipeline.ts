import type { EvidenceEntry } from '@/types/core';
import { EvidenceRepository } from '../../db/repositories/evidence-repo';
import { CommandTracker } from './command-tracker';
import { TestCollector } from './test-collector';
import { GitTracker } from './git-tracker';

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
