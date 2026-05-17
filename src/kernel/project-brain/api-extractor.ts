import fs from 'fs';
import path from 'path';
import type { ModuleInfo } from '@/types/core';

export interface ApiInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const' | 'let' | 'var';
  typeSignature?: string;
  genericParams?: string[];
  isDefaultExport?: boolean;
}

const EXPORT_DECLARATION_REGEX = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;

const INTERFACE_REGEX = /export\s+(?:default\s+)?interface\s+(\w+)(?:<([^>]+)>)?\s*(?:extends\s+[^{]+)?\s*\{/g;

const TYPE_ALIAS_REGEX = /export\s+(?:default\s+)?type\s+(\w+)(?:<([^>]+)>)?\s*=/g;

const ENUM_REGEX = /export\s+(?:default\s+)?(?:const\s+)?enum\s+(\w+)\s*\{/g;

const EXPORT_CONST_TYPED_REGEX = /export\s+(?:default\s+)?const\s+(\w+)\s*:\s*([^=;\n]+)/g;

const EXPORT_BRACE_REGEX = /export\s+\{([^}]+)\}/g;

const GENERIC_PARAMS_REGEX = /<([^>]+)>/;

function extractGenericParams(genericStr: string | undefined): string[] {
  if (!genericStr) return [];
  return genericStr.split(',').map((p) => p.trim().split(/\s+extends\s+/)[0].trim()).filter(Boolean);
}

function extractApisFromFile(filePath: string): ApiInfo[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const apis: ApiInfo[] = [];
    const seen = new Set<string>();

    INTERFACE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INTERFACE_REGEX.exec(content)) !== null) {
      const name = match[1];
      const key = `interface:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        apis.push({
          name,
          kind: 'interface',
          typeSignature: match[0].replace(/\s*\{$/, '').trim(),
          genericParams: extractGenericParams(match[2]),
        });
      }
    }

    TYPE_ALIAS_REGEX.lastIndex = 0;
    while ((match = TYPE_ALIAS_REGEX.exec(content)) !== null) {
      const name = match[1];
      const key = `type:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        apis.push({
          name,
          kind: 'type',
          typeSignature: match[0].replace(/\s*=$/, '').trim(),
          genericParams: extractGenericParams(match[2]),
        });
      }
    }

    ENUM_REGEX.lastIndex = 0;
    while ((match = ENUM_REGEX.exec(content)) !== null) {
      const name = match[1];
      const key = `enum:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        apis.push({
          name,
          kind: 'enum',
          typeSignature: match[0].replace(/\s*\{$/, '').trim(),
        });
      }
    }

    EXPORT_CONST_TYPED_REGEX.lastIndex = 0;
    while ((match = EXPORT_CONST_TYPED_REGEX.exec(content)) !== null) {
      const name = match[1];
      const key = `const:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        const typeAnnotation = match[2].trim();
        const genericMatch = GENERIC_PARAMS_REGEX.exec(typeAnnotation);
        apis.push({
          name,
          kind: 'const',
          typeSignature: `const ${name}: ${typeAnnotation}`,
          genericParams: genericMatch ? extractGenericParams(genericMatch[1]) : undefined,
        });
      }
    }

    EXPORT_DECLARATION_REGEX.lastIndex = 0;
    while ((match = EXPORT_DECLARATION_REGEX.exec(content)) !== null) {
      const name = match[1];
      const kind = match[0].includes('function') ? 'function'
        : match[0].includes('class') ? 'class'
        : match[0].includes('interface') ? 'interface'
        : match[0].includes('type ') ? 'type'
        : match[0].includes('enum') ? 'enum'
        : 'const';
      const key = `${kind}:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        const isDefault = match[0].includes('default');
        const genericMatch = GENERIC_PARAMS_REGEX.exec(match[0]);
        apis.push({
          name,
          kind: kind as ApiInfo['kind'],
          isDefaultExport: isDefault,
          genericParams: genericMatch ? extractGenericParams(genericMatch[1]) : undefined,
        });
      }
    }

    EXPORT_BRACE_REGEX.lastIndex = 0;
    while ((match = EXPORT_BRACE_REGEX.exec(content)) !== null) {
      if (match[1]) {
        const names = match[1].split(',').map((s) => {
          const parts = s.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        }).filter(Boolean);
        for (const name of names) {
          const key = `export:${name}`;
          if (!seen.has(key)) {
            seen.add(key);
            apis.push({ name, kind: 'const' });
          }
        }
      }
    }

    return apis;
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

export function extractPublicApis(rootPath: string, modules: ModuleInfo[]): Array<{ module: string; apis: ApiInfo[]; exports: string[] }> {
  const results: Array<{ module: string; apis: ApiInfo[]; exports: string[] }> = [];

  for (const mod of modules) {
    const modulePath = path.join(rootPath, mod.path);
    if (!fs.existsSync(modulePath)) {
      results.push({ module: mod.name, apis: [], exports: [] });
      continue;
    }

    const allApis: ApiInfo[] = [];

    const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    for (const idx of indexFiles) {
      const indexPath = path.join(modulePath, idx);
      if (fs.existsSync(indexPath)) {
        allApis.push(...extractApisFromFile(indexPath));
      }
    }

    if (allApis.length === 0) {
      walkSourceFiles(modulePath, rootPath, (fullPath) => {
        allApis.push(...extractApisFromFile(fullPath));
      });
    }

    const exportNames = [...new Set(allApis.map((a) => a.name))];
    results.push({ module: mod.name, apis: allApis, exports: exportNames });
  }

  return results;
}
