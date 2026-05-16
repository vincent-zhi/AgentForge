import { IPC_CHANNELS, IpcChannel } from './channels';

type DeepValues<T> = {
  [K in keyof T]: T[K] extends object ? DeepValues<T[K]> : T[K];
};

const channels = IPC_CHANNELS as unknown as DeepValues<IpcChannel>;

function invoke(channel: string, args: Record<string, unknown>): Promise<unknown> {
  if (typeof window !== 'undefined' && window.agentForge) {
    return window.agentForge.invoke(channel, args);
  }
  return Promise.reject(new Error('AgentForge IPC bridge not available'));
}

export const bridge = {
  project: {
    open: (path: string) => invoke(channels.PROJECT.OPEN, { path }),
    scan: (projectPath: string) => invoke(channels.PROJECT.SCAN, { projectPath }),
    getFacts: (filters?: { module?: string; type?: string; confidence?: string }) => invoke(channels.PROJECT.GET_FACTS, { filters }),
    searchFacts: (query: string) => invoke(channels.PROJECT.SEARCH_FACTS, { query }),
    getModules: (projectPath: string) => invoke(channels.PROJECT.GET_MODULES, { projectPath }),
    getDependencyGraph: (projectPath: string) => invoke(channels.PROJECT.GET_DEPENDENCY_GRAPH, { projectPath }),
  },
  impact: {
    analyze: (taskId: string, targetFiles: string[]) => invoke(channels.IMPACT.ANALYZE, { taskId, targetFiles }),
    getMap: (taskId: string) => invoke(channels.IMPACT.GET_MAP, { taskId }),
    comparePlannedVsActual: (taskId: string) => invoke(channels.IMPACT.COMPARE_PLANNED_VS_ACTUAL, { taskId }),
  },
  task: {
    create: (goal: string) => invoke(channels.TASK.CREATE, { goal }),
    getCapsule: (taskId: string) => invoke(channels.TASK.GET_CAPSULE, { taskId }),
    updateStatus: (taskId: string, status: string) => invoke(channels.TASK.UPDATE_STATUS, { taskId, status }),
    list: () => invoke(channels.TASK.LIST, {}),
  },
  agent: {
    start: (taskId: string) => invoke(channels.AGENT.START, { taskId }),
    stop: (taskId: string) => invoke(channels.AGENT.STOP, { taskId }),
    getStatus: (taskId: string) => invoke(channels.AGENT.GET_STATUS, { taskId }),
    getTimeline: (taskId: string) => invoke(channels.AGENT.GET_TIMELINE, { taskId }),
    getLeases: (taskId: string) => invoke(channels.AGENT.GET_LEASES, { taskId }),
  },
  evidence: {
    getStack: (taskId: string) => invoke(channels.EVIDENCE.GET_STACK, { taskId }),
    getTestResults: (taskId: string) => invoke(channels.EVIDENCE.GET_TEST_RESULTS, { taskId }),
  },
  review: {
    generatePacket: (taskId: string) => invoke(channels.REVIEW.GENERATE_PACKET, { taskId }),
    safeApplyCheck: (taskId: string) => invoke(channels.REVIEW.SAFE_APPLY_CHECK, { taskId }),
    apply: (taskId: string) => invoke(channels.REVIEW.APPLY, { taskId }),
  },
  git: {
    status: (projectPath: string) => invoke(channels.GIT.STATUS, { projectPath }),
    diff: (projectPath: string) => invoke(channels.GIT.DIFF, { projectPath }),
    commit: (projectPath: string, message: string) => invoke(channels.GIT.COMMIT, { projectPath, message }),
  },
  runtime: {
    executeCommand: (command: string, cwd?: string) => invoke(channels.RUNTIME.EXECUTE_COMMAND, { command, cwd }),
    runTests: (testCommand: string, cwd?: string) => invoke(channels.RUNTIME.RUN_TESTS, { testCommand, cwd }),
  },
};

export type Bridge = typeof bridge;
