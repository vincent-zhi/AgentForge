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

export function mapTests(rootPath: string, modules: ModuleInfo[]): TestCommand[] {
  const testCommands: TestCommand[] = [];
  const testFiles: string[] = [];

  if (fs.existsSync(rootPath)) {
    findTestFiles(rootPath, rootPath, testFiles);
  }

  const pkgTestCommands = extractTestCommandsFromPackageJson(rootPath);

  for (const testFile of testFiles) {
    const moduleName = mapTestFileToModule(testFile, modules);
    const ext = path.extname(testFile);
    const runner = ext === '.ts' || ext === '.tsx' ? 'npx jest' : 'npx jest';
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

  return testCommands;
}
