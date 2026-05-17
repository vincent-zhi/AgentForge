import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

export interface DebugSession {
  id: string;
  projectPath: string;
  filePath: string;
  status: 'running' | 'paused' | 'stopped';
}

export interface Breakpoint {
  id: string;
  filePath: string;
  line: number;
  column?: number;
  verified: boolean;
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
}

export interface CallFrame {
  id: number;
  name: string;
  filePath: string;
  line: number;
  column: number;
}

interface SessionData {
  session: DebugSession;
  process: ChildProcess;
  inspectorUrl: string | null;
  breakpoints: Breakpoint[];
  debuggerAttached: boolean;
}

export class DebugBridge extends EventEmitter {
  private sessions: Map<string, SessionData> = new Map();
  private breakpointCounter = 0;

  startSession(projectPath: string, filePath: string): DebugSession {
    const id = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: DebugSession = {
      id,
      projectPath,
      filePath,
      status: 'paused',
    };

    const childProcess = spawn('node', ['--inspect-brk=0', filePath], {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let inspectorUrl: string | null = null;

    const stderrData: string[] = [];
    childProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderrData.push(text);
      const match = text.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+/);
      if (match) {
        inspectorUrl = match[0];
        const data2 = this.sessions.get(id);
        if (data2) {
          data2.inspectorUrl = inspectorUrl;
        }
        this.emit('session-ready', session);
      }
    });

    childProcess.stdout?.on('data', (data: Buffer) => {
      this.emit('output', { sessionId: id, data: data.toString() });
    });

    childProcess.on('exit', () => {
      session.status = 'stopped';
      this.emit('session-stopped', session);
      this.sessions.delete(id);
    });

    childProcess.on('error', (err) => {
      session.status = 'stopped';
      this.emit('error', { sessionId: id, error: err.message });
      this.sessions.delete(id);
    });

    this.sessions.set(id, {
      session,
      process: childProcess,
      inspectorUrl,
      breakpoints: [],
      debuggerAttached: false,
    });

    this.emit('session-started', session);
    return session;
  }

  stopSession(sessionId: string): void {
    const data = this.sessions.get(sessionId);
    if (!data) return;
    data.process.kill('SIGTERM');
    data.session.status = 'stopped';
    this.sessions.delete(sessionId);
    this.emit('session-stopped', data.session);
  }

  setBreakpoint(sessionId: string, filePath: string, line: number): Breakpoint {
    const data = this.sessions.get(sessionId);
    if (!data) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const id = `bp-${++this.breakpointCounter}`;
    const breakpoint: Breakpoint = {
      id,
      filePath,
      line,
      verified: data.debuggerAttached,
    };

    data.breakpoints.push(breakpoint);
    this.emit('breakpoint-set', { sessionId, breakpoint });
    return breakpoint;
  }

  continueExecution(sessionId: string): void {
    const data = this.sessions.get(sessionId);
    if (!data) return;
    data.session.status = 'running';
    this.emit('resumed', data.session);
  }

  stepOver(sessionId: string): void {
    const data = this.sessions.get(sessionId);
    if (!data) return;
    this.emit('step-over', { sessionId });
  }

  stepInto(sessionId: string): void {
    const data = this.sessions.get(sessionId);
    if (!data) return;
    this.emit('step-into', { sessionId });
  }

  stepOut(sessionId: string): void {
    const data = this.sessions.get(sessionId);
    if (!data) return;
    this.emit('step-out', { sessionId });
  }

  getVariables(sessionId: string, _frameId?: number): DebugVariable[] {
    const data = this.sessions.get(sessionId);
    if (!data) return [];
    return [
      { name: 'this', value: 'undefined', type: 'undefined' },
    ];
  }

  getCallStack(sessionId: string): CallFrame[] {
    const data = this.sessions.get(sessionId);
    if (!data) return [];
    return [
      { id: 0, name: '<top>', filePath: data.session.filePath, line: 1, column: 1 },
    ];
  }

  getBreakpoints(sessionId: string): Breakpoint[] {
    const data = this.sessions.get(sessionId);
    if (!data) return [];
    return [...data.breakpoints];
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }
}
