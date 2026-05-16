import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { buildContractGraph } from '../contract/contract-graph.js';
import type { ProjectBrainFact, RepoIntelligenceSummary } from './types.js';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);
const HIGH_RISK_PATTERNS = ['auth', 'payment', 'migration', 'migrations', 'ci', 'deploy', 'secret', 'secrets', '.env', 'database', 'schema'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.rs', '.go', '.py', '.java', '.kt', '.cs'];

export interface ScanRepositoryOptions {
  maxFiles?: number;
}

export async function scanRepository(rootPath: string, options: ScanRepositoryOptions = {}): Promise<RepoIntelligenceSummary> {
  const maxFiles = options.maxFiles ?? 2_500;
  const files = await walk(rootPath, maxFiles);
  const packageJsonFiles = files.filter((file) => file.endsWith('package.json'));
  const modules = inferModules(files, packageJsonFiles);
  const testCommands = await discoverTestCommands(rootPath, packageJsonFiles);
  const publicContracts = files.filter(isLikelyPublicContract).slice(0, 100);
  const highRiskAreas = discoverHighRiskAreas(files);
  const contractGraph = buildContractGraph({ modules, publicContracts, files });
  const facts = buildFacts({ modules, testCommands, publicContracts, highRiskAreas });
  const confidenceScore = Math.min(95, 35 + modules.length * 6 + testCommands.length * 5 + publicContracts.length);

  return {
    rootPath,
    modules,
    publicContracts,
    testCommands,
    highRiskAreas,
    confidenceScore,
    facts,
    contractGraph
  };
}

export function markStaleFacts(facts: ProjectBrainFact[], changedFiles: string[]): ProjectBrainFact[] {
  return facts.map((fact) => {
    const shouldExpire = fact.expiresWhen.some((rule) => changedFiles.some((file) => rule.includes(file) || file.includes(rule.replace(' changes', ''))));
    if (!shouldExpire) return fact;
    return { ...fact, confidence: 'stale' };
  });
}

async function walk(rootPath: string, maxFiles: number): Promise<string[]> {
  const out: string[] = [];
  async function visit(dir: string): Promise<void> {
    if (out.length >= maxFiles) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile()) {
        out.push(relative(rootPath, full).split(sep).join('/'));
      }
    }
  }
  await visit(rootPath);
  return out;
}

function inferModules(files: string[], packageJsonFiles: string[]): string[] {
  const packageModules = packageJsonFiles.map((file) => file.replace(/\/package\.json$/, '') || '.');
  const sourceModules = new Set<string>();
  for (const file of files) {
    if (!SOURCE_EXTENSIONS.some((ext) => file.endsWith(ext))) continue;
    const [top, second] = file.split('/');
    if (['apps', 'packages', 'services'].includes(top) && second) sourceModules.add(`${top}/${second}`);
    else if (top === 'src') sourceModules.add('src');
  }
  return [...new Set([...packageModules, ...sourceModules])].sort();
}

async function discoverTestCommands(rootPath: string, packageJsonFiles: string[]): Promise<string[]> {
  const commands: string[] = [];
  for (const file of packageJsonFiles) {
    try {
      const packageJson = JSON.parse(await readFile(join(rootPath, file), 'utf8')) as { scripts?: Record<string, string>; name?: string };
      for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
        if (/test|typecheck|lint|check/i.test(name)) {
          const prefix = file === 'package.json' ? 'pnpm' : `pnpm --filter ${packageJson.name ?? file.replace('/package.json', '')}`;
          commands.push(`${prefix} ${name} # ${command}`);
        }
      }
    } catch {
      // Ignore malformed package metadata during best-effort brain scan.
    }
  }
  return commands;
}

function isLikelyPublicContract(file: string): boolean {
  return /(^|\/)(index|public-api|schema|contract|types|api|routes)\.(ts|tsx|js|json|yaml|yml)$/.test(file) || /openapi|graphql|proto/.test(file);
}

function discoverHighRiskAreas(files: string[]): string[] {
  const areas = new Set<string>();
  for (const file of files) {
    const lower = file.toLowerCase();
    if (HIGH_RISK_PATTERNS.some((pattern) => lower.includes(pattern))) {
      areas.add(file.split('/').slice(0, 3).join('/'));
    }
  }
  return [...areas].sort();
}

function buildFacts(input: Pick<RepoIntelligenceSummary, 'modules' | 'testCommands' | 'publicContracts' | 'highRiskAreas'>): ProjectBrainFact[] {
  const facts: ProjectBrainFact[] = [];
  for (const module of input.modules) {
    facts.push({
      factId: `module.${module.replace(/[^a-zA-Z0-9]+/g, '.')}`,
      type: 'module_boundary',
      statement: `${module} appears to be a project module boundary.`,
      scope: { modules: [module], files: [module] },
      evidence: { source: 'code', files: [module] },
      confidence: 'medium',
      validatedBy: [],
      expiresWhen: [`${module} changes`]
    });
  }
  if (input.testCommands.length > 0) {
    facts.push({
      factId: 'repo.test-commands',
      type: 'test_mapping',
      statement: 'Repository exposes test or verification commands through package scripts.',
      scope: { commands: input.testCommands },
      evidence: { source: 'code', files: ['package.json'] },
      confidence: 'medium',
      validatedBy: input.testCommands,
      expiresWhen: ['package.json changes']
    });
  }
  for (const area of input.highRiskAreas) {
    facts.push({
      factId: `risk.${area.replace(/[^a-zA-Z0-9]+/g, '.')}`,
      type: 'risk_area',
      statement: `${area} is a potentially high-risk area and should require Impact Guard review.`,
      scope: { files: [area] },
      evidence: { source: 'code', files: [area] },
      confidence: 'low',
      validatedBy: [],
      expiresWhen: [`${area} changes`]
    });
  }
  return facts;
}
