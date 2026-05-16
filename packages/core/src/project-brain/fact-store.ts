import type { ProjectBrainFact } from './types.js';
import { markStaleFacts } from './scanner.js';

export type MemoryCandidateStatus = 'pending' | 'approved' | 'rejected';

export interface ProjectBrainCandidate {
  candidateId: string;
  fact: ProjectBrainFact;
  proposedBy: string;
  proposedAt: string;
  status: MemoryCandidateStatus;
  reason?: string;
}

export interface ProjectBrainConflict {
  factId: string;
  current: ProjectBrainFact;
  incoming: ProjectBrainFact;
  reason: string;
}

export interface ProjectBrainSnapshot {
  facts: ProjectBrainFact[];
  candidates: ProjectBrainCandidate[];
  conflicts: ProjectBrainConflict[];
  staleFactIds: string[];
}

export class ProjectBrainFactStore {
  private readonly facts = new Map<string, ProjectBrainFact>();
  private readonly candidates = new Map<string, ProjectBrainCandidate>();
  private readonly conflicts: ProjectBrainConflict[] = [];

  constructor(initialFacts: ProjectBrainFact[] = []) {
    for (const fact of initialFacts) this.facts.set(fact.factId, fact);
  }

  ingestValidatedFacts(facts: ProjectBrainFact[]): ProjectBrainConflict[] {
    const conflicts: ProjectBrainConflict[] = [];
    for (const fact of facts) {
      const existing = this.facts.get(fact.factId);
      if (existing && existing.statement !== fact.statement) {
        const conflict = { factId: fact.factId, current: existing, incoming: fact, reason: 'Validated fact statement differs from existing Project Brain fact.' };
        this.conflicts.push(conflict);
        conflicts.push(conflict);
        continue;
      }
      this.facts.set(fact.factId, fact);
    }
    return conflicts;
  }

  proposeCandidate(fact: ProjectBrainFact, proposedBy: string, reason?: string): ProjectBrainCandidate {
    const candidate: ProjectBrainCandidate = {
      candidateId: `candidate_${this.candidates.size + 1}`,
      fact: { ...fact, confidence: fact.confidence === 'high' ? 'medium' : fact.confidence, evidence: { ...fact.evidence, source: fact.evidence.source === 'human' ? 'human' : 'agent_candidate' } },
      proposedBy,
      proposedAt: new Date().toISOString(),
      status: 'pending',
      reason
    };
    this.candidates.set(candidate.candidateId, candidate);
    return candidate;
  }

  approveCandidate(candidateId: string, approver: string): ProjectBrainFact {
    const candidate = this.getCandidate(candidateId);
    const approvedFact: ProjectBrainFact = {
      ...candidate.fact,
      confidence: 'high',
      evidence: { ...candidate.fact.evidence, source: 'human', notes: appendNote(candidate.fact.evidence.notes, `Approved by ${approver}`) },
      validatedBy: [...new Set([...candidate.fact.validatedBy, approver])]
    };
    candidate.status = 'approved';
    this.facts.set(approvedFact.factId, approvedFact);
    return approvedFact;
  }

  rejectCandidate(candidateId: string, reason: string): ProjectBrainCandidate {
    const candidate = this.getCandidate(candidateId);
    candidate.status = 'rejected';
    candidate.reason = reason;
    return candidate;
  }

  markChangedFiles(changedFiles: string[]): ProjectBrainFact[] {
    const updated = markStaleFacts([...this.facts.values()], changedFiles);
    this.facts.clear();
    for (const fact of updated) this.facts.set(fact.factId, fact);
    return updated.filter((fact) => fact.confidence === 'stale');
  }

  getFact(factId: string): ProjectBrainFact | undefined {
    return this.facts.get(factId);
  }

  snapshot(): ProjectBrainSnapshot {
    const facts = [...this.facts.values()];
    return {
      facts,
      candidates: [...this.candidates.values()],
      conflicts: [...this.conflicts],
      staleFactIds: facts.filter((fact) => fact.confidence === 'stale').map((fact) => fact.factId)
    };
  }

  private getCandidate(candidateId: string): ProjectBrainCandidate {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) throw new Error(`Unknown Project Brain candidate: ${candidateId}`);
    return candidate;
  }
}

function appendNote(existing: string | undefined, note: string): string {
  return existing ? `${existing}; ${note}` : note;
}
