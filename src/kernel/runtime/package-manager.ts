import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun';

export class PackageManagerAdapter {
  detectPackageManager(projectPath: string): PackageManagerType {
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) return 'bun';
    if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
    return 'npm';
  }

  async install(projectPath: string): Promise<{ success: boolean; output: string }> {
    const pm = this.detectPackageManager(projectPath);
    const command = this.getInstallCommand(pm);
    try {
      const output = execSync(command, { cwd: projectPath, encoding: 'utf-8', timeout: 120000 });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.message || 'Install failed' };
    }
  }

  async runScript(projectPath: string, script: string): Promise<{ success: boolean; output: string }> {
    const pm = this.detectPackageManager(projectPath);
    const command = this.getRunCommand(pm, script);
    try {
      const output = execSync(command, { cwd: projectPath, encoding: 'utf-8', timeout: 120000 });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.message || 'Script failed' };
    }
  }

  getInstallCommand(pm: PackageManagerType): string {
    switch (pm) {
      case 'pnpm': return 'pnpm install';
      case 'yarn': return 'yarn';
      case 'bun': return 'bun install';
      case 'npm': return 'npm install';
    }
  }

  getRunCommand(pm: PackageManagerType, script: string): string {
    switch (pm) {
      case 'pnpm': return `pnpm run ${script}`;
      case 'yarn': return `yarn ${script}`;
      case 'bun': return `bun run ${script}`;
      case 'npm': return `npm run ${script}`;
    }
  }
}
