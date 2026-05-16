import type { ContractConsumerEdge, ContractGraph, ContractKind, ContractNode } from './types.js';

export interface BuildContractGraphInput {
  modules: string[];
  publicContracts: string[];
  files?: string[];
}

export function buildContractGraph(input: BuildContractGraphInput): ContractGraph {
  const contracts = input.publicContracts.map((file) => buildContractNode(file, input.modules));
  const consumers = contracts.flatMap((contract) => inferConsumers(contract, input.modules, input.files ?? []));
  return { contracts, consumers };
}

export function findContractsForFiles(graph: ContractGraph | undefined, targetFiles: string[]): ContractNode[] {
  if (!graph) return [];
  return graph.contracts.filter((contract) => targetFiles.some((file) => contract.file === file || contract.file.startsWith(file) || file.startsWith(contract.ownerModule)));
}

export function findConsumersForContract(graph: ContractGraph | undefined, contractId: string): string[] {
  if (!graph) return [];
  return graph.consumers.filter((edge) => edge.contractId === contractId).map((edge) => edge.consumerModule);
}

function buildContractNode(file: string, modules: string[]): ContractNode {
  const ownerModule = inferOwnerModule(file, modules);
  return {
    contractId: file.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '.'),
    kind: inferContractKind(file),
    file,
    ownerModule,
    exports: inferExportNames(file)
  };
}

function inferConsumers(contract: ContractNode, modules: string[], files: string[]): ContractConsumerEdge[] {
  const candidates = modules.filter((module) => module !== contract.ownerModule);
  const explicit = new Set(files.filter((file) => file !== contract.file && fileIncludesContractName(file, contract)).map((file) => inferOwnerModule(file, modules)));
  const edges: ContractConsumerEdge[] = [];
  for (const module of candidates) {
    const reason = explicit.has(module) ? 'explicit_reference' : sharesTopLevel(module, contract.ownerModule) ? 'module_dependency' : 'naming_match';
    edges.push({ contractId: contract.contractId, consumerModule: module, reason });
  }
  return dedupeEdges(edges).slice(0, 12);
}

function inferOwnerModule(file: string, modules: string[]): string {
  for (const module of modules.sort((a, b) => b.length - a.length)) {
    if (file === module || file.startsWith(`${module}/`)) return module;
  }
  const [first, second] = file.split('/');
  return ['apps', 'packages', 'services'].includes(first) && second ? `${first}/${second}` : first || '.';
}

function inferContractKind(file: string): ContractKind {
  if (/schema|openapi|graphql|proto/i.test(file)) return 'schema';
  if (/routes|route|api/i.test(file)) return 'route';
  if (/types|type/i.test(file)) return 'type_contract';
  if (/events|analytics/i.test(file)) return 'event';
  if (/index|public-api/i.test(file)) return 'public_api';
  return 'unknown';
}

function inferExportNames(file: string): string[] {
  const basename = file.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'contract';
  return [basename.replace(/[^a-zA-Z0-9]+/g, '_')];
}

function fileIncludesContractName(file: string, contract: ContractNode): boolean {
  return contract.exports.some((name) => file.toLowerCase().includes(name.toLowerCase())) || file.toLowerCase().includes(contract.ownerModule.split('/').pop()?.toLowerCase() ?? '');
}

function sharesTopLevel(module: string, ownerModule: string): boolean {
  return module.split('/')[0] === ownerModule.split('/')[0];
}

function dedupeEdges(edges: ContractConsumerEdge[]): ContractConsumerEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.contractId}:${edge.consumerModule}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
