import { create } from 'zustand';
import { bridge } from '@/ipc/bridge';
import type { DebugSession, Breakpoint, DebugVariable, CallFrame } from '@/kernel/debug/debug-bridge';

interface DebugState {
  session: DebugSession | null;
  breakpoints: Breakpoint[];
  variables: DebugVariable[];
  callStack: CallFrame[];
  isPaused: boolean;
  startSession: (projectPath: string, filePath: string) => Promise<void>;
  stopSession: () => Promise<void>;
  setBreakpoint: (filePath: string, line: number) => Promise<void>;
  removeBreakpoint: (breakpointId: string) => void;
  toggleBreakpoint: (filePath: string, line: number) => void;
  continueExecution: () => Promise<void>;
  stepOver: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  updateVariables: (variables: DebugVariable[]) => void;
  updateCallStack: (callStack: CallFrame[]) => void;
  setPaused: (paused: boolean) => void;
}

export const useDebugStore = create<DebugState>((set, get) => ({
  session: null,
  breakpoints: [],
  variables: [],
  callStack: [],
  isPaused: false,

  startSession: async (projectPath: string, filePath: string) => {
    try {
      const result = await bridge.debug.start(projectPath, filePath) as DebugSession | { error: string };
      if (result && 'error' in result) return;
      const session = result as DebugSession;
      set({ session, isPaused: true, breakpoints: [], variables: [], callStack: [] });
    } catch {}
  },

  stopSession: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await bridge.debug.stop(session.id);
    } catch {}
    set({ session: null, isPaused: false, breakpoints: [], variables: [], callStack: [] });
  },

  setBreakpoint: async (filePath: string, line: number) => {
    const { session, breakpoints } = get();
    if (!session) return;
    try {
      const bp = await bridge.debug.setBreakpoint(session.id, filePath, line) as Breakpoint | { error: string };
      if (bp && 'error' in bp) return;
      set({ breakpoints: [...breakpoints, bp as Breakpoint] });
    } catch {}
  },

  removeBreakpoint: (breakpointId: string) => {
    set((state) => ({
      breakpoints: state.breakpoints.filter((bp) => bp.id !== breakpointId),
    }));
  },

  toggleBreakpoint: (filePath: string, line: number) => {
    const { breakpoints, session } = get();
    const existing = breakpoints.find((bp) => bp.filePath === filePath && bp.line === line);
    if (existing) {
      set({ breakpoints: breakpoints.filter((bp) => bp.id !== existing.id) });
    } else if (session) {
      get().setBreakpoint(filePath, line);
    }
  },

  continueExecution: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await bridge.debug.continue(session.id);
      set({ isPaused: false });
    } catch {}
  },

  stepOver: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await bridge.debug.stepOver(session.id);
    } catch {}
  },

  stepInto: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await bridge.debug.stepInto(session.id);
    } catch {}
  },

  stepOut: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await bridge.debug.stepOut(session.id);
    } catch {}
  },

  updateVariables: (variables: DebugVariable[]) => {
    set({ variables });
  },

  updateCallStack: (callStack: CallFrame[]) => {
    set({ callStack });
  },

  setPaused: (paused: boolean) => {
    set({ isPaused: paused });
  },
}));
