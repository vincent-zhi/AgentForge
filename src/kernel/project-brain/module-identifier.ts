import fs from 'fs';
import path from 'path';
import type { ProjectScanResult, ModuleInfo, RiskLevel } from '@/types/core';

function parseWorkspaces(rootPath: string): string[] {
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

function expandGlobPatterns(rootPath: string, patterns: string[]): string[] {
  const dirs: string[] = [];
  for (const pattern of patterns) {
    const base = pattern.replace(/\/\*+$/, '');
    const fullPath = path.join(rootPath, base);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && fs.existsSync(path.join(fullPath, entry.name, 'package.json'))) {
          dirs.push(path.join(base, entry.name));
        }
      }
    }
  }
  return dirs;
}

function detectModuleLanguage(modulePath: string): string {
  if (fs.existsSync(path.join(modulePath, 'tsconfig.json'))) return 'typescript';
  if (fs.existsSync(path.join(modulePath, 'package.json'))) return 'javascript';
  const pyFiles = ['requirements.txt', 'setup.py', 'pyproject.toml'];
  for (const f of pyFiles) {
    if (fs.existsSync(path.join(modulePath, f))) return 'python';
  }
  return 'unknown';
}

function detectModuleFramework(modulePath: string): string | undefined {
  const indicators: Record<string, string[]> = {
    'next': ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    'nuxt': ['nuxt.config.js', 'nuxt.config.ts'],
    'vite': ['vite.config.ts', 'vite.config.js'],
    'express': ['package.json'],
  };
  for (const [fw, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (fs.existsSync(path.join(modulePath, file))) {
        if (fw === 'express') {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8'));
            if (pkg.dependencies?.express || pkg.devDependencies?.express) return 'express';
          } catch {}
        } else {
          return fw;
        }
      }
    }
  }
  return undefined;
}

function extractModuleDependencies(modulePath: string): string[] {
  const pkgJsonPath = path.join(modulePath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {});
    return deps;
  } catch {}
  return [];
}

function extractModuleExports(modulePath: string): string[] {
  const pkgJsonPath = path.join(modulePath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const exports: string[] = [];
    if (pkg.main) exports.push(pkg.main);
    if (pkg.exports) {
      if (typeof pkg.exports === 'string') exports.push(pkg.exports);
      else if (typeof pkg.exports === 'object') {
        for (const key of Object.keys(pkg.exports)) {
          const val = pkg.exports[key];
          if (typeof val === 'string') exports.push(val);
          else if (val && typeof val === 'object' && val.import) exports.push(val.import);
        }
      }
    }
    return exports;
  } catch {}
  return [];
}

function findModuleTestCommand(modulePath: string): string | undefined {
  const pkgJsonPath = path.join(modulePath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return undefined;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const scripts = pkg.scripts || {};
    if (scripts.test && scripts.test !== 'echo "Error: no test specified" && exit 1') {
      return scripts.test;
    }
  } catch {}
  return undefined;
}

export function identifyModules(scanResult: ProjectScanResult): ModuleInfo[] {
  const { rootPath } = scanResult;
  const modules: ModuleInfo[] = [];
  const workspacePatterns = parseWorkspaces(rootPath);

  if (workspacePatterns.length > 0) {
    const workspaceDirs = expandGlobPatterns(rootPath, workspacePatterns);
    for (const dir of workspaceDirs) {
      const fullPath = path.join(rootPath, dir);
      const dirName = path.basename(dir);
      const language = detectModuleLanguage(fullPath);
      const framework = detectModuleFramework(fullPath);
      const dependencies = extractModuleDependencies(fullPath);
      const exports = extractModuleExports(fullPath);
      const testCommand = findModuleTestCommand(fullPath);
      modules.push({
        name: dirName,
        path: dir,
        type: 'package',
        language,
        framework,
        dependencies,
        exports,
        testCommand,
        riskLevel: 'low' as RiskLevel,
      });
    }
  }

  if (modules.length === 0) {
    const language = detectModuleLanguage(rootPath);
    const framework = detectModuleFramework(rootPath);
    const dependencies = extractModuleDependencies(rootPath);
    const exports = extractModuleExports(rootPath);
    const testCommand = findModuleTestCommand(rootPath);
    modules.push({
      name: scanResult.name || path.basename(rootPath),
      path: '.',
      type: 'directory',
      language,
      framework,
      dependencies,
      exports,
      testCommand,
      riskLevel: 'low' as RiskLevel,
    });
  }

  return modules;
}
