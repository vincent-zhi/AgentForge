import type { ModuleRef, ContractRef } from '@/types/core';

function findUpstream(targetModule: string, dependencyGraph: Map<string, string[]>): ModuleRef[] {
  const upstream: ModuleRef[] = [];
  const visited = new Set<string>();

  function traverse(module: string) {
    if (visited.has(module)) return;
    visited.add(module);
    const deps = dependencyGraph.get(module) || [];
    for (const dep of deps) {
      upstream.push({ name: dep, path: dep, type: 'package' });
      traverse(dep);
    }
  }

  traverse(targetModule);
  return upstream;
}

function findDownstream(targetModule: string, dependencyGraph: Map<string, string[]>): ModuleRef[] {
  const downstream: ModuleRef[] = [];
  const visited = new Set<string>();

  for (const [module, deps] of dependencyGraph.entries()) {
    if (deps.includes(targetModule) && !visited.has(module)) {
      visited.add(module);
      downstream.push({ name: module, path: module, type: 'package' });
      const transitive = findDownstream(module, dependencyGraph);
      for (const t of transitive) {
        if (!visited.has(t.name)) {
          visited.add(t.name);
          downstream.push(t);
        }
      }
    }
  }

  return downstream;
}

function findTouchedContracts(targetModule: string, targetFiles: string[], contracts: ContractRef[]): ContractRef[] {
  return contracts.filter((contract) => {
    if (contract.provider === targetModule) return true;
    for (const file of targetFiles) {
      if (contract.name.includes(file) || file.includes(contract.name)) return true;
    }
    return false;
  });
}

export function calculateImpact(
  targetModule: string,
  targetFiles: string[],
  dependencyGraph: Map<string, string[]>,
  contracts: ContractRef[]
): { upstream: ModuleRef[]; downstream: ModuleRef[]; contractsTouched: ContractRef[] } {
  const upstream = findUpstream(targetModule, dependencyGraph);
  const downstream = findDownstream(targetModule, dependencyGraph);
  const contractsTouched = findTouchedContracts(targetModule, targetFiles, contracts);

  return { upstream, downstream, contractsTouched };
}
