import fs from 'fs';
import path from 'path';
import type { ModuleInfo } from '@/types/core';

const IMPORT_PATTERNS = [
  /import\s+.*?\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g,
  /import\s+['"](\.{1,2}\/[^'"]+)['"]/g,
  /require\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
  /import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
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
    return [...new Set(modules)];
  } catch {
    return [];
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

export function buildDependencyGraph(rootPath: string, modules: ModuleInfo[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const modulePathMap = new Map<string, string>();

  for (const mod of modules) {
    graph.set(mod.name, []);
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
    const currentDeps = graph.get(sourceModule) || [];

    for (const imp of imports) {
      const targetModule = moduleByTopDir.get(imp);
      if (targetModule && targetModule !== sourceModule && !currentDeps.includes(targetModule)) {
        currentDeps.push(targetModule);
      }
    }

    graph.set(sourceModule, currentDeps);
  });

  return graph;
}
