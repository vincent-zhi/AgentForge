import type { ContractGraph } from '../contract/types.js';

export type ProjectBrainConfidence = 'low' | 'medium' | 'high' | 'stale';

export type ProjectBrainEvidenceSource = 'code' | 'test' | 'ci' | 'pr' | 'human' | 'agent_candidate';

export interface ProjectBrainFact {
  factId: string;
  type: 'module_boundary' | 'dependency' | 'behavior_contract' | 'test_mapping' | 'ci_command' | 'risk_area' | 'team_rule' | 'architecture_decision';
  statement: string;
  scope: {
    modules?: string[];
    files?: string[];
    commands?: string[];
  };
  evidence: {
    source: ProjectBrainEvidenceSource;
    files?: string[];
    commit?: string;
    notes?: string;
  };
  confidence: ProjectBrainConfidence;
  validatedBy: string[];
  expiresWhen: string[];
}

export interface RepoIntelligenceSummary {
  rootPath: string;
  modules: string[];
  publicContracts: string[];
  testCommands: string[];
  highRiskAreas: string[];
  confidenceScore: number;
  facts: ProjectBrainFact[];
  contractGraph: ContractGraph;
}

export interface ProjectBrainStore {
  facts: ProjectBrainFact[];
  staleFactIds: string[];
}
