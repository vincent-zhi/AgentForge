import { v4 as uuidv4 } from 'uuid';
import type { EvidenceEntry } from '@/types/core';
import { EvidenceRepository } from '../../db/repositories/evidence-repo';

export class CommandTracker {
  private evidenceRepo: EvidenceRepository;

  constructor(evidenceRepo?: EvidenceRepository) {
    this.evidenceRepo = evidenceRepo || new EvidenceRepository();
  }

  trackCommand(taskId: string, agentId: string, command: string, result?: string): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: uuidv4(),
      taskId,
      agentId,
      type: 'command',
      content: command,
      result,
      timestamp: new Date().toISOString(),
    };
    this.evidenceRepo.insert(entry);
    return entry;
  }
}
