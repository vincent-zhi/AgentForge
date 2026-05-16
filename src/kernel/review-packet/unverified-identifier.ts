import type { ImpactMap, EvidenceEntry, UnverifiedItem, RiskLevel } from '@/types/core';

function checkTestsNotRun(impactMap: ImpactMap, evidenceEntries: EvidenceEntry[]): UnverifiedItem | null {
  const testEvidence = evidenceEntries.filter((e) => e.type === 'test');
  const affectedTestCommands = impactMap.affectedTests.map((t) => t.command);

  const runCommands = testEvidence.map((e) => e.content);
  const unrunTests = affectedTestCommands.filter(
    (cmd) => !runCommands.some((run) => run.includes(cmd) || cmd.includes(run))
  );

  if (unrunTests.length > 0) {
    return {
      type: 'test',
      description: `${unrunTests.length} affected test(s) not run: ${unrunTests.slice(0, 3).join(', ')}${unrunTests.length > 3 ? '...' : ''}`,
      risk: 'high' as RiskLevel,
    };
  }

  return null;
}

function checkContractsNotVerified(impactMap: ImpactMap, evidenceEntries: EvidenceEntry[]): UnverifiedItem | null {
  const mustPreserveContracts = impactMap.contractsTouched.filter(
    (c) => c.compatibility === 'must_preserve'
  );

  if (mustPreserveContracts.length === 0) return null;

  const contractEvidence = evidenceEntries.filter(
    (e) => e.type === 'agent_log' && e.content.includes('contract')
  );

  const verifiedContractIds = contractEvidence
    .filter((e) => e.result === 'verified' || e.result === 'passed')
    .map((e) => mustPreserveContracts.filter((c) => e.content.includes(c.id)))
    .flat()
    .map((c) => c.id);

  const unverifiedContracts = mustPreserveContracts.filter(
    (c) => !verifiedContractIds.includes(c.id)
  );

  if (unverifiedContracts.length > 0) {
    return {
      type: 'contract',
      description: `${unverifiedContracts.length} must-preserve contract(s) not verified: ${unverifiedContracts.map((c) => c.name).join(', ')}`,
      risk: 'critical' as RiskLevel,
    };
  }

  return null;
}

function checkAssumptionsNotVerified(evidenceEntries: EvidenceEntry[]): UnverifiedItem | null {
  const assumptionLogs = evidenceEntries.filter(
    (e) => e.type === 'agent_log' && e.content.toLowerCase().includes('assumption')
  );

  const unverifiedAssumptions = assumptionLogs.filter(
    (e) => !e.result || e.result === 'unverified'
  );

  if (unverifiedAssumptions.length > 0) {
    return {
      type: 'assumption',
      description: `${unverifiedAssumptions.length} assumption(s) not verified`,
      risk: 'medium' as RiskLevel,
    };
  }

  return null;
}

function checkHighRiskPathsNotReviewed(impactMap: ImpactMap): UnverifiedItem | null {
  if (impactMap.forbiddenChanges.length > 0) {
    return {
      type: 'path',
      description: `High-risk path(s) touched: ${impactMap.forbiddenChanges.join('; ')}`,
      risk: 'critical' as RiskLevel,
    };
  }

  if (impactMap.risk.level === 'high' || impactMap.risk.level === 'critical') {
    return {
      type: 'path',
      description: `High-risk area modified (risk: ${impactMap.risk.level}) without explicit review`,
      risk: 'high' as RiskLevel,
    };
  }

  return null;
}

export function identifyUnverifiedItems(
  impactMap: ImpactMap,
  evidenceEntries: EvidenceEntry[]
): UnverifiedItem[] {
  const items: UnverifiedItem[] = [];

  const testItem = checkTestsNotRun(impactMap, evidenceEntries);
  if (testItem) items.push(testItem);

  const contractItem = checkContractsNotVerified(impactMap, evidenceEntries);
  if (contractItem) items.push(contractItem);

  const assumptionItem = checkAssumptionsNotVerified(evidenceEntries);
  if (assumptionItem) items.push(assumptionItem);

  const pathItem = checkHighRiskPathsNotReviewed(impactMap);
  if (pathItem) items.push(pathItem);

  return items;
}
