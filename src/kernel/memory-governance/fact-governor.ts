import type { Evidence, MemoryUpdateProposal, FactStatus, ProjectFact, ImpactMap } from '@/types/core';
import { ProjectFactRepository } from '../../db/repositories/project-fact-repo';

const PROMOTION_EVIDENCE_SOURCES: Evidence['source'][] = ['code', 'test', 'pr', 'ci', 'human'];
const CANDIDATE_ONLY_SOURCES: Evidence['source'][] = ['agent_inference'];

type StoredProposal = MemoryUpdateProposal & { id: string; proposalStatus: 'pending' | 'approved' | 'rejected'; taskId?: string; previousState?: Partial<ProjectFact>; createdFactId?: string };

export class FactGovernor {
  private factRepo: ProjectFactRepository;
  private proposals: StoredProposal[] = [];

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

  generateMemoryUpdateProposal(taskId: string): MemoryUpdateProposal[] {
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

    for (const proposal of proposals) {
      const stored: StoredProposal = {
        ...proposal,
        id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        proposalStatus: 'pending',
        taskId,
      };
      this.proposals.push(stored);
    }

    return proposals;
  }

  generateUpdateProposals(
    taskId: string,
    changedFiles: Array<{ path: string; intent: string; additions: number; deletions: number }>,
    _impactMap: ImpactMap,
  ): MemoryUpdateProposal[] {
    const proposals: MemoryUpdateProposal[] = [];
    const allFacts = this.factRepo.findAll(10000);

    for (const changedFile of changedFiles) {
      const isNewModule = changedFile.additions > 0 && changedFile.deletions === 0;
      if (isNewModule) {
        const moduleName = changedFile.path.split('/').slice(0, -1).join('/') || changedFile.path;
        proposals.push({
          action: 'create',
          fact: {
            type: 'module',
            statement: `New module/pattern detected: ${changedFile.path}`,
            scope: { modules: [moduleName] },
            evidence: [{ source: 'code', files: [changedFile.path] }],
            confidence: 'medium',
            status: 'candidate',
          },
          reason: `New file with only additions detected (${changedFile.additions} lines), suggesting a new module or pattern`,
        });
      }
    }

    for (const fact of allFacts) {
      if (fact.status !== 'active' && fact.status !== 'candidate') continue;

      const affectedByChanges = changedFiles.some((cf) =>
        fact.scope.modules.some((mod) => cf.path.startsWith(mod) || cf.path.includes(mod)),
      );

      if (affectedByChanges) {
        const hasSignificantDeletions = changedFiles.some(
          (cf) =>
            fact.scope.modules.some((mod) => cf.path.startsWith(mod) || cf.path.includes(mod)) &&
            cf.deletions > cf.additions,
        );

        if (hasSignificantDeletions) {
          proposals.push({
            factId: fact.id,
            action: 'reject',
            fact: { status: 'rejected' as FactStatus },
            reason: `Fact contradicts new code patterns in ${changedFiles.find((cf) => fact.scope.modules.some((mod) => cf.path.startsWith(mod) || cf.path.includes(mod)))?.path || 'affected files'}`,
          });
        } else {
          proposals.push({
            factId: fact.id,
            action: 'update',
            fact: {
              evidence: [
                ...fact.evidence,
                { source: 'code' as const, files: changedFiles.filter((cf) => fact.scope.modules.some((mod) => cf.path.startsWith(mod) || cf.path.includes(mod))).map((cf) => cf.path) },
              ],
              updatedAt: new Date().toISOString(),
            },
            reason: `Existing fact affected by code changes in scope: ${fact.scope.modules.join(', ')}`,
          });
        }
      }
    }

    for (const fact of allFacts) {
      if (fact.status !== 'active' && fact.status !== 'candidate') continue;

      const evidenceFilesModified = fact.evidence.some((e) =>
        e.files?.some((ef) => changedFiles.some((cf) => cf.path === ef)),
      );

      if (evidenceFilesModified) {
        const alreadyProposed = proposals.some((p) => p.factId === fact.id);
        if (!alreadyProposed) {
          proposals.push({
            factId: fact.id,
            action: 'stale',
            fact: { status: 'stale' as FactStatus },
            reason: `Files referenced in fact evidence have been modified`,
          });
        }
      }
    }

    for (const proposal of proposals) {
      const stored: StoredProposal = {
        ...proposal,
        id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        proposalStatus: 'pending',
        taskId,
      };
      this.proposals.push(stored);
    }

    return proposals;
  }

  applyProposal(proposal: MemoryUpdateProposal): void {
    const storedProposal = this.proposals.find(
      (p) => p.factId === proposal.factId && p.action === proposal.action && p.proposalStatus === 'pending',
    );

    if (proposal.action === 'create') {
      const newFact: ProjectFact = {
        id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: proposal.fact.type || 'module',
        statement: proposal.fact.statement || '',
        scope: proposal.fact.scope || { modules: [] },
        evidence: proposal.fact.evidence || [],
        confidence: proposal.fact.confidence || 'low',
        status: proposal.fact.status || 'candidate',
        expiresWhen: proposal.fact.expiresWhen || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.factRepo.insert(newFact);
      if (storedProposal) {
        storedProposal.createdFactId = newFact.id;
        storedProposal.proposalStatus = 'approved';
      }
    } else if (proposal.factId) {
      const existingFact = this.factRepo.findById(proposal.factId);
      if (storedProposal && existingFact) {
        storedProposal.previousState = {
          status: existingFact.status,
          confidence: existingFact.confidence,
          evidence: existingFact.evidence,
          updatedAt: existingFact.updatedAt,
        };
      }
      if (proposal.action === 'update') {
        if (proposal.fact.status) {
          this.factRepo.updateStatus(proposal.factId, proposal.fact.status);
        }
        if (proposal.fact.confidence) {
          this.factRepo.updateConfidence(proposal.factId, proposal.fact.confidence);
        }
      } else if (proposal.action === 'stale') {
        this.factRepo.updateStatus(proposal.factId, 'stale');
      } else if (proposal.action === 'reject') {
        this.factRepo.updateStatus(proposal.factId, 'rejected');
      }
      if (storedProposal) {
        storedProposal.proposalStatus = 'approved';
      }
    }
  }

  rejectProposal(proposalId: string): boolean {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (!proposal) return false;

    proposal.proposalStatus = 'rejected';

    if (proposal.action === 'create') {
      // Fact was never created, nothing to undo
    } else {
      // For update/stale/reject proposals, keep the current fact unchanged
    }

    return true;
  }

  revertByTaskId(taskId: string): number {
    const taskProposals = this.proposals.filter((p) => p.taskId === taskId && p.proposalStatus === 'approved');
    let revertedCount = 0;

    for (const proposal of taskProposals) {
      if (proposal.action === 'create') {
        if (proposal.createdFactId) {
          this.factRepo.deleteById(proposal.createdFactId);
        }
        revertedCount++;
      } else if (proposal.action === 'update') {
        if (proposal.factId && proposal.previousState) {
          if (proposal.previousState.status) {
            this.factRepo.updateStatus(proposal.factId, proposal.previousState.status);
          }
          if (proposal.previousState.confidence) {
            this.factRepo.updateConfidence(proposal.factId, proposal.previousState.confidence);
          }
        }
        revertedCount++;
      } else if (proposal.action === 'stale') {
        if (proposal.factId) {
          this.factRepo.updateStatus(proposal.factId, 'active');
        }
        revertedCount++;
      }

      proposal.proposalStatus = 'rejected';
    }

    return revertedCount;
  }

  private calculateConfidence(evidence: Evidence[]): 'low' | 'medium' | 'high' {
    const strongSources = ['code', 'test', 'pr', 'ci', 'human'];
    const strongCount = evidence.filter((e) => strongSources.includes(e.source)).length;

    if (strongCount >= 3) return 'high';
    if (strongCount >= 1) return 'medium';
    return 'low';
  }
}
