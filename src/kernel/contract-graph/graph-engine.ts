import type { ModuleInfo, ContractRef } from '@/types/core';
import { ContractGraph } from './contract-types';
import { extractContracts } from './contract-extractor';
import { analyzeConsumers } from './consumer-analyzer';
import { checkCompatibility } from './compatibility-checker';
import { LRUCache } from '../cache/lru-cache';
import type { PluginRegistry } from '../plugin/plugin-registry';

export class GraphEngine {
  private graph: ContractGraph = new ContractGraph();
  private contracts: ContractRef[] = [];
  private pluginRegistry: PluginRegistry | null = null;
  private contractCache: LRUCache<string, any> = new LRUCache(50, 5 * 60 * 1000);

  setPluginRegistry(registry: PluginRegistry): void {
    this.pluginRegistry = registry;
  }

  async buildGraph(rootPath: string, modules: ModuleInfo[], dependencyGraph: Map<string, string[]>): Promise<ContractRef[]> {
    const extractedContracts = extractContracts(rootPath, modules);
    this.contracts = analyzeConsumers(extractedContracts, dependencyGraph);

    if (this.pluginRegistry) {
      const extractors = this.pluginRegistry.getContractExtractors();
      const filePaths = modules.map((m) => m.path);
      for (const extractor of extractors) {
        try {
          const result = await extractor.extractContracts(rootPath, filePaths);
          for (const contract of result.contracts) {
            const pluginContract: ContractRef = {
              id: `${extractor.name}:${contract.name}`,
              type: contract.type as ContractRef['type'],
              name: contract.name,
              provider: contract.filePath,
              consumers: contract.consumers,
              compatibility: contract.mustPreserve ? 'must_preserve' : 'flexible',
            };
            this.contracts.push(pluginContract);
          }
        } catch (err) {
          console.error(`[GraphEngine] Contract extractor plugin "${extractor.name}" failed:`, err);
        }
      }
    }

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
    const cacheKey = `module:${moduleName}`;
    const cached = this.contractCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.contracts.filter((c) => c.provider === moduleName || c.consumers.includes(moduleName));
    this.contractCache.set(cacheKey, result);
    return result;
  }

  checkContractCompatibility(contractId: string, changes: string[]): { compatible: boolean; reasons: string[] } {
    const cacheKey = `compat:${contractId}:${changes.sort().join(',')}`;
    const cached = this.contractCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const contract = this.contracts.find((c) => c.id === contractId);
    if (!contract) {
      return { compatible: false, reasons: [`Contract ${contractId} not found`] };
    }
    const result = checkCompatibility(contract, changes);
    this.contractCache.set(cacheKey, result);
    return result;
  }

  getGraph(): ContractGraph {
    return this.graph;
  }

  getAllContracts(): ContractRef[] {
    return this.contracts;
  }

  invalidateCache(): void {
    this.contractCache.clear();
  }
}
