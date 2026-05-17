import fs from 'fs';
import path from 'path';
import type { ModuleInfo, TestCommand } from '@/types/core';

const TEST_FILE_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
];

function isTestFile(fileName: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(fileName));
}

function isTestDir(dirName: string): boolean {
  return dirName === '__tests__' || dirName === 'test' || dirName === 'tests';
}

function findTestFiles(dir: string, rootPath: string, results: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    if (entry.isDirectory()) {
      if (isTestDir(entry.name)) {
        const testEntries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const te of testEntries) {
          if (te.isFile() && /\.(ts|tsx|js|jsx)$/.test(te.name)) {
            results.push(path.relative(rootPath, path.join(fullPath, te.name)));
          }
        }
      } else {
        findTestFiles(fullPath, rootPath, results);
      }
    } else if (entry.isFile() && isTestFile(entry.name)) {
      results.push(relativePath);
    }
  }
}

interface TestFrameworkConfig {
  framework: 'jest' | 'vitest' | 'mocha' | 'unknown';
  configPath?: string;
  testPatterns: string[];
}

function detectJestConfig(rootPath: string): TestFrameworkConfig | null {
  const jestConfigFiles = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.cjs'];
  for (const file of jestConfigFiles) {
    if (fs.existsSync(path.join(rootPath, file))) {
      const patterns = extractJestPatterns(path.join(rootPath, file));
      return { framework: 'jest', configPath: file, testPatterns: patterns };
    }
  }

  const pkgJsonPath = path.join(rootPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.jest) {
        const patterns = extractJestPatternsFromObj(pkg.jest);
        return { framework: 'jest', configPath: 'package.json', testPatterns: patterns };
      }
    } catch {}
  }

  return null;
}

function extractJestPatterns(configPath: string): string[] {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/testMatch\s*:\s*\[([^\]]+)\]/);
    if (match) {
      return match[1]
        .split(',')
        .map((s: string) => s.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);
    }
    const patternMatch = content.match(/testRegex\s*:\s*['"`]([^'"`]+)['"`]/);
    if (patternMatch) {
      return [patternMatch[1]];
    }
  } catch {}
  return [];
}

function extractJestPatternsFromObj(jestConfig: Record<string, unknown>): string[] {
  if (Array.isArray(jestConfig.testMatch)) {
    return jestConfig.testMatch.filter((p): p is string => typeof p === 'string');
  }
  if (typeof jestConfig.testRegex === 'string') {
    return [jestConfig.testRegex];
  }
  return [];
}

function detectVitestConfig(rootPath: string): TestFrameworkConfig | null {
  const vitestConfigFiles = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs'];
  for (const file of vitestConfigFiles) {
    if (fs.existsSync(path.join(rootPath, file))) {
      const patterns = extractVitestPatterns(path.join(rootPath, file));
      return { framework: 'vitest', configPath: file, testPatterns: patterns };
    }
  }

  const viteConfigFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
  for (const file of viteConfigFiles) {
    const fullPath = path.join(rootPath, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('vitest') || content.includes('from \'vitest\'') || content.includes('from "vitest"')) {
          const patterns = extractVitestPatterns(fullPath);
          return { framework: 'vitest', configPath: file, testPatterns: patterns };
        }
      } catch {}
    }
  }

  return null;
}

function extractVitestPatterns(configPath: string): string[] {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/include\s*:\s*\[([^\]]+)\]/);
    if (match) {
      return match[1]
        .split(',')
        .map((s: string) => s.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);
    }
  } catch {}
  return [];
}

function detectMochaConfig(rootPath: string): TestFrameworkConfig | null {
  const mochaConfigFiles = ['.mocharc.yml', '.mocharc.yaml', '.mocharc.json', '.mocharc.js'];
  for (const file of mochaConfigFiles) {
    if (fs.existsSync(path.join(rootPath, file))) {
      const patterns = extractMochaPatterns(rootPath, file);
      return { framework: 'mocha', configPath: file, testPatterns: patterns };
    }
  }
  return null;
}

function extractMochaPatterns(rootPath: string, configFile: string): string[] {
  const fullPath = path.join(rootPath, configFile);
  try {
    if (configFile.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      if (Array.isArray(content.spec)) return content.spec.filter((s: unknown) => typeof s === 'string');
      if (typeof content.spec === 'string') return [content.spec];
    }
    if (configFile.endsWith('.yml') || configFile.endsWith('.yaml')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const specMatch = content.match(/spec:\s*\n((?:\s*-\s*.+\n?)+)/);
      if (specMatch) {
        return specMatch[1]
          .split('\n')
          .map((line: string) => line.replace(/^\s*-\s*['"]?/, '').replace(/['"]?\s*$/, ''))
          .filter(Boolean);
      }
    }
  } catch {}
  return [];
}

function detectTestFramework(rootPath: string): TestFrameworkConfig {
  const vitest = detectVitestConfig(rootPath);
  if (vitest) return vitest;

  const jest = detectJestConfig(rootPath);
  if (jest) return jest;

  const mocha = detectMochaConfig(rootPath);
  if (mocha) return mocha;

  return { framework: 'unknown', testPatterns: [] };
}

function extractTestCommandsFromPackageJson(rootPath: string): Array<{ command: string; cwd?: string }> {
  const pkgJsonPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const scripts = pkg.scripts || {};
    const commands: Array<{ command: string; cwd?: string }> = [];
    for (const [name, cmd] of Object.entries(scripts)) {
      if (name.includes('test') || (typeof cmd === 'string' && cmd.includes('test'))) {
        commands.push({ command: `npm run ${name}` });
      }
    }
    return commands;
  } catch {
    return [];
  }
}

function extractMonorepoTestCommands(rootPath: string, modules: ModuleInfo[]): TestCommand[] {
  const commands: TestCommand[] = [];
  for (const mod of modules) {
    if (mod.path === '.') continue;
    const modulePath = path.join(rootPath, mod.path);
    const pkgJsonPath = path.join(modulePath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const scripts = pkg.scripts || {};
      for (const [name, cmd] of Object.entries(scripts)) {
        if (name.includes('test') || (typeof cmd === 'string' && cmd.includes('test'))) {
          commands.push({
            command: `npm run ${name}`,
            cwd: modulePath,
            module: mod.name,
          });
        }
      }
    } catch {}
  }
  return commands;
}

function mapTestFileToModule(testFilePath: string, modules: ModuleInfo[]): string {
  for (const mod of modules) {
    if (testFilePath.startsWith(mod.path + path.sep) || testFilePath.startsWith(mod.path + '/')) {
      return mod.name;
    }
  }
  const parts = testFilePath.split(path.sep);
  if (parts.length > 0) return parts[0];
  return 'root';
}

function getRunnerForFramework(framework: TestFrameworkConfig['framework'], ext: string): string {
  switch (framework) {
    case 'vitest': return 'npx vitest';
    case 'mocha': return 'npx mocha';
    case 'jest': return 'npx jest';
    default: return ext === '.ts' || ext === '.tsx' ? 'npx jest' : 'npx jest';
  }
}

export function mapTests(rootPath: string, modules: ModuleInfo[]): TestCommand[] {
  const testCommands: TestCommand[] = [];
  const testFiles: string[] = [];
  const frameworkConfig = detectTestFramework(rootPath);

  if (fs.existsSync(rootPath)) {
    findTestFiles(rootPath, rootPath, testFiles);
  }

  const pkgTestCommands = extractTestCommandsFromPackageJson(rootPath);

  for (const testFile of testFiles) {
    const moduleName = mapTestFileToModule(testFile, modules);
    const ext = path.extname(testFile);
    const runner = getRunnerForFramework(frameworkConfig.framework, ext);
    testCommands.push({
      command: `${runner} ${testFile}`,
      cwd: rootPath,
      module: moduleName,
    });
  }

  for (const pkgCmd of pkgTestCommands) {
    const moduleName = modules.length > 0 ? modules[0].name : 'root';
    const exists = testCommands.some((tc) => tc.command === pkgCmd.command);
    if (!exists) {
      testCommands.push({
        command: pkgCmd.command,
        cwd: pkgCmd.cwd || rootPath,
        module: moduleName,
      });
    }
  }

  for (const mod of modules) {
    if (mod.testCommand) {
      const exists = testCommands.some((tc) => tc.command === mod.testCommand && tc.module === mod.name);
      if (!exists) {
        testCommands.push({
          command: mod.testCommand,
          cwd: path.join(rootPath, mod.path),
          module: mod.name,
        });
      }
    }
  }

  if (modules.length > 1) {
    const monorepoCommands = extractMonorepoTestCommands(rootPath, modules);
    for (const cmd of monorepoCommands) {
      const exists = testCommands.some((tc) => tc.command === cmd.command && tc.module === cmd.module);
      if (!exists) {
        testCommands.push(cmd);
      }
    }
  }

  return testCommands;
}

export { detectTestFramework, type TestFrameworkConfig };
