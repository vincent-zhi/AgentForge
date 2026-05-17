import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface SandboxConfig {
  image?: string;
  devcontainerPath?: string;
  workDir?: string;
  env?: Record<string, string>;
}

export interface SandboxStatus {
  id: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  containerId?: string;
  createdAt: number;
}

export interface SandboxExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  command?: string;
  sandboxId?: string;
}

export interface SandboxExecEvent {
  sandboxId: string;
  command: string;
  result: SandboxExecResult;
}

export class SandboxRunner extends EventEmitter {
  private sandboxes: Map<string, SandboxStatus> = new Map();

  async createSandbox(projectPath: string, config?: SandboxConfig): Promise<SandboxStatus> {
    const id = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const status: SandboxStatus = {
      id,
      status: 'creating',
      createdAt: Date.now(),
    };
    this.sandboxes.set(id, status);

    try {
      let resolvedConfig = config || {};
      if (resolvedConfig.devcontainerPath) {
        const devcontainerConfig = await this.parseDevContainer(projectPath);
        if (devcontainerConfig) {
          resolvedConfig = { ...devcontainerConfig, ...resolvedConfig };
        }
      }

      const image = resolvedConfig.image || 'node:18-alpine';
      const workDir = resolvedConfig.workDir || '/workspace';
      const envArgs = resolvedConfig.env
        ? Object.entries(resolvedConfig.env).map(([k, v]) => `-e ${k}=${v}`).join(' ')
        : '';

      const volumeMount = `-v "${projectPath}:${workDir}"`;
      const dockerCmd = `docker run -d --name ${id} ${volumeMount} ${envArgs} -w "${workDir}" ${image} tail -f /dev/null`;

      const containerId = execSync(dockerCmd, { encoding: 'utf-8' }).trim();

      status.status = 'running';
      status.containerId = containerId;
      this.sandboxes.set(id, status);

      return status;
    } catch (error) {
      status.status = 'error';
      this.sandboxes.set(id, status);
      throw error;
    }
  }

  async executeInSandbox(sandboxId: string, command: string, cwd?: string): Promise<SandboxExecResult> {
    const status = this.sandboxes.get(sandboxId);
    if (!status) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }
    if (status.status !== 'running' || !status.containerId) {
      throw new Error(`Sandbox is not running: ${sandboxId}`);
    }

    const cwdArg = cwd ? ` -w "${cwd}"` : '';
    const dockerCmd = `docker exec${cwdArg} ${status.containerId} sh -c ${JSON.stringify(command)}`;

    const start = Date.now();
    try {
      const stdout = execSync(dockerCmd, { encoding: 'utf-8', timeout: 60000 });
      const duration = Date.now() - start;
      const result: SandboxExecResult = { exitCode: 0, stdout, stderr: '', duration, command, sandboxId };
      this.emit('executed', { sandboxId, command, result } as SandboxExecEvent);
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      const result: SandboxExecResult = {
        exitCode: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? error.message ?? '',
        duration,
        command,
        sandboxId,
      };
      this.emit('executed', { sandboxId, command, result } as SandboxExecEvent);
      return result;
    }
  }

  async stopSandbox(sandboxId: string): Promise<void> {
    const status = this.sandboxes.get(sandboxId);
    if (!status) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    try {
      if (status.containerId) {
        try {
          execSync(`docker stop ${status.containerId}`, { encoding: 'utf-8', timeout: 30000 });
        } catch {}
        try {
          execSync(`docker rm ${status.containerId}`, { encoding: 'utf-8', timeout: 30000 });
        } catch {}
      }
      status.status = 'stopped';
      this.sandboxes.set(sandboxId, status);
    } catch (error) {
      status.status = 'error';
      this.sandboxes.set(sandboxId, status);
      throw error;
    }
  }

  getSandboxStatus(sandboxId: string): SandboxStatus {
    const status = this.sandboxes.get(sandboxId);
    if (!status) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }
    return status;
  }

  async parseDevContainer(projectPath: string): Promise<SandboxConfig | null> {
    const devcontainerPath = path.join(projectPath, '.devcontainer', 'devcontainer.json');
    if (!fs.existsSync(devcontainerPath)) {
      return null;
    }

    try {
      let content = fs.readFileSync(devcontainerPath, 'utf-8');
      content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const config = JSON.parse(content);

      const result: SandboxConfig = {};
      if (config.image) {
        result.image = config.image;
      } else if (config.build?.dockerfile || config.dockerFile) {
        result.image = 'node:18-alpine';
      }
      if (config.workspaceFolder) {
        result.workDir = config.workspaceFolder;
      }
      if (config.containerEnv) {
        result.env = config.containerEnv;
      }
      return result;
    } catch {
      return null;
    }
  }
}
