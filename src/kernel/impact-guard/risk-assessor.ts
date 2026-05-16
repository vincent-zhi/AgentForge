import type { ChangeTarget, ModuleRef, ContractRef, RiskLevel, RiskAssessment } from '@/types/core';

function calculateDownstreamRisk(downstream: ModuleRef[]): { level: RiskLevel; reason: string } {
  const count = downstream.length;
  if (count >= 5) return { level: 'critical', reason: `${count} downstream dependents affected` };
  if (count >= 3) return { level: 'high', reason: `${count} downstream dependents affected` };
  if (count >= 1) return { level: 'medium', reason: `${count} downstream dependents affected` };
  return { level: 'low', reason: 'No downstream dependents' };
}

function calculateContractRisk(contractsTouched: ContractRef[]): { level: RiskLevel; reason: string } {
  if (contractsTouched.length === 0) return { level: 'low', reason: 'No contracts touched' };

  const mustPreserve = contractsTouched.filter((c) => c.compatibility === 'must_preserve');
  const shouldPreserve = contractsTouched.filter((c) => c.compatibility === 'should_preserve');

  if (mustPreserve.length > 0) {
    return { level: 'critical', reason: `${mustPreserve.length} must-preserve contracts affected` };
  }
  if (shouldPreserve.length > 0) {
    return { level: 'high', reason: `${shouldPreserve.length} should-preserve contracts affected` };
  }
  return { level: 'medium', reason: `${contractsTouched.length} flexible contracts affected` };
}

function calculatePathRisk(target: ChangeTarget, riskMarkers: Map<string, RiskLevel>): { level: RiskLevel; reason: string } {
  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  let maxRisk: RiskLevel = 'low';

  for (const file of target.files) {
    for (const [riskPath, level] of riskMarkers.entries()) {
      if (file.includes(riskPath) || riskPath.includes(file)) {
        const currentIdx = riskOrder.indexOf(maxRisk);
        const newIdx = riskOrder.indexOf(level);
        if (newIdx > currentIdx) maxRisk = level;
      }
    }
  }

  if (maxRisk !== 'low') {
    return { level: maxRisk, reason: `Changes in ${maxRisk}-risk area` };
  }
  return { level: 'low', reason: 'No high-risk paths affected' };
}

export function assessRisk(
  target: ChangeTarget,
  downstream: ModuleRef[],
  contractsTouched: ContractRef[],
  riskMarkers: Map<string, RiskLevel>
): RiskAssessment {
  const downstreamRisk = calculateDownstreamRisk(downstream);
  const contractRisk = calculateContractRisk(contractsTouched);
  const pathRisk = calculatePathRisk(target, riskMarkers);

  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const levels = [downstreamRisk.level, contractRisk.level, pathRisk.level];
  const maxIdx = Math.max(...levels.map((l) => riskOrder.indexOf(l)));
  const finalLevel = riskOrder[maxIdx];

  const reasons = [downstreamRisk.reason, contractRisk.reason, pathRisk.reason].filter(
    (r, i, arr) => arr.indexOf(r) === i
  );

  return { level: finalLevel, reasons };
}
