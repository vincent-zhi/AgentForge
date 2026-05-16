import type { ContractRef } from '@/types/core';

export function analyzeConsumers(contracts: ContractRef[], dependencyGraph: Map<string, string[]>): ContractRef[] {
  const updatedContracts = contracts.map((contract) => ({ ...contract, consumers: [...contract.consumers] }));

  for (const [module, deps] of dependencyGraph.entries()) {
    for (const dep of deps) {
      const providedContracts = updatedContracts.filter((c) => c.provider === dep);
      for (const contract of providedContracts) {
        if (!contract.consumers.includes(module)) {
          contract.consumers.push(module);
        }
      }
    }
  }

  return updatedContracts;
}
