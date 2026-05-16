import type { ImpactMap, ContractRef, ModuleInfo, RiskLevel } from '@/types/core';

function deriveWritablePaths(targetModules: string[], impactMap: ImpactMap, modules: ModuleInfo[]): string[] {
  const writable: string[] = [];
  for (const modName of targetModules) {
    const mod = modules.find((m) => m.name === modName);
    if (mod) {
      writable.push(mod.path);
    }
  }
  for (const dep of impactMap.downstreamDependents) {
    if (!writable.includes(dep.path)) {
      writable.push(dep.path);
    }
  }
  return writable;
}

function deriveReadonlyPaths(impactMap: ImpactMap, modules: ModuleInfo[], writablePaths: string[]): string[] {
  const readonly: string[] = [];
  for (const mod of modules) {
    if (!writablePaths.includes(mod.path) && !impactMap.forbiddenChanges.some((f) => f.includes(mod.name))) {
      readonly.push(mod.path);
    }
  }
  return readonly;
}

function deriveForbiddenPaths(impactMap: ImpactMap, riskMarkers: Map<string, RiskLevel>): string[] {
  const forbidden: string[] = [...impactMap.forbiddenChanges];
  for (const [riskPath, level] of riskMarkers.entries()) {
    if (level === 'critical' && !forbidden.includes(riskPath)) {
      forbidden.push(riskPath);
    }
  }
  return forbidden;
}

function deriveMustPreserveContracts(contracts: ContractRef[]): ContractRef[] {
  return contracts.filter((c) => c.compatibility === 'must_preserve');
}

export function deriveScope(
  parsedGoal: { parsedGoal: string; targetModules: string[]; keywords: string[] },
  impactMap: ImpactMap,
  brainService: { getScanResult: () => { modules: ModuleInfo[] } | null } | null
): { writable: string[]; readonly: string[]; forbidden: string[]; mustPreserve: ContractRef[] } {
  let modules: ModuleInfo[] = [];
  if (brainService) {
    const scanResult = brainService.getScanResult();
    if (scanResult) {
      modules = scanResult.modules;
    }
  }

  const writable = deriveWritablePaths(parsedGoal.targetModules, impactMap, modules);
  const readonly = deriveReadonlyPaths(impactMap, modules, writable);
  const forbidden = deriveForbiddenPaths(impactMap, new Map());
  const mustPreserve = deriveMustPreserveContracts(impactMap.contractsTouched);

  return { writable, readonly, forbidden, mustPreserve };
}
