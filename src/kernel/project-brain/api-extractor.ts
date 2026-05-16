import fs from 'fs';
import path from 'path';
import type { ModuleInfo } from '@/types/core';

const EXPORT_REGEX = [
  /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g,
  /export\s+\{([^}]+)\}/g,
];

function extractExportsFromFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exports: string[] = [];

    for (const regex of EXPORT_REGEX) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          const names = match[1].split(',').map((s) => {
            const parts = s.trim().split(/\s+as\s+/);
            return parts[parts.length - 1].trim();
          }).filter(Boolean);
          exports.push(...names);
        }
      }
    }

    return [...new Set(exports)];
  } catch {
    return [];
  }
}

function walkSourceFiles(dir: string, rootPath: string, callback: (fullPath: string, relativePath: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, rootPath, callback);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      callback(fullPath, relativePath);
    }
  }
}

export function extractPublicApis(rootPath: string, modules: ModuleInfo[]): Array<{ module: string; exports: string[] }> {
  const results: Array<{ module: string; exports: string[] }> = [];

  for (const mod of modules) {
    const modulePath = path.join(rootPath, mod.path);
    if (!fs.existsSync(modulePath)) {
      results.push({ module: mod.name, exports: [] });
      continue;
    }

    const allExports: string[] = [];

    const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    for (const idx of indexFiles) {
      const indexPath = path.join(modulePath, idx);
      if (fs.existsSync(indexPath)) {
        allExports.push(...extractExportsFromFile(indexPath));
      }
    }

    if (allExports.length === 0) {
      walkSourceFiles(modulePath, rootPath, (fullPath) => {
        allExports.push(...extractExportsFromFile(fullPath));
      });
    }

    results.push({ module: mod.name, exports: [...new Set(allExports)] });
  }

  return results;
}
