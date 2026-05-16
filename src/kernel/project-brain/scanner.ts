import fs from 'fs';
import path from 'path';
import type { ProjectScanResult } from '@/types/core';
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

export function scanProject(rootPath: string): ProjectScanResult {
  const files: string[] = [];
  collectFiles(rootPath, rootPath, files);

  const language = detectLanguage(rootPath);
  const framework = detectFramework(rootPath);
  const packageManager = detectPackageManager(rootPath);

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
  };
}
