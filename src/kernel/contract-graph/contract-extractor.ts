import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ModuleInfo, ContractRef, ContractType } from '@/types/core';

const API_ROUTE_PATTERNS = [
  /(?:app|src)\/api\/(.+)\/route\.(ts|js)/,
  /pages\/api\/(.+)\.(ts|js)/,
  /src\/routes\/(.+)\.(ts|js)/,
];

const TYPE_EXPORT_PATTERN = /export\s+(?:interface|type)\s+(\w+)/g;

const EVENT_HANDLER_PATTERNS = [
  /(?:on|emit|dispatch|subscribe|publish)\w*\s*\(/g,
  /\.on\s*\(\s*['"](\w+)['"]/g,
  /\.emit\s*\(\s*['"](\w+)['"]/g,
];

function walkDirForContracts(dir: string, modulePath: string, callback: (fullPath: string, relativePath: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(modulePath, fullPath);
    if (entry.isDirectory()) {
      walkDirForContracts(fullPath, modulePath, callback);
    } else if (entry.isFile()) {
      callback(fullPath, relativePath);
    }
  }
}

function scanApiRoutes(modulePath: string, moduleName: string): ContractRef[] {
  const contracts: ContractRef[] = [];
  if (!fs.existsSync(modulePath)) return contracts;

  walkDirForContracts(modulePath, modulePath, (_fullPath, relativePath) => {
    for (const pattern of API_ROUTE_PATTERNS) {
      const match = relativePath.match(pattern);
      if (match) {
        contracts.push({
          id: uuidv4(),
          type: 'api' as ContractType,
          name: `API: /${match[1]}`,
          provider: moduleName,
          consumers: [],
          compatibility: 'must_preserve',
        });
        break;
      }
    }
  });

  return contracts;
}

function scanTypeExports(modulePath: string, moduleName: string): ContractRef[] {
  const contracts: ContractRef[] = [];
  if (!fs.existsSync(modulePath)) return contracts;

  try {
    walkDirForContracts(modulePath, modulePath, (fullPath) => {
      if (!/\.(ts|tsx)$/.test(fullPath)) return;
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        TYPE_EXPORT_PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = TYPE_EXPORT_PATTERN.exec(content)) !== null) {
          contracts.push({
            id: uuidv4(),
            type: 'type' as ContractType,
            name: match[1],
            provider: moduleName,
            consumers: [],
            compatibility: 'should_preserve',
          });
        }
      } catch {}
    });
  } catch {}

  return contracts;
}

function scanEventHandlers(modulePath: string, moduleName: string): ContractRef[] {
  const contracts: ContractRef[] = [];
  if (!fs.existsSync(modulePath)) return contracts;

  try {
    walkDirForContracts(modulePath, modulePath, (fullPath) => {
      if (!/\.(ts|tsx|js|jsx)$/.test(fullPath)) return;
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of EVENT_HANDLER_PATTERNS) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(content)) !== null) {
            const eventName = match[1] || match[0].replace(/[^a-zA-Z]/g, '');
            if (eventName && !contracts.some((c) => c.name === `Event: ${eventName}`)) {
              contracts.push({
                id: uuidv4(),
                type: 'behavior' as ContractType,
                name: `Event: ${eventName}`,
                provider: moduleName,
                consumers: [],
                compatibility: 'should_preserve',
              });
            }
          }
        }
      } catch {}
    });
  } catch {}

  return contracts;
}

export function extractContracts(rootPath: string, modules: ModuleInfo[]): ContractRef[] {
  const allContracts: ContractRef[] = [];

  for (const mod of modules) {
    const modulePath = path.join(rootPath, mod.path);
    allContracts.push(...scanApiRoutes(modulePath, mod.name));
    allContracts.push(...scanTypeExports(modulePath, mod.name));
    allContracts.push(...scanEventHandlers(modulePath, mod.name));
  }

  return allContracts;
}
