import fs from 'fs';
import path from 'path';
import type { ProjectScanResult, MonorepoType, TsconfigPathMapping, TsconfigReference } from '@/types/core';
import { identifyModules } from './module-identifier';
import { mapTests } from './test-mapper';
import { markRisks } from './risk-marker';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.cache', '.vscode', '.idea', '__pycache__',
  '.terraform', 'vendor', '.venv', 'venv',
]);

const PACKAGE_MANAGER_FILES: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'bun.lockb': 'bun',
};

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'next': ['next.config.js', 'next.config.mjs', 'next.config.ts'],
  'nuxt': ['nuxt.config.js', 'nuxt.config.ts'],
  'vite': ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'],
  'remix': ['remix.config.js', 'remix.config.ts'],
  'angular': ['angular.json'],
  'vue': ['vue.config.js'],
  'svelte': ['svelte.config.js'],
};

function detectPackageManager(rootPath: string): string | undefined {
  for (const [file, manager] of Object.entries(PACKAGE_MANAGER_FILES)) {
    if (fs.existsSync(path.join(rootPath, file))) {
      return manager;
    }
  }
  return undefined;
}

function detectFramework(rootPath: string): string | undefined {
  for (const [framework, files] of Object.entries(FRAMEWORK_INDICATORS)) {
    for (const file of files) {
      if (fs.existsSync(path.join(rootPath, file))) {
        return framework;
      }
    }
  }
  return undefined;
}

function detectLanguage(rootPath: string): string {
  if (fs.existsSync(path.join(rootPath, 'tsconfig.json'))) return 'typescript';
  if (fs.existsSync(path.join(rootPath, 'deno.json')) || fs.existsSync(path.join(rootPath, 'deno.jsonc'))) return 'typescript';
  const pyFiles = ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'];
  for (const f of pyFiles) {
    if (fs.existsSync(path.join(rootPath, f))) return 'python';
  }
  if (fs.existsSync(path.join(rootPath, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) return 'rust';
  if (fs.existsSync(path.join(rootPath, 'pom.xml')) || fs.existsSync(path.join(rootPath, 'build.gradle'))) return 'java';
  if (fs.existsSync(path.join(rootPath, 'package.json'))) return 'javascript';
  return 'unknown';
}

function collectFiles(dir: string, basePath: string, results: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    if (entry.isDirectory()) {
      collectFiles(fullPath, basePath, results);
    } else {
      results.push(relativePath);
    }
  }
}

function detectMonorepoType(rootPath: string): { type: MonorepoType; workspaces: string[] } {
  if (fs.existsSync(path.join(rootPath, 'pnpm-workspace.yaml'))) {
    const workspaces = parsePnpmWorkspaces(rootPath);
    return { type: 'pnpm', workspaces };
  }

  if (fs.existsSync(path.join(rootPath, 'nx.json'))) {
    const workspaces = parseNxWorkspaces(rootPath);
    return { type: 'nx', workspaces };
  }

  if (fs.existsSync(path.join(rootPath, 'lerna.json'))) {
    const workspaces = parseLernaWorkspaces(rootPath);
    return { type: 'lerna', workspaces };
  }

  if (fs.existsSync(path.join(rootPath, 'turbo.json'))) {
    const workspaces = parsePackageJsonWorkspaces(rootPath);
    return { type: 'turborepo', workspaces };
  }

  const pkgWorkspaces = parsePackageJsonWorkspaces(rootPath);
  if (pkgWorkspaces.length > 0) {
    const lockFile = detectPackageManager(rootPath);
    const type: MonorepoType = lockFile === 'yarn' ? 'yarn' : 'npm';
    return { type, workspaces: pkgWorkspaces };
  }

  return { type: 'none', workspaces: [] };
}

function parsePnpmWorkspaces(rootPath: string): string[] {
  const yamlPath = path.join(rootPath, 'pnpm-workspace.yaml');
  try {
    const content = fs.readFileSync(yamlPath, 'utf-8');
    const packagesMatch = content.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/);
    if (!packagesMatch) return [];
    return packagesMatch[1]
      .split('\n')
      .map((line: string) => line.replace(/^\s*-\s*['"]?/, '').replace(/['"]?\s*$/, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseNxWorkspaces(rootPath: string): string[] {
  try {
    const nxJsonPath = path.join(rootPath, 'nx.json');
    if (!fs.existsSync(nxJsonPath)) return parsePackageJsonWorkspaces(rootPath);
    return parsePackageJsonWorkspaces(rootPath);
  } catch {
    return [];
  }
}

function parseLernaWorkspaces(rootPath: string): string[] {
  try {
    const lernaJsonPath = path.join(rootPath, 'lerna.json');
    const content = fs.readFileSync(lernaJsonPath, 'utf-8');
    const lerna = JSON.parse(content);
    if (Array.isArray(lerna.packages)) return lerna.packages;
    if (lerna.useWorkspaces) return parsePackageJsonWorkspaces(rootPath);
    return [];
  } catch {
    return parsePackageJsonWorkspaces(rootPath);
  }
}

function parsePackageJsonWorkspaces(rootPath: string): string[] {
  const pkgJsonPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const workspaces = pkg.workspaces;
    if (Array.isArray(workspaces)) return workspaces;
    if (workspaces && Array.isArray(workspaces.packages)) return workspaces.packages;
  } catch {}
  return [];
}

function parseTsconfig(rootPath: string): { paths: TsconfigPathMapping[]; references: TsconfigReference[] } {
  const tsconfigPath = path.join(rootPath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return { paths: [], references: [] };

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8');
    const cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const tsconfig = JSON.parse(cleaned);

    const pathMappings: TsconfigPathMapping[] = [];
    const compilerPaths = tsconfig.compilerOptions?.paths;
    if (compilerPaths && typeof compilerPaths === 'object') {
      for (const [pattern, targetPaths] of Object.entries(compilerPaths)) {
        if (Array.isArray(targetPaths)) {
          pathMappings.push({ pattern, paths: targetPaths.filter((p): p is string => typeof p === 'string') });
        }
      }
    }

    const refs: TsconfigReference[] = [];
    const references = tsconfig.references;
    if (Array.isArray(references)) {
      for (const ref of references) {
        if (ref && typeof ref === 'object' && typeof ref.path === 'string') {
          refs.push({ path: ref.path });
        }
      }
    }

    return { paths: pathMappings, references: refs };
  } catch {
    return { paths: [], references: [] };
  }
}

export function scanProject(rootPath: string): ProjectScanResult {
  const files: string[] = [];
  collectFiles(rootPath, rootPath, files);

  const language = detectLanguage(rootPath);
  const framework = detectFramework(rootPath);
  const packageManager = detectPackageManager(rootPath);
  const { type: monorepo, workspaces } = detectMonorepoType(rootPath);
  const { paths: tsconfigPaths, references: tsconfigReferences } = parseTsconfig(rootPath);

  let name = path.basename(rootPath);
  const pkgJsonPath = path.join(rootPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.name) name = pkg.name;
    } catch {}
  }

  const modules = identifyModules({ rootPath, name, language, framework, packageManager, modules: [], testCommands: [], highRiskPaths: [] });
  const testCommands = mapTests(rootPath, modules);
  const riskMap = markRisks(modules, rootPath);
  const highRiskPaths = Array.from(riskMap.entries())
    .filter(([, level]) => level === 'high' || level === 'critical')
    .map(([modPath]) => modPath);

  return {
    rootPath,
    name,
    language,
    framework,
    packageManager,
    modules,
    testCommands,
    highRiskPaths,
    monorepo: monorepo === 'none' ? undefined : monorepo,
    workspaces: workspaces.length > 0 ? workspaces : undefined,
    tsconfigPaths: tsconfigPaths.length > 0 ? tsconfigPaths : undefined,
    tsconfigReferences: tsconfigReferences.length > 0 ? tsconfigReferences : undefined,
  };
}
