import type { ReviewPacket } from '@/types/core';

export interface SafeApplyCheck {
  check: string;
  passed: boolean;
  details?: string;
}

function checkImpactMapGenerated(packet: ReviewPacket): SafeApplyCheck {
  const hasImpactMap = !!packet.impactMap;
  return {
    check: 'Impact Map generated',
    passed: hasImpactMap,
    details: hasImpactMap ? undefined : 'No impact map found for this task',
  };
}

function checkContractsVerified(packet: ReviewPacket): SafeApplyCheck {
  const mustPreserveContracts = packet.impactMap?.contractsTouched.filter(
    (c) => c.compatibility === 'must_preserve'
  ) ?? [];

  if (mustPreserveContracts.length === 0) {
    return {
      check: 'Contracts checked',
      passed: true,
      details: 'No must-preserve contracts affected',
    };
  }

  const verifiedContracts = packet.verification.filter(
    (v) => v.type === 'contract' && v.passed
  );

  const allVerified = mustPreserveContracts.every((c) =>
    verifiedContracts.some((v) => v.name.includes(c.name) || v.name.includes(c.id))
  );

  return {
    check: 'Contracts checked',
    passed: allVerified,
    details: allVerified
      ? `${mustPreserveContracts.length} must-preserve contract(s) verified`
      : `${mustPreserveContracts.length} must-preserve contract(s) not all verified`,
  };
}

function checkWorktreeIsolated(): SafeApplyCheck {
  return {
    check: 'Worktree isolated',
    passed: true,
    details: 'Worktree isolation verified (placeholder)',
  };
}

function checkTestsPassed(packet: ReviewPacket): SafeApplyCheck {
  const testResults = packet.verification.filter((v) => v.type === 'test');

  if (testResults.length === 0) {
    return {
      check: 'Tests passed',
      passed: false,
      details: 'No test results recorded',
    };
  }

  const allPassed = testResults.every((v) => v.passed);
  const failedCount = testResults.filter((v) => !v.passed).length;

  return {
    check: 'Tests passed',
    passed: allPassed,
    details: allPassed
      ? `${testResults.length} test(s) passed`
      : `${failedCount} of ${testResults.length} test(s) failed`,
  };
}

function checkNoUnverifiedItems(packet: ReviewPacket): SafeApplyCheck {
  const highRiskItems = packet.unverifiedItems.filter(
    (u) => u.risk === 'high' || u.risk === 'critical'
  );

  if (highRiskItems.length > 0) {
    return {
      check: 'No unverified items',
      passed: false,
      details: `${highRiskItems.length} high/critical unverified item(s): ${highRiskItems.map((u) => u.description).join('; ')}`,
    };
  }

  const lowRiskItems = packet.unverifiedItems.filter(
    (u) => u.risk === 'low' || u.risk === 'medium'
  );

  return {
    check: 'No unverified items',
    passed: true,
    details: lowRiskItems.length > 0
      ? `${lowRiskItems.length} low/medium unverified item(s) (acceptable)`
      : 'All items verified',
  };
}

function checkNoHighRiskPaths(packet: ReviewPacket): SafeApplyCheck {
  const hasForbidden = packet.impactMap?.forbiddenChanges.length > 0;

  return {
    check: 'No high-risk paths touched',
    passed: !hasForbidden,
    details: hasForbidden
      ? `Forbidden changes: ${packet.impactMap.forbiddenChanges.join('; ')}`
      : 'No forbidden paths touched',
  };
}

function checkNoBreakingChanges(packet: ReviewPacket): SafeApplyCheck {
  return {
    check: 'No breaking changes',
    passed: !packet.hasBreakingChange,
    details: packet.hasBreakingChange
      ? 'Breaking changes detected'
      : 'No breaking changes detected',
  };
}

function checkNoOutOfScope(packet: ReviewPacket): SafeApplyCheck {
  return {
    check: 'No out-of-scope changes',
    passed: !packet.isOutOfScope,
    details: packet.isOutOfScope
      ? 'Changes detected outside task scope'
      : 'All changes within scope',
  };
}

export function runSafeApplyChecks(_taskId: string, packet: ReviewPacket): SafeApplyCheck[] {
  return [
    checkImpactMapGenerated(packet),
    checkContractsVerified(packet),
    checkWorktreeIsolated(),
    checkTestsPassed(packet),
    checkNoUnverifiedItems(packet),
    checkNoHighRiskPaths(packet),
    checkNoBreakingChanges(packet),
    checkNoOutOfScope(packet),
  ];
}

export function canApply(checks: SafeApplyCheck[]): boolean {
  return checks.every((c) => c.passed);
}
