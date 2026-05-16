import type { OrganizationPolicy, PolicyDecision } from './types.js';
import type { ToolName } from '../runtime/types.js';

export const DEFAULT_ORGANIZATION_POLICY: OrganizationPolicy = {
  policyId: 'default.local-safety',
  name: 'Default Local Safety Policy',
  forbiddenReadPatterns: ['**/.env', '**/.env.*', '**/*secret*', '**/*secrets*', '**/customer-data/**'],
  forbiddenWritePatterns: ['**/.env', '**/.env.*', '**/*secret*', '**/*secrets*', '**/prod/**', '**/production/**', '**/customer-data/**'],
  approvalRequiredPatterns: ['package.json', 'pnpm-workspace.yaml', '**/migrations/**', '**/migration/**', '**/database/**', '**/schema/**', '**/auth/**'],
  commandAllowlist: ['pnpm', 'npm', 'node', 'tsc', 'git', 'echo'],
  toolAllowlist: ['read_file', 'edit_file', 'create_file', 'delete_file', 'rename_file', 'search', 'run_shell', 'run_test', 'git', 'preview', 'mcp'],
  modelAllowlist: ['default'],
  compliance: {
    blockEnvFiles: true,
    blockSecrets: true,
    blockProductionConfig: true,
    blockCustomerData: true
  }
};

export function evaluateFileRead(policy: OrganizationPolicy, filePath: string): PolicyDecision {
  return evaluatePatterns(filePath, policy.forbiddenReadPatterns, [], compliancePatterns(policy), 'read');
}

export function evaluateFileWrite(policy: OrganizationPolicy, filePath: string): PolicyDecision {
  return evaluatePatterns(filePath, policy.forbiddenWritePatterns, policy.approvalRequiredPatterns, compliancePatterns(policy), 'write');
}

export function evaluateToolUse(policy: OrganizationPolicy, tool: ToolName): PolicyDecision {
  if (!policy.toolAllowlist.includes(tool)) {
    return { status: 'deny', reasons: [`Tool ${tool} is not allowed by organization policy.`], matchedPatterns: [tool] };
  }
  return { status: 'allow', reasons: [], matchedPatterns: [] };
}

export function evaluateCommand(policy: OrganizationPolicy, command: string): PolicyDecision {
  const executable = command.trim().split(/\s+/)[0] ?? '';
  if (!policy.commandAllowlist.includes(executable)) {
    return { status: 'deny', reasons: [`Command ${executable || '<empty>'} is not in the organization command allowlist.`], matchedPatterns: [executable] };
  }
  if (/\b(rm\s+-rf|curl\s+.*\|\s*sh|wget\s+.*\|\s*sh)\b/.test(command)) {
    return { status: 'approval_required', reasons: ['Command contains a destructive or remote script execution pattern.'], matchedPatterns: ['destructive-command'] };
  }
  return { status: 'allow', reasons: [], matchedPatterns: [] };
}

export function mergePolicy(base: OrganizationPolicy, override: Partial<OrganizationPolicy>): OrganizationPolicy {
  return {
    ...base,
    ...override,
    compliance: { ...base.compliance, ...override.compliance }
  };
}

function evaluatePatterns(value: string, forbidden: string[], approval: string[], compliance: string[], action: 'read' | 'write'): PolicyDecision {
  const forbiddenMatches = [...forbidden, ...compliance].filter((pattern) => matchGlob(pattern, value));
  if (forbiddenMatches.length > 0) {
    return { status: 'deny', reasons: [`Organization policy forbids ${action} access to ${value}.`], matchedPatterns: forbiddenMatches };
  }
  const approvalMatches = approval.filter((pattern) => matchGlob(pattern, value));
  if (approvalMatches.length > 0) {
    return { status: 'approval_required', reasons: [`Organization policy requires approval for ${action} access to ${value}.`], matchedPatterns: approvalMatches };
  }
  return { status: 'allow', reasons: [], matchedPatterns: [] };
}

function compliancePatterns(policy: OrganizationPolicy): string[] {
  const patterns: string[] = [];
  if (policy.compliance.blockEnvFiles) patterns.push('**/.env', '**/.env.*');
  if (policy.compliance.blockSecrets) patterns.push('**/*secret*', '**/*secrets*');
  if (policy.compliance.blockProductionConfig) patterns.push('**/prod/**', '**/production/**');
  if (policy.compliance.blockCustomerData) patterns.push('**/customer-data/**', '**/*customer-data*');
  return patterns;
}

function matchGlob(pattern: string, value: string): boolean {
  if (pattern === value || pattern === '**') return true;
  if (pattern.startsWith('**/') && value === pattern.slice(3)) return true;
  if (pattern.startsWith('**/') && pattern.endsWith('/**')) {
    const segment = pattern.slice(3, -3);
    return value === segment || value.startsWith(`${segment}/`) || value.includes(`/${segment}/`);
  }
  const normalizedPattern = pattern.startsWith('**/') ? `{root-or-any}/${pattern.slice(3)}` : pattern;
  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\{root-or-any\}\//g, '(.*/)?')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(value);
}
