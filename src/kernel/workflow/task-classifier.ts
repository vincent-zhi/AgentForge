export type TaskComplexity = 'lightweight' | 'standard' | 'strict';

export interface TaskClassification {
  complexity: TaskComplexity;
  reasons: string[];
  estimatedFiles: number;
  hasContractImpact: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const LIGHTWEIGHT_KEYWORDS = [
  'fix typo', 'update comment', 'rename variable', 'fix spelling',
  'update readme', 'add comment', 'remove comment', 'fix lint',
  'format code', 'fix formatting', 'whitespace', 'trailing space',
  'fix import', 'unused import', 'dead code', 'log message',
  'console.log', 'debug print', 'fix warning',
];

const STRICT_KEYWORDS = [
  'authentication', 'auth', 'password', 'payment', 'billing',
  'database', 'migration', 'schema', 'credential', 'secret',
  'token', 'session', 'permission', 'authorization', 'rbac',
  'encryption', 'crypto', 'ssl', 'tls', 'certificate',
  'api key', 'private key', 'oauth', 'jwt',
];

const CROSS_MODULE_KEYWORDS = [
  'refactor', 'restructure', 'reorganize', 'migrate', 'rewrite',
  'redesign', 'rearchitect', 'port', 'upgrade dependency',
  'breaking change', 'deprecate', 'remove feature',
];

export function classifyTask(
  goal: string,
  context?: { moduleCount?: number; contractCount?: number; highRiskPaths?: string[] },
): TaskClassification {
  const goalLower = goal.toLowerCase();
  const reasons: string[] = [];
  let estimatedFiles = 1;
  let hasContractImpact = false;
  let riskLevel: TaskClassification['riskLevel'] = 'low';

  const isLightweightMatch = LIGHTWEIGHT_KEYWORDS.some((kw) => goalLower.includes(kw));
  const isStrictMatch = STRICT_KEYWORDS.some((kw) => goalLower.includes(kw));
  const isCrossModuleMatch = CROSS_MODULE_KEYWORDS.some((kw) => goalLower.includes(kw));
  const touchesHighRisk = context?.highRiskPaths?.some((p) => goalLower.includes(p.toLowerCase())) ?? false;

  let complexity: TaskComplexity = isLightweightMatch ? 'lightweight' : 'standard';

  if (isLightweightMatch) {
    reasons.push('Goal matches lightweight pattern');
  }

  if (touchesHighRisk) {
    reasons.push('Goal touches high-risk path');
    riskLevel = 'high';
    complexity = 'strict';
  }

  if (isStrictMatch) {
    reasons.push('Goal involves security-sensitive area');
    hasContractImpact = true;
    riskLevel = 'critical';
    complexity = 'strict';
  }

  if (isCrossModuleMatch) {
    reasons.push('Goal indicates cross-module changes');
    estimatedFiles = 5;
    riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    complexity = 'strict';
  }

  if (context?.contractCount && context.contractCount > 0) {
    reasons.push('Project has contracts that may be affected');
    hasContractImpact = true;
    if (complexity !== 'strict') {
      complexity = 'standard';
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
  }

  if (context?.moduleCount && context.moduleCount > 3) {
    reasons.push('Multi-module project detected');
    estimatedFiles = Math.max(estimatedFiles, 3);
    if (complexity === 'lightweight') {
      complexity = 'standard';
      riskLevel = 'medium';
    }
  }

  if (complexity === 'lightweight') {
    estimatedFiles = 1;
    hasContractImpact = false;
    riskLevel = 'low';
  }

  if (complexity === 'standard' && reasons.length === 0) {
    reasons.push('Default standard classification');
    estimatedFiles = 2;
    riskLevel = 'medium';
  }

  return {
    complexity,
    reasons,
    estimatedFiles,
    hasContractImpact,
    riskLevel,
  };
}
