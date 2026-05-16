import type { EvidenceReviewPacket, VerificationEvidence } from '../evidence/types.js';

export type PullRequestProvider = 'github' | 'gitlab' | 'bitbucket';

export interface PullRequestDraft {
  provider: PullRequestProvider;
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  labels: string[];
  reviewPacket: EvidenceReviewPacket;
}

export type CiCheckStatus = 'passed' | 'failed' | 'skipped' | 'running';

export interface CiCheckResult {
  provider: string;
  checkName: string;
  command?: string;
  status: CiCheckStatus;
  summary: string;
  url?: string;
  completedAt?: string;
}

export interface DeliveryPackage {
  taskId: string;
  pullRequest: PullRequestDraft;
  ciChecks: CiCheckResult[];
  verification: VerificationEvidence[];
}
