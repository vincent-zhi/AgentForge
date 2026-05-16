declare module 'node:fs/promises' {
  export function readdir(path: string, options?: { withFileTypes?: false }): Promise<string[]>;
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>>;
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
  export function writeFile(path: string, data: string, encoding?: 'utf8'): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
}

declare module 'node:path' {
  export const sep: string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function dirname(path: string): string;
  export function resolve(...paths: string[]): string;
}

declare module 'node:child_process' {
  type Handler<T = unknown> = (value: T) => void;
  interface StreamLike { on(event: 'data', handler: Handler<BufferLike>): void }
  interface BufferLike { toString(): string }
  interface ChildProcessLike {
    stdout: StreamLike;
    stderr: StreamLike;
    on(event: 'close', handler: Handler<number | null>): void;
    kill(signal?: string): void;
  }
  export function spawn(command: string, options?: { cwd?: string; shell?: boolean; stdio?: string[] }): ChildProcessLike;
}

declare const process: {
  cwd(): string;
  argv: string[];
  env: Record<string, string | undefined>;
};

declare module 'node:os' {
  export function tmpdir(): string;
}
