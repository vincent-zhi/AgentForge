import type { ImpactMap, RiskLevel } from '../impact/types.js';
import type { ProjectBrainFact } from '../project-brain/types.js';

export interface ChangedFileEvidence {
  file: string;
  intent: string;
  status: 'created' | 'modified' | 'deleted';
}

export interface VerificationEvidence {
  command: string;
  status: 'passed' | 'failed' | 'skipped';
  summary: string;
  logRef?: string;
}

export interface EvidenceReviewPacket {
  taskId: string;
  goal: string;
  result: string;
  changedFiles: ChangedFileEvidence[];
  impact: ImpactMap;
  plannedImpactVsActual: {
    plannedFiles: string[];
    actualFiles: string[];
    outOfScopeFiles: string[];
  };
  verification: VerificationEvidence[];
  riskLevel: RiskLevel;
  breakingChangeAssessment: string;
  reviewerFocus: string[];
  projectBrainUpdateCandidates: ProjectBrainFact[];
}
