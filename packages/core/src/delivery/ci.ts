import type { EvidenceReviewPacket, VerificationEvidence } from '../evidence/types.js';
import type { CiCheckResult, DeliveryPackage, PullRequestDraft } from './types.js';

export function verificationFromCi(check: CiCheckResult): VerificationEvidence {
  return {
    command: check.command ?? check.checkName,
    status: check.status === 'passed' ? 'passed' : check.status === 'failed' ? 'failed' : 'skipped',
    summary: `${check.provider}: ${check.summary}`,
    logRef: check.url
  };
}

export function mergeCiIntoReviewPacket(packet: EvidenceReviewPacket, checks: CiCheckResult[]): EvidenceReviewPacket {
  const ciVerification = checks.filter((check) => check.status !== 'running').map(verificationFromCi);
  const existingCommands = new Set(packet.verification.map((item) => item.command));
  return {
    ...packet,
    verification: [
      ...packet.verification,
      ...ciVerification.filter((item) => !existingCommands.has(item.command))
    ]
  };
}

export function buildDeliveryPackage(pr: PullRequestDraft, checks: CiCheckResult[] = []): DeliveryPackage {
  const updatedPacket = mergeCiIntoReviewPacket(pr.reviewPacket, checks);
  return {
    taskId: pr.reviewPacket.taskId,
    pullRequest: { ...pr, reviewPacket: updatedPacket, body: pr.body },
    ciChecks: checks,
    verification: updatedPacket.verification
  };
}
