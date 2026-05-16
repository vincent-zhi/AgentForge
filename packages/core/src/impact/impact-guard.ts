import { findConsumersForContract, findContractsForFiles } from '../contract/contract-graph.js';
import type { ImpactContract, ImpactGuardInput, ImpactMap, RiskLevel } from './types.js';

const CRITICAL_PATTERNS = [/migration/i, /database/i, /schema/i, /prod/i, /secret/i, /\.env/i];
const HIGH_PATTERNS = [/auth/i, /payment/i, /billing/i, /security/i, /token/i, /public-api/i, /api/i];

export function generateImpactMap(input: ImpactGuardInput): ImpactMap {
  const module = inferChangeModule(input.targetFiles, input.knownModules);
  const contractsTouched = inferContracts(input);
  const upstreamDependencies = inferUpstream(input.targetFiles, input.knownModules);
  const downstreamDependents = inferDownstream(module, input.knownModules);
  const risk = assessRisk(input, contractsTouched, downstreamDependents);

  return {
    changeTarget: { module, files: input.targetFiles },
    upstreamDependencies,
    downstreamDependents,
    contractsTouched,
    risk,
    requiredVerification: selectRequiredVerification(input, module, risk.level),
    forbiddenChanges: forbiddenChangesFor(risk.level, input.targetFiles)
  };
}

export function summarizeImpactMap(map: ImpactMap): string {
  return `This change affects ${new Set([map.changeTarget.module, ...map.downstreamDependents]).size} modules, ${map.contractsTouched.length} public contracts, and ${map.downstreamDependents.length} dependent areas. Risk level: ${map.risk.level.toUpperCase()}.`;
}

function inferChangeModule(targetFiles: string[], knownModules: string[]): string {
  for (const module of knownModules.sort((a, b) => b.length - a.length)) {
    if (targetFiles.some((file) => file === module || file.startsWith(`${module}/`))) return module;
  }
  const [first, second] = targetFiles[0]?.split('/') ?? ['.'];
  return ['apps', 'packages', 'services'].includes(first) && second ? `${first}/${second}` : first;
}

function inferContracts(input: ImpactGuardInput): ImpactContract[] {
  const graphContracts = findContractsForFiles(input.contractGraph, input.targetFiles).map((contract) => ({
    contractId: contract.contractId,
    consumers: findConsumersForContract(input.contractGraph, contract.contractId),
    compatibility: 'must_preserve' as const
  }));
  if (graphContracts.length > 0) return graphContracts;
  return input.publicContracts
    .filter((contract) => input.targetFiles.some((file) => contract === file || contract.startsWith(file.split('/').slice(0, 2).join('/')) || file.includes('api') || file.includes('types')))
    .map((contract) => ({
      contractId: contract.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '.'),
      consumers: input.knownModules.filter((module) => !contract.startsWith(module)).slice(0, 5),
      compatibility: 'must_preserve' as const
    }));
}

function inferUpstream(targetFiles: string[], knownModules: string[]): string[] {
  const topLevel = new Set(targetFiles.map((file) => file.split('/')[0]));
  return knownModules.filter((module) => ![...topLevel].some((prefix) => module.startsWith(prefix))).slice(0, 5);
}

function inferDownstream(module: string, knownModules: string[]): string[] {
  return knownModules.filter((candidate) => candidate !== module && !module.startsWith(candidate)).slice(0, 8);
}

function assessRisk(input: ImpactGuardInput, contractsTouched: ImpactContract[], downstreamDependents: string[]): ImpactMap['risk'] {
  const haystack = [...input.targetFiles, input.goal, ...input.highRiskAreas].join(' ');
  const reasons: string[] = [];
  let level: RiskLevel = 'low';
  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(haystack))) {
    level = 'critical';
    reasons.push('Touches critical data, production configuration, secrets, or migration-related paths.');
  } else if (HIGH_PATTERNS.some((pattern) => pattern.test(haystack))) {
    level = 'high';
    reasons.push('Touches authentication, payment, security, token, or public API paths.');
  } else if (contractsTouched.length > 0 || downstreamDependents.length > 2) {
    level = 'medium';
    reasons.push('Touches shared contracts or multiple dependent modules.');
  }
  if (contractsTouched.length > 0) reasons.push(`Touches ${contractsTouched.length} public contract(s).`);
  if (downstreamDependents.length > 0) reasons.push(`Has ${downstreamDependents.length} downstream dependent module(s).`);
  if (reasons.length === 0) reasons.push('Appears localized based on current Project Brain evidence.');
  return { level, reasons };
}

function selectRequiredVerification(input: ImpactGuardInput, module: string, risk: RiskLevel): string[] {
  const targeted = input.testCommands.filter((command) => command.includes(module) || command.includes('test') || command.includes('typecheck'));
  const fallback = targeted.length > 0 ? targeted : ['pnpm test', 'pnpm typecheck'];
  return risk === 'low' ? fallback.slice(0, 2) : fallback.slice(0, 5);
}

function forbiddenChangesFor(risk: RiskLevel, targetFiles: string[]): string[] {
  const forbidden = ['Do not modify unrelated modules without expanding the Context Lease.'];
  if (risk === 'high' || risk === 'critical') {
    forbidden.push('Do not change public contracts without explicit compatibility review.');
    forbidden.push('Do not alter token storage, database migrations, secrets, or production configuration automatically.');
  }
  if (targetFiles.some((file) => /auth|token/i.test(file))) forbidden.push('Do not modify backend authentication protocol without approval.');
  return forbidden;
}
