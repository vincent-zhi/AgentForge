import type { ModuleInfo, ContractRef } from '@/types/core';
import { ContractGraph } from './contract-types';
import { extractContracts } from './contract-extractor';
import { analyzeConsumers } from './consumer-analyzer';
import { checkCompatibility } from './compatibility-checker';

export class GraphEngine {
  private graph: ContractGraph = new ContractGraph();
  private contracts: ContractRef[] = [];

  buildGraph(rootPath: string, modules: ModuleInfo[], dependencyGraph: Map<string, string[]>): ContractRef[] {
    const extractedContracts = extractContracts(rootPath, modules);
    this.contracts = analyzeConsumers(extractedContracts, dependencyGraph);

    this.graph = new ContractGraph();

    for (const contract of this.contracts) {
      this.graph.addNode({
        id: contract.id,
        type: contract.type,
        name: contract.name,
        module: contract.provider,
      });

      this.graph.addEdge({
        from: contract.provider,
        to: contract.id,
        type: 'provides',
        compatibility: contract.compatibility,
      });

      for (const consumer of contract.consumers) {
        this.graph.addEdge({
          from: contract.id,
          to: consumer,
          type: 'consumes',
          compatibility: contract.compatibility,
        });
      }
    }

    return this.contracts;
  }

  getContractsForModule(moduleName: string): ContractRef[] {
    return this.contracts.filter((c) => c.provider === moduleName || c.consumers.includes(moduleName));
  }

  checkContractCompatibility(contractId: string, changes: string[]): { compatible: boolean; reasons: string[] } {
    const contract = this.contracts.find((c) => c.id === contractId);
    if (!contract) {
      return { compatible: false, reasons: [`Contract ${contractId} not found`] };
    }
    return checkCompatibility(contract, changes);
  }

  getGraph(): ContractGraph {
    return this.graph;
  }

  getAllContracts(): ContractRef[] {
    return this.contracts;
  }
}
