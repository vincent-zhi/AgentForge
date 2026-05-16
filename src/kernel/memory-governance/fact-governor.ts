import type { Evidence, MemoryUpdateProposal, FactStatus } from '@/types/core';
import { ProjectFactRepository } from '../../db/repositories/project-fact-repo';

const PROMOTION_EVIDENCE_SOURCES: Evidence['source'][] = ['code', 'test', 'pr', 'ci', 'human'];
const CANDIDATE_ONLY_SOURCES: Evidence['source'][] = ['agent_inference'];

export class FactGovernor {
  private factRepo: ProjectFactRepository;

  constructor(factRepo?: ProjectFactRepository) {
    this.factRepo = factRepo || new ProjectFactRepository();
  }

  promoteFact(factId: string, evidence: Evidence[]): boolean {
    const fact = this.factRepo.findById(factId);
    if (!fact) return false;

    if (fact.status !== 'candidate') return false;

    const hasStrongEvidence = evidence.some((e) => PROMOTION_EVIDENCE_SOURCES.includes(e.source));
    if (!hasStrongEvidence) return false;

    this.factRepo.updateStatus(factId, 'active');
    this.factRepo.updateConfidence(factId, this.calculateConfidence(evidence));
    return true;
  }

  staleFact(factId: string, _reason: string): void {
    const fact = this.factRepo.findById(factId);
    if (!fact) return;

    if (fact.status === 'active' || fact.status === 'candidate') {
      this.factRepo.updateStatus(factId, 'stale');
    }
  }

  rejectFact(factId: string, _reason: string): void {
    const fact = this.factRepo.findById(factId);
    if (!fact) return;

    this.factRepo.updateStatus(factId, 'rejected');
  }

  generateMemoryUpdateProposal(_taskId: string): MemoryUpdateProposal[] {
    const proposals: MemoryUpdateProposal[] = [];
    const candidateFacts = this.factRepo.findByStatus('candidate');
    const staleFacts = this.factRepo.findByStatus('stale');

    for (const fact of candidateFacts) {
      const hasOnlyInference = fact.evidence.length > 0 && fact.evidence.every((e) => CANDIDATE_ONLY_SOURCES.includes(e.source));
      if (hasOnlyInference) {
        proposals.push({
          factId: fact.id,
          action: 'update',
          fact: { confidence: 'low', status: 'candidate' as FactStatus },
          reason: 'Fact only has agent inference evidence, keeping as candidate',
        });
      } else {
        proposals.push({
          factId: fact.id,
          action: 'update',
          fact: { status: 'active' as FactStatus },
          reason: 'Fact has strong evidence, promoting to active',
        });
      }
    }

    for (const fact of staleFacts) {
      proposals.push({
        factId: fact.id,
        action: 'stale',
        fact: { status: 'stale' as FactStatus },
        reason: 'Fact is stale and needs revalidation',
      });
    }

    return proposals;
  }

  private calculateConfidence(evidence: Evidence[]): 'low' | 'medium' | 'high' {
    const strongSources = ['code', 'test', 'pr', 'ci', 'human'];
    const strongCount = evidence.filter((e) => strongSources.includes(e.source)).length;

    if (strongCount >= 3) return 'high';
    if (strongCount >= 1) return 'medium';
    return 'low';
  }
}
