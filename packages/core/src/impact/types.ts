import type { ContractGraph } from '../contract/types.js';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ImpactContract {
  contractId: string;
  consumers: string[];
  compatibility: 'must_preserve' | 'can_extend' | 'breaking_requires_approval';
}

export interface ImpactMap {
  changeTarget: {
    module: string;
    files: string[];
  };
  upstreamDependencies: string[];
  downstreamDependents: string[];
  contractsTouched: ImpactContract[];
  risk: {
    level: RiskLevel;
    reasons: string[];
  };
  requiredVerification: string[];
  forbiddenChanges: string[];
}

export interface ImpactGuardInput {
  goal: string;
  targetFiles: string[];
  knownModules: string[];
  publicContracts: string[];
  contractGraph?: ContractGraph;
  testCommands: string[];
  highRiskAreas: string[];
}
