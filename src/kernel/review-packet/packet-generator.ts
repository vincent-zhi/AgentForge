import type {
  TaskCapsule,
  ImpactMap,
  EvidenceEntry,
  ChangedFile,
  IntentDiff,
  ReviewPacket,
  VerificationResult,
  RiskAssessment,
  MemoryUpdateProposal,
  SuggestedPr,
  IntentType,
} from '@/types/core';
import { identifyUnverifiedItems } from './unverified-identifier';

function determineResult(
  verification: VerificationResult[],
  unverifiedItems: ReviewPacket['unverifiedItems']
): ReviewPacket['result'] {
  const hasFailed = verification.some((v) => !v.passed);
  const hasHighRiskUnverified = unverifiedItems.some(
    (u) => u.risk === 'critical' || u.risk === 'high'
  );

  if (hasFailed || hasHighRiskUnverified) return 'failed';
  if (unverifiedItems.length > 0) return 'partial';
  return 'success';
}

function generateReviewerFocus(
  impactMap: ImpactMap,
  intentDiffs: IntentDiff[],
  unverifiedItems: ReviewPacket['unverifiedItems']
): string[] {
  const focus: string[] = [];

  focus.push(...impactMap.reviewFocus);

  const intents = new Set<IntentType>();
  for (const diff of intentDiffs) {
    for (const hunk of diff.hunks) {
      intents.add(hunk.intent);
    }
  }

  if (intents.has('business_fix') && intents.has('refactor')) {
    focus.push('Mixed intent changes: verify refactor is intentional and not scope creep');
  }

  if (intents.has('compatibility')) {
    focus.push('Error handling changes: verify compatibility is preserved');
  }

  for (const item of unverifiedItems) {
    if (item.risk === 'critical' || item.risk === 'high') {
      focus.push(`Unverified: ${item.description}`);
    }
  }

  return [...new Set(focus)];
}

function generatePrSuggestion(
  capsule: TaskCapsule,
  changedFiles: ChangedFile[],
  intentDiffs: IntentDiff[],
  impactMap: ImpactMap
): SuggestedPr {
  const intentCounts: Record<IntentType, number> = {
    business_fix: 0,
    compatibility: 0,
    test_coverage: 0,
    documentation: 0,
    refactor: 0,
  };

  for (const diff of intentDiffs) {
    for (const hunk of diff.hunks) {
      intentCounts[hunk.intent]++;
    }
  }

  const primaryIntent = (Object.entries(intentCounts) as [IntentType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const intentPrefix: Record<IntentType, string> = {
    business_fix: 'fix',
    compatibility: 'compat',
    test_coverage: 'test',
    documentation: 'docs',
    refactor: 'refactor',
  };

  const title = `${intentPrefix[primaryIntent]}: ${capsule.goal}`;

  const bodyParts: string[] = [];
  bodyParts.push(`## Summary\n${capsule.goal}`);
  bodyParts.push(`## Changed Files (${changedFiles.length})`);
  for (const f of changedFiles) {
    bodyParts.push(`- \`${f.path}\` (+${f.additions}/-${f.deletions}) [${f.intent}]`);
  }

  if (impactMap.contractsTouched.length > 0) {
    bodyParts.push(`## Contracts Touched`);
    for (const c of impactMap.contractsTouched) {
      bodyParts.push(`- ${c.name} (${c.compatibility})`);
    }
  }

  const labels: string[] = [primaryIntent];
  if (impactMap.risk.level === 'critical' || impactMap.risk.level === 'high') {
    labels.push('high-risk');
  }
  if (changedFiles.length > 10) {
    labels.push('large-change');
  }

  const reviewers: string[] = [];
  if (impactMap.contractsTouched.some((c) => c.compatibility === 'must_preserve')) {
    reviewers.push('contract-reviewer');
  }
  if (impactMap.risk.level === 'critical') {
    reviewers.push('security-reviewer');
  }

  return {
    title,
    body: bodyParts.join('\n'),
    labels,
    reviewers,
  };
}

function generateMemoryUpdates(
  capsule: TaskCapsule,
  impactMap: ImpactMap,
  changedFiles: ChangedFile[],
  intentDiffs: IntentDiff[]
): MemoryUpdateProposal[] {
  const proposals: MemoryUpdateProposal[] = [];

  for (const contract of impactMap.contractsTouched) {
    proposals.push({
      factId: contract.id,
      action: 'update',
      fact: {
        type: 'contract',
        statement: `Contract "${contract.name}" was modified during task "${capsule.goal}"`,
        evidence: [{ source: 'agent_inference' }],
      },
      reason: `Contract touched by task ${capsule.id}`,
    });
  }

  const modules = new Set<string>();
  for (const f of changedFiles) {
    const parts = f.path.split('/');
    if (parts.length > 1) modules.add(parts[0]);
  }

  for (const module of modules) {
    proposals.push({
      action: 'create',
      fact: {
        type: 'module',
        statement: `Module "${module}" was modified during task "${capsule.goal}"`,
        scope: { modules: [module] },
        evidence: [{ source: 'agent_inference' }],
      },
      reason: `Module changed by task ${capsule.id}`,
    });
  }

  const intents = new Set<IntentType>();
  for (const diff of intentDiffs) {
    for (const hunk of diff.hunks) {
      intents.add(hunk.intent);
    }
  }

  if (intents.has('compatibility')) {
    proposals.push({
      action: 'create',
      fact: {
        type: 'decision',
        statement: `Compatibility fix applied in task "${capsule.goal}"`,
        evidence: [{ source: 'agent_inference' }],
      },
      reason: 'Compatibility change detected in intent diff',
    });
  }

  return proposals;
}

function checkOutOfScope(capsule: TaskCapsule, changedFiles: ChangedFile[]): boolean {
  for (const file of changedFiles) {
    const isInWritable = capsule.writable.some(
      (w) => file.path.startsWith(w) || file.path === w
    );
    const isInForbidden = capsule.forbidden.some(
      (f) => file.path.startsWith(f) || file.path === f
    );

    if (isInForbidden) return true;
    if (capsule.writable.length > 0 && !isInWritable) return true;
  }
  return false;
}

function checkBreakingChanges(
  impactMap: ImpactMap,
  verification: VerificationResult[]
): boolean {
  const mustPreserveTouched = impactMap.contractsTouched.filter(
    (c) => c.compatibility === 'must_preserve'
  );

  if (mustPreserveTouched.length === 0) return false;

  const failedContractChecks = verification.filter(
    (v) => v.type === 'contract' && !v.passed
  );

  if (failedContractChecks.length > 0) return true;

  if (impactMap.forbiddenChanges.length > 0) return true;

  return false;
}

export function generatePacket(
  taskId: string,
  capsule: TaskCapsule,
  impactMap: ImpactMap,
  evidenceEntries: EvidenceEntry[],
  changedFiles: ChangedFile[],
  intentDiffs: IntentDiff[]
): ReviewPacket {
  const testEntries = evidenceEntries.filter((e) => e.type === 'test');
  const contractEntries = evidenceEntries.filter(
    (e) => e.type === 'agent_log' && e.content.toLowerCase().includes('contract')
  );

  const verification: VerificationResult[] = [
    ...testEntries.map((e) => ({
      type: 'test' as const,
      name: e.content,
      passed: e.result === 'passed',
      details: e.metadata?.output as string | undefined,
    })),
    ...contractEntries.map((e) => ({
      type: 'contract' as const,
      name: e.content,
      passed: e.result === 'verified' || e.result === 'passed',
      details: e.metadata?.output as string | undefined,
    })),
  ];

  const risks: RiskAssessment[] = [impactMap.risk];

  const unverifiedItems = identifyUnverifiedItems(impactMap, evidenceEntries);

  const reviewerFocus = generateReviewerFocus(impactMap, intentDiffs, unverifiedItems);

  const suggestedPr = generatePrSuggestion(capsule, changedFiles, intentDiffs, impactMap);

  const memoryUpdates = generateMemoryUpdates(capsule, impactMap, changedFiles, intentDiffs);

  const isOutOfScope = checkOutOfScope(capsule, changedFiles);

  const hasBreakingChange = checkBreakingChanges(impactMap, verification);

  const result = determineResult(verification, unverifiedItems);

  return {
    taskId,
    result,
    changedFiles,
    intentDiff: intentDiffs,
    impactMap,
    verification,
    risks,
    reviewerFocus,
    unverifiedItems,
    memoryUpdates,
    suggestedPr,
    isOutOfScope,
    hasBreakingChange,
  };
}
