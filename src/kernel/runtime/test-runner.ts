import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { TestCommand } from '@/types/core';

interface TestResult {
  passed: boolean;
  output: string;
  duration: number;
}

interface AllTestResult {
  command: TestCommand;
  passed: boolean;
  output: string;
}

const PASS_INDICATORS = ['passed', 'passing', 'tests passed', 'all tests passed', '0 failures', '0 failed', '✓', '✔'];
const FAIL_INDICATORS = ['failed', 'failing', 'test(s) failed', 'failures:', 'failed:', '✗', '✘', 'error:', 'ERR!'];

export class TestRunner {
  discoverTestCommands(projectPath: string): TestCommand[] {
    const commands: TestCommand[] = [];
    const pkgJsonPath = path.join(projectPath, 'package.json');

    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const scripts = pkg.scripts || {};
        for (const [name, cmd] of Object.entries(scripts)) {
          if (typeof cmd === 'string' && (name.includes('test') || cmd.includes('test'))) {
            const pm = fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
            commands.push({
              command: `${pm} run ${name}`,
              cwd: projectPath,
              module: 'root',
            });
          }
        }
      } catch {}
    }

    return commands;
  }

  async runTest(command: TestCommand): Promise<TestResult> {
    const start = Date.now();

    return new Promise((resolve) => {
      exec(command.command, {
        cwd: command.cwd || process.cwd(),
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      }, (error, stdout, stderr) => {
        const duration = Date.now() - start;
        const output = stdout + stderr;

        let passed = false;
        if (error) {
          passed = false;
        } else {
          const lowerOutput = output.toLowerCase();
          const hasPass = PASS_INDICATORS.some((ind) => lowerOutput.includes(ind));
          const hasFail = FAIL_INDICATORS.some((ind) => lowerOutput.includes(ind));
          passed = hasPass && !hasFail;
        }

        resolve({ passed, output, duration });
      });
    });
  }

  async runAllTests(projectPath: string): Promise<AllTestResult[]> {
    const commands = this.discoverTestCommands(projectPath);
    const results: AllTestResult[] = [];

    for (const command of commands) {
      const result = await this.runTest(command);
      results.push({
        command,
        passed: result.passed,
        output: result.output,
      });
    }

    return results;
  }
}
