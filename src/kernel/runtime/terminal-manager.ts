import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

interface TerminalInstance {
  id: string;
  process: ChildProcess;
  onDataCallbacks: Array<(data: string) => void>;
}

export class TerminalManager {
  private terminals: Map<string, TerminalInstance> = new Map();

  createTerminal(cwd?: string): { id: string; write: (data: string) => void; onData: (callback: (data: string) => void) => void; kill: () => void } {
    const id = uuidv4();
    const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/bash';
    const args = process.platform === 'win32' ? [] : ['-i'];

    const childProcess = spawn(shell, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const instance: TerminalInstance = {
      id,
      process: childProcess,
      onDataCallbacks: [],
    };

    this.terminals.set(id, instance);

    childProcess.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      for (const cb of instance.onDataCallbacks) {
        cb(str);
      }
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      for (const cb of instance.onDataCallbacks) {
        cb(str);
      }
    });

    childProcess.on('exit', () => {
      this.terminals.delete(id);
    });

    return {
      id,
      write: (data: string) => {
        childProcess.stdin?.write(data);
      },
      onData: (callback: (data: string) => void) => {
        instance.onDataCallbacks.push(callback);
      },
      kill: () => {
        this.killTerminal(id);
      },
    };
  }

  async executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/bash';
      const args = process.platform === 'win32' ? ['/c', command] : ['-c', command];

      const childProcess = spawn(shell, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      childProcess.on('error', (err) => {
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  }

  killTerminal(id: string): void {
    const instance = this.terminals.get(id);
    if (instance) {
      instance.process.kill();
      this.terminals.delete(id);
    }
  }

  listTerminals(): string[] {
    return Array.from(this.terminals.keys());
  }
}
