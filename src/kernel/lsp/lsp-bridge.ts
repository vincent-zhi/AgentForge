import { execFile } from 'child_process';
import * as path from 'path';

export interface CompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
}

export interface Diagnostic {
  file: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  message: string;
  category: string;
  code: number;
}

export interface DefinitionLocation {
  file: string;
  line: number;
  char: number;
}

export interface ReferenceLocation {
  file: string;
  line: number;
  char: number;
  lineText: string;
}

export interface HoverInfo {
  displayString: string;
  documentation?: string;
}

export class LspBridge {
  private projectRoot: string | null = null;

  async initialize(projectRoot: string): Promise<void> {
    this.projectRoot = projectRoot;
    path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsserver');
  }

  async getCompletions(_filePath: string, _line: number, _char: number): Promise<CompletionItem[]> {
    return [];
  }

  async getDiagnostics(_filePath: string): Promise<Diagnostic[]> {
    if (!this.projectRoot) return [];
    const projectRoot = this.projectRoot;
    return new Promise((resolve) => {
      const tscPath = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
      execFile(tscPath, ['--noEmit', '--pretty', 'false'], {
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024,
      }, (_error, stdout: string) => {
        if (!stdout) { resolve([]); return; }
        const diagnostics: Diagnostic[] = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/^(.+)\((\d+),(\d+)\):\s(error|warning)\s(TS\d+):\s(.+)$/);
          if (match) {
            diagnostics.push({
              file: match[1],
              startLine: parseInt(match[2]),
              startChar: parseInt(match[3]),
              endLine: parseInt(match[2]),
              endChar: parseInt(match[3]),
              message: match[6],
              category: match[4],
              code: parseInt(match[5].replace('TS', '')),
            });
          }
        }
        resolve(diagnostics);
      });
    });
  }

  async getDefinition(_filePath: string, _line: number, _char: number): Promise<DefinitionLocation | null> {
    return null;
  }

  async getReferences(_filePath: string, _line: number, _char: number): Promise<ReferenceLocation[]> {
    return [];
  }

  async getHover(_filePath: string, _line: number, _char: number): Promise<HoverInfo | null> {
    return null;
  }

  dispose(): void {
    this.projectRoot = null;
  }
}
