import { v4 as uuidv4 } from 'uuid';
import type { EvidenceEntry } from '@/types/core';
import { EvidenceRepository } from '../../db/repositories/evidence-repo';

export class TestCollector {
  private evidenceRepo: EvidenceRepository;

  constructor(evidenceRepo?: EvidenceRepository) {
    this.evidenceRepo = evidenceRepo || new EvidenceRepository();
  }

  collectTestResult(taskId: string, agentId: string, command: string, passed: boolean, output?: string): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: uuidv4(),
      taskId,
      agentId,
      type: 'test',
      content: command,
      result: passed ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      metadata: { passed, output: output || '' },
    };
    this.evidenceRepo.insert(entry);
    return entry;
  }
}
