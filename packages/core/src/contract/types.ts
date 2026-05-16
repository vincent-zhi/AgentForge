export type ContractKind = 'public_api' | 'type_contract' | 'schema' | 'route' | 'event' | 'unknown';

export interface ContractNode {
  contractId: string;
  kind: ContractKind;
  file: string;
  ownerModule: string;
  exports: string[];
}

export interface ContractConsumerEdge {
  contractId: string;
  consumerModule: string;
  reason: 'module_dependency' | 'naming_match' | 'explicit_reference';
}

export interface ContractGraph {
  contracts: ContractNode[];
  consumers: ContractConsumerEdge[];
}
