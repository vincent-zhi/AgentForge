import type { ToolName } from '../runtime/types.js';

export interface OrganizationPolicy {
  policyId: string;
  name: string;
  forbiddenReadPatterns: string[];
  forbiddenWritePatterns: string[];
  approvalRequiredPatterns: string[];
  commandAllowlist: string[];
  toolAllowlist: ToolName[];
  modelAllowlist: string[];
  compliance: {
    blockEnvFiles: boolean;
    blockSecrets: boolean;
    blockProductionConfig: boolean;
    blockCustomerData: boolean;
  };
}

export type PolicyDecisionStatus = 'allow' | 'deny' | 'approval_required';

export interface PolicyDecision {
  status: PolicyDecisionStatus;
  reasons: string[];
  matchedPatterns: string[];
}
