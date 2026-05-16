import type { EvidenceReviewPacket, VerificationEvidence } from './types.js';
import type { ImpactMap } from '../impact/types.js';
import type { ProjectBrainFact } from '../project-brain/types.js';

export interface BuildReviewPacketInput {
  taskId: string;
  goal: string;
  result: string;
  impact: ImpactMap;
  actualFiles: string[];
  verification: VerificationEvidence[];
  projectBrainUpdateCandidates?: ProjectBrainFact[];
}

export function buildEvidenceReviewPacket(input: BuildReviewPacketInput): EvidenceReviewPacket {
  const plannedFiles = input.impact.changeTarget.files;
  const outOfScopeFiles = input.actualFiles.filter((file) => !plannedFiles.includes(file));
  return {
    taskId: input.taskId,
    goal: input.goal,
    result: input.result,
    changedFiles: input.actualFiles.map((file) => ({ file, intent: inferFileIntent(file, input.goal), status: plannedFiles.includes(file) ? 'modified' : 'created' })),
    impact: input.impact,
    plannedImpactVsActual: { plannedFiles, actualFiles: input.actualFiles, outOfScopeFiles },
    verification: input.verification,
    riskLevel: input.impact.risk.level,
    breakingChangeAssessment: input.impact.contractsTouched.length > 0 ? 'Contracts touched; reviewer must confirm compatibility.' : 'No public contract touch detected by current Impact Map.',
    reviewerFocus: buildReviewerFocus(input.impact, outOfScopeFiles),
    projectBrainUpdateCandidates: input.projectBrainUpdateCandidates ?? []
  };
}

export function renderReviewPacketMarkdown(packet: EvidenceReviewPacket): string {
  const lines = [
    `# Review Packet: ${packet.taskId}`,
    '',
    '## Result',
    packet.result,
    '',
    '## Changed Files',
    ...packet.changedFiles.map((file) => `- ${file.file}\n  - ${file.intent}`),
    '',
    '## Impact',
    `Risk: ${packet.riskLevel}`,
    `Affected modules: ${[packet.impact.changeTarget.module, ...packet.impact.downstreamDependents].join(', ') || 'None detected'}`,
    `Contracts touched: ${packet.impact.contractsTouched.map((contract) => contract.contractId).join(', ') || 'None detected'}`,
    '',
    '## Verification',
    ...packet.verification.map((item) => `- ${item.command} ${statusIcon(item.status)} — ${item.summary}`),
    '',
    '## Reviewer Focus',
    ...packet.reviewerFocus.map((focus, index) => `${index + 1}. ${focus}`)
  ];
  return lines.join('\n');
}

function inferFileIntent(file: string, goal: string): string {
  if (/test|spec/i.test(file)) return `Add or update verification for: ${goal}`;
  return `Implement task goal: ${goal}`;
}

function buildReviewerFocus(impact: ImpactMap, outOfScopeFiles: string[]): string[] {
  const focus = [...impact.risk.reasons];
  if (impact.contractsTouched.length > 0) focus.push('Confirm touched public contracts remain backward compatible.');
  if (outOfScopeFiles.length > 0) focus.push(`Review out-of-scope files: ${outOfScopeFiles.join(', ')}`);
  return focus;
}

function statusIcon(status: VerificationEvidence['status']): string {
  if (status === 'passed') return '✅';
  if (status === 'failed') return '❌';
  return '⚠️';
}
