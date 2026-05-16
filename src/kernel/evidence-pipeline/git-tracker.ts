import { v4 as uuidv4 } from 'uuid';
import type { EvidenceEntry } from '@/types/core';
import { EvidenceRepository } from '../../db/repositories/evidence-repo';

export class GitTracker {
  private evidenceRepo: EvidenceRepository;

  constructor(evidenceRepo?: EvidenceRepository) {
    this.evidenceRepo = evidenceRepo || new EvidenceRepository();
  }

  trackGitOperation(taskId: string, agentId: string, operation: string, details: string): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: uuidv4(),
      taskId,
      agentId,
      type: 'git',
      content: `${operation}: ${details}`,
      timestamp: new Date().toISOString(),
      metadata: { operation, details },
    };
    this.evidenceRepo.insert(entry);
    return entry;
  }
}
