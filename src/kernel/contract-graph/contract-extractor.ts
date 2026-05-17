import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as ts from 'typescript';
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

function buildSignature(checker: ts.TypeChecker, _node: ts.Node, symbol: ts.Symbol): string {
  try {
    const declaration = symbol.valueDeclaration || symbol.declarations?.[0];
    if (!declaration) return '';

    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) {
      const sig = checker.getSignatureFromDeclaration(declaration as ts.SignatureDeclaration);
      if (sig) {
        return checker.signatureToString(sig);
      }
    }

    if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
      const type = checker.getTypeAtLocation(declaration);
      return checker.typeToString(type);
    }

    if (ts.isClassDeclaration(declaration)) {
      const type = checker.getTypeAtLocation(declaration);
      return checker.typeToString(type);
    }

    if (ts.isEnumDeclaration(declaration)) {
      return declaration.members
        .map((m) => {
          const name = ts.isIdentifier(m.name) ? m.name.text : m.name.getText();
          return name;
        })
        .join(', ');
    }

    return '';
  } catch {
    return '';
  }
}

function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isExported(node: ts.Node): boolean {
  return (
    (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
    (!!node.parent && ts.isSourceFile(node.parent))
  );
}

function extractExportedFunctions(sourceFile: ts.SourceFile, checker: ts.TypeChecker, filePath: string): ContractRef[] {
  const contracts: ContractRef[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
      const name = node.name.text;
      const sig = checker.getSignatureFromDeclaration(node);
      const signature = sig ? checker.signatureToString(sig) : '';
      const line = getLineNumber(sourceFile, node);

      contracts.push({
        id: uuidv4(),
        type: 'function_export',
        name,
        provider: '',
        consumers: [],
        compatibility: 'may_evolve',
        signature,
        location: { file: filePath, line },
      });
    }

    if (ts.isVariableDeclaration(node) && isExported(node.parent.parent as ts.Node)) {
      const initializer = node.initializer;
      if (initializer && ts.isArrowFunction(initializer)) {
        const name = ts.isIdentifier(node.name) ? node.name.text : '';
        if (!name) return;
        const sig = checker.getSignatureFromDeclaration(initializer);
        const signature = sig ? checker.signatureToString(sig) : '';
        const line = getLineNumber(sourceFile, node);

        contracts.push({
          id: uuidv4(),
          type: 'function_export',
          name,
          provider: '',
          consumers: [],
          compatibility: 'may_evolve',
          signature,
          location: { file: filePath, line },
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return contracts;
}

function extractExportedInterfacesAndTypes(sourceFile: ts.SourceFile, checker: ts.TypeChecker, filePath: string): ContractRef[] {
  const contracts: ContractRef[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && isExported(node)) {
      const name = node.name.text;
      const symbol = checker.getSymbolAtLocation(node.name);
      const signature = symbol ? buildSignature(checker, node, symbol) : '';
      const line = getLineNumber(sourceFile, node);

      contracts.push({
        id: uuidv4(),
        type: 'type_export',
        name,
        provider: '',
        consumers: [],
        compatibility: 'must_preserve',
        signature,
        location: { file: filePath, line },
      });
    }

    if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
      const name = node.name.text;
      const symbol = checker.getSymbolAtLocation(node.name);
      const signature = symbol ? buildSignature(checker, node, symbol) : '';
      const line = getLineNumber(sourceFile, node);

      contracts.push({
        id: uuidv4(),
        type: 'type_export',
        name,
        provider: '',
        consumers: [],
        compatibility: 'must_preserve',
        signature,
        location: { file: filePath, line },
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return contracts;
}

function extractExportedClasses(sourceFile: ts.SourceFile, checker: ts.TypeChecker, filePath: string): ContractRef[] {
  const contracts: ContractRef[] = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && isExported(node)) {
      const name = node.name?.text || '<anonymous>';
      const symbol = checker.getSymbolAtLocation(node.name || node);
      const signature = symbol ? buildSignature(checker, node, symbol) : '';
      const line = getLineNumber(sourceFile, node);

      contracts.push({
        id: uuidv4(),
        type: 'class_export',
        name,
        provider: '',
        consumers: [],
        compatibility: 'must_preserve',
        signature,
        location: { file: filePath, line },
      });

      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          const isPublic = !(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Private) &&
            !(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Protected);
          if (isPublic) {
            const memberName = member.name.getText(sourceFile);
            const memberSig = checker.getSignatureFromDeclaration(member);
            const memberSignature = memberSig ? checker.signatureToString(memberSig) : '';
            const memberLine = getLineNumber(sourceFile, member);

            contracts.push({
              id: uuidv4(),
              type: 'function_export',
              name: `${name}.${memberName}`,
              provider: '',
              consumers: [],
              compatibility: 'may_evolve',
              signature: memberSignature,
              location: { file: filePath, line: memberLine },
            });
          }
        }

        if (ts.isPropertyDeclaration(member) && member.name) {
          const isPublic = !(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Private) &&
            !(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Protected);
          if (isPublic) {
            const propName = member.name.getText(sourceFile);
            const propType = member.type ? member.type.getText(sourceFile) : checker.typeToString(checker.getTypeAtLocation(member));
            const propLine = getLineNumber(sourceFile, member);

            contracts.push({
              id: uuidv4(),
              type: 'type_export',
              name: `${name}.${propName}`,
              provider: '',
              consumers: [],
              compatibility: 'may_evolve',
              signature: propType ? `${propName}: ${propType}` : '',
              location: { file: filePath, line: propLine },
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return contracts;
}

function extractExportedEnums(sourceFile: ts.SourceFile, checker: ts.TypeChecker, filePath: string): ContractRef[] {
  const contracts: ContractRef[] = [];

  function visit(node: ts.Node) {
    if (ts.isEnumDeclaration(node) && isExported(node)) {
      const name = node.name.text;
      const symbol = checker.getSymbolAtLocation(node.name);
      const signature = symbol ? buildSignature(checker, node, symbol) : '';
      const line = getLineNumber(sourceFile, node);

      contracts.push({
        id: uuidv4(),
        type: 'type_export',
        name,
        provider: '',
        consumers: [],
        compatibility: 'must_preserve',
        signature,
        location: { file: filePath, line },
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return contracts;
}

export function extractWithTypeScript(filePath: string): ContractRef[] {
  if (!fs.existsSync(filePath)) return [];

  const configPath = ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists, 'tsconfig.json');
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
  };

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (!configFile.error) {
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
      compilerOptions = parsed.options;
    }
  }

  const program = ts.createProgram([filePath], compilerOptions);
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  const checker = program.getTypeChecker();
  const contracts: ContractRef[] = [];

  contracts.push(...extractExportedFunctions(sourceFile, checker, filePath));
  contracts.push(...extractExportedInterfacesAndTypes(sourceFile, checker, filePath));
  contracts.push(...extractExportedClasses(sourceFile, checker, filePath));
  contracts.push(...extractExportedEnums(sourceFile, checker, filePath));

  return contracts;
}

export function extractFromFile(filePath: string): ContractRef[] {
  const isTypeScript = /\.(ts|tsx)$/.test(filePath);

  if (isTypeScript) {
    try {
      const contracts = extractWithTypeScript(filePath);
      if (contracts.length > 0) {
        return contracts;
      }
    } catch {}
  }

  return extractFromFileWithRegex(filePath);
}

function extractFromFileWithRegex(filePath: string): ContractRef[] {
  const contracts: ContractRef[] = [];
  if (!fs.existsSync(filePath)) return contracts;

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return contracts;
  }

  const relativePath = filePath;

  for (const pattern of API_ROUTE_PATTERNS) {
    const match = relativePath.match(pattern);
    if (match) {
      contracts.push({
        id: uuidv4(),
        type: 'api_route',
        name: `API: /${match[1]}`,
        provider: '',
        consumers: [],
        compatibility: 'must_preserve',
      });
      break;
    }
  }

  TYPE_EXPORT_PATTERN.lastIndex = 0;
  let typeMatch: RegExpExecArray | null;
  while ((typeMatch = TYPE_EXPORT_PATTERN.exec(content)) !== null) {
    contracts.push({
      id: uuidv4(),
      type: 'type_export',
      name: typeMatch[1],
      provider: '',
      consumers: [],
      compatibility: 'must_preserve',
    });
  }

  const functionPattern = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
  let funcMatch: RegExpExecArray | null;
  while ((funcMatch = functionPattern.exec(content)) !== null) {
    const name = funcMatch[1];
    const params = funcMatch[2];
    const returnType = funcMatch[3]?.trim() || 'void';
    contracts.push({
      id: uuidv4(),
      type: 'function_export',
      name,
      provider: '',
      consumers: [],
      compatibility: 'may_evolve',
      signature: `(${params}): ${returnType}`,
    });
  }

  const classPattern = /export\s+(?:default\s+)?class\s+(\w+)/g;
  let classMatch: RegExpExecArray | null;
  while ((classMatch = classPattern.exec(content)) !== null) {
    contracts.push({
      id: uuidv4(),
      type: 'class_export',
      name: classMatch[1],
      provider: '',
      consumers: [],
      compatibility: 'must_preserve',
    });
  }

  const enumPattern = /export\s+(?:const\s+)?enum\s+(\w+)/g;
  let enumMatch: RegExpExecArray | null;
  while ((enumMatch = enumPattern.exec(content)) !== null) {
    contracts.push({
      id: uuidv4(),
      type: 'type_export',
      name: enumMatch[1],
      provider: '',
      consumers: [],
      compatibility: 'must_preserve',
    });
  }

  for (const pattern of EVENT_HANDLER_PATTERNS) {
    pattern.lastIndex = 0;
    let eventMatch: RegExpExecArray | null;
    while ((eventMatch = pattern.exec(content)) !== null) {
      const eventName = eventMatch[1] || eventMatch[0].replace(/[^a-zA-Z]/g, '');
      if (eventName && !contracts.some((c) => c.name === `Event: ${eventName}`)) {
        contracts.push({
          id: uuidv4(),
          type: 'event_handler',
          name: `Event: ${eventName}`,
          provider: '',
          consumers: [],
          compatibility: 'may_evolve',
        });
      }
    }
  }

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
