import type { ModuleInfo } from '@/types/core';

const MODULE_KEYWORDS: Record<string, string[]> = {
  auth: ['auth', 'login', 'session', 'token', 'password', 'credential', 'oauth'],
  api: ['api', 'route', 'endpoint', 'rest', 'graphql', 'controller'],
  ui: ['component', 'page', 'view', 'layout', 'modal', 'form', 'button'],
  database: ['database', 'db', 'model', 'schema', 'migration', 'query', 'repository'],
  config: ['config', 'setting', 'env', 'variable', 'option'],
  test: ['test', 'spec', 'mock', 'fixture', 'coverage'],
  infra: ['infra', 'deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes'],
  payment: ['payment', 'billing', 'checkout', 'stripe', 'subscription'],
  security: ['security', 'encryption', 'hash', 'sanitize', 'validate'],
  docs: ['doc', 'readme', 'guide', 'tutorial'],
};

function extractKeywords(goal: string): string[] {
  const lower = goal.toLowerCase();
  const words = lower.match(/\b[a-z]{3,}\b/g) || [];
  return [...new Set(words)];
}

function matchModules(keywords: string[], modules: ModuleInfo[]): string[] {
  const matched: string[] = [];
  const keywordSet = new Set(keywords);

  for (const mod of modules) {
    const modLower = mod.name.toLowerCase();
    const modPathLower = mod.path.toLowerCase();

    for (const [, categoryKeywords] of Object.entries(MODULE_KEYWORDS)) {
      const hasCategoryKeyword = categoryKeywords.some((kw) => keywordSet.has(kw));
      const moduleMatchesCategory = categoryKeywords.some((kw) => modLower.includes(kw) || modPathLower.includes(kw));
      if (hasCategoryKeyword && moduleMatchesCategory && !matched.includes(mod.name)) {
        matched.push(mod.name);
      }
    }

    for (const kw of keywords) {
      if ((modLower.includes(kw) || modPathLower.includes(kw)) && !matched.includes(mod.name)) {
        matched.push(mod.name);
      }
    }
  }

  return matched;
}

export function parseRequirement(goal: string): { parsedGoal: string; targetModules: string[]; keywords: string[] } {
  const keywords = extractKeywords(goal);
  const targetModules: string[] = [];

  return {
    parsedGoal: goal.trim(),
    targetModules,
    keywords,
  };
}

export function parseRequirementWithModules(goal: string, modules: ModuleInfo[]): { parsedGoal: string; targetModules: string[]; keywords: string[] } {
  const keywords = extractKeywords(goal);
  const targetModules = matchModules(keywords, modules);

  return {
    parsedGoal: goal.trim(),
    targetModules,
    keywords,
  };
}
