import type { ContractType, ContractRef } from '@/types/core';

export type ContractCompatibility = ContractRef['compatibility'];

export interface ContractNode {
  id: string;
  type: ContractType;
  name: string;
  module: string;
}

export interface ContractEdge {
  from: string;
  to: string;
  type: 'provides' | 'consumes';
  compatibility: ContractCompatibility;
}

export class ContractGraph {
  nodes: Map<string, ContractNode> = new Map();
  edges: ContractEdge[] = [];

  addNode(node: ContractNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: ContractEdge): void {
    this.edges.push(edge);
  }

  getProviders(contractId: string): ContractNode[] {
    return this.edges
      .filter((e) => e.to === contractId && e.type === 'provides')
      .map((e) => this.nodes.get(e.from))
      .filter((n): n is ContractNode => n !== undefined);
  }

  getConsumers(contractId: string): ContractNode[] {
    return this.edges
      .filter((e) => e.from === contractId && e.type === 'consumes')
      .map((e) => this.nodes.get(e.to))
      .filter((n): n is ContractNode => n !== undefined);
  }

  getContractsForModule(moduleName: string): ContractNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.module === moduleName);
  }

  toContractRefs(): ContractRef[] {
    return Array.from(this.nodes.values()).map((node) => {
      const consumers = this.edges
        .filter((e) => e.from === node.id && e.type === 'consumes')
        .map((e) => this.nodes.get(e.to)?.module || e.to);
      const providerEdge = this.edges.find((e) => e.to === node.id && e.type === 'provides');
      const compatibility = providerEdge?.compatibility || 'flexible';
      return {
        id: node.id,
        type: node.type,
        name: node.name,
        provider: node.module,
        consumers: [...new Set(consumers)],
        compatibility,
      };
    });
  }
}
