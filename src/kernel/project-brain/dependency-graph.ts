import fs from 'fs';
import path from 'path';
import type { ModuleInfo } from '@/types/core';

export interface DependencyGraphResult {
  importMap: Map<string, string[]>;
  exportMap: Map<string, string[]>;
  barrelFiles: string[];
}

const IMPORT_PATTERNS = [
  /import\s+.*?\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g,
  /import\s+['"](\.{1,2}\/[^'"]+)['"]/g,
  /require\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
  /import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
];

const DYNAMIC_IMPORT_PATTERNS = [
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\s*\(\s*`([^`]+)`\s*\)/g,
  /require\s*\(\s*`([^`]+)`\s*\)/g,
];

const RE_EXPORT_PATTERNS = [
  /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
  /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g,
  /export\s+\{[^}]*\}\s+from\s+["]([^"]+)["]/g,
];

function resolveImportToModule(importPath: string, fromFile: string, rootPath: string): string | null {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(rootPath, dir, importPath);
  const relative = path.relative(rootPath, resolved);
  const parts = relative.split(path.sep);
  return parts[0] || null;
}

function extractImportsFromFile(filePath: string, rootPath: string, relativePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const modules: string[] = [];

    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const moduleName = resolveImportToModule(importPath, relativePath, rootPath);
        if (moduleName) modules.push(moduleName);
      }
    }

    for (const pattern of DYNAMIC_IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          const moduleName = resolveImportToModule(importPath, relativePath, rootPath);
          if (moduleName) modules.push(moduleName);
        }
      }
    }

    return [...new Set(modules)];
  } catch {
    return [];
  }
}

function extractReExportsFromFile(filePath: string, rootPath: string, relativePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const modules: string[] = [];

    for (const pattern of RE_EXPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          const moduleName = resolveImportToModule(importPath, relativePath, rootPath);
          if (moduleName) modules.push(moduleName);
        }
      }
    }

    return [...new Set(modules)];
  } catch {
    return [];
  }
}

function isBarrelFile(filePath: string): boolean {
  const baseName = path.basename(filePath);
  if (!/^index\.(ts|tsx|js|jsx|mjs|cjs)$/.test(baseName)) return false;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
    const reExportLines = lines.filter(
      (line: string) => /^\s*export\s+(\*\s+from|{[^}]*}\s+from)/.test(line),
    );
    const nonExportLines = lines.filter(
      (line: string) => !/^\s*(export|import|\/\/|\/\*|\*|$)/.test(line),
    );
    return reExportLines.length >= 2 && nonExportLines.length <= 2;
  } catch {
    return false;
  }
}

function walkDir(dir: string, rootPath: string, callback: (fullPath: string, relativePath: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    if (entry.isDirectory()) {
      walkDir(fullPath, rootPath, callback);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      callback(fullPath, relativePath);
    }
  }
}

export function buildDependencyGraph(rootPath: string, modules: ModuleInfo[]): DependencyGraphResult {
  const importMap = new Map<string, string[]>();
  const exportMap = new Map<string, string[]>();
  const barrelFiles: string[] = [];
  const modulePathMap = new Map<string, string>();

  for (const mod of modules) {
    importMap.set(mod.name, []);
    exportMap.set(mod.name, []);
    modulePathMap.set(mod.path, mod.name);
  }

  const moduleByTopDir = new Map<string, string>();
  for (const mod of modules) {
    const topDir = mod.path.split(path.sep)[0] || '.';
    if (!moduleByTopDir.has(topDir)) {
      moduleByTopDir.set(topDir, mod.name);
    }
  }

  walkDir(rootPath, rootPath, (fullPath, relativePath) => {
    const topDir = relativePath.split(path.sep)[0] || '.';
    const sourceModule = moduleByTopDir.get(topDir);
    if (!sourceModule) return;

    const imports = extractImportsFromFile(fullPath, rootPath, relativePath);
    const currentDeps = importMap.get(sourceModule) || [];

    for (const imp of imports) {
      const targetModule = moduleByTopDir.get(imp);
      if (targetModule && targetModule !== sourceModule && !currentDeps.includes(targetModule)) {
        currentDeps.push(targetModule);
      }
    }

    importMap.set(sourceModule, currentDeps);

    const reExports = extractReExportsFromFile(fullPath, rootPath, relativePath);
    const currentExports = exportMap.get(sourceModule) || [];
    for (const exp of reExports) {
      const targetModule = moduleByTopDir.get(exp);
      if (targetModule && targetModule !== sourceModule && !currentExports.includes(targetModule)) {
        currentExports.push(targetModule);
      }
    }
    exportMap.set(sourceModule, currentExports);

    if (isBarrelFile(fullPath)) {
      barrelFiles.push(relativePath);
    }
  });

  return { importMap, exportMap, barrelFiles };
}
