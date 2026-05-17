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
    open: (path?: string) => invoke(channels.PROJECT.OPEN, { path }),
    scan: (projectPath: string) => invoke(channels.PROJECT.SCAN, { projectPath }),
    getFacts: (filters?: { module?: string; type?: string; confidence?: string }) => invoke(channels.PROJECT.GET_FACTS, { filters }),
    searchFacts: (query: string) => invoke(channels.PROJECT.SEARCH_FACTS, { query }),
    getModules: (projectPath: string) => invoke(channels.PROJECT.GET_MODULES, { projectPath }),
    getDependencyGraph: (projectPath: string) => invoke(channels.PROJECT.GET_DEPENDENCY_GRAPH, { projectPath }),
    getFileTree: (projectPath: string) => invoke(channels.PROJECT.GET_FILE_TREE, { projectPath }),
    updateFactStatus: (factId: string, status: string) => invoke(channels.PROJECT.UPDATE_FACT_STATUS, { factId, status }),
    refreshFact: (factId: string) => invoke(channels.PROJECT.REFRESH_FACT, { factId }),
    switchProject: (projectPath: string) => invoke(channels.PROJECT.SWITCH, { projectPath }),
    getRecentProjects: () => invoke(channels.PROJECT.GET_RECENT, {}),
    saveRecentProjects: (projects: string) => invoke(channels.PROJECT.SAVE_RECENT, { projects }),
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
    listWorktrees: (projectPath: string) => invoke(channels.GIT.LIST_WORKTREES, { projectPath }),
    createWorktree: (projectPath: string, branchName: string, worktreePath: string) => invoke(channels.GIT.CREATE_WORKTREE, { projectPath, branchName, worktreePath }),
    removeWorktree: (projectPath: string, worktreePath: string) => invoke(channels.GIT.REMOVE_WORKTREE, { projectPath, worktreePath }),
  },
  file: {
    read: (filePath: string) => invoke(channels.FILE.READ, { filePath }) as Promise<string>,
    write: (filePath: string, content: string) => invoke(channels.FILE.WRITE, { filePath, content }),
  },
  settings: {
    get: (key: string) => invoke(channels.SETTINGS.GET, { key }) as Promise<string | null>,
    set: (key: string, value: string) => invoke(channels.SETTINGS.SET, { key, value }),
    getAll: () => invoke(channels.SETTINGS.GET_ALL, {}) as Promise<Record<string, string>>,
    delete: (key: string) => invoke(channels.SETTINGS.DELETE, { key }),
  },
  runtime: {
    executeCommand: (command: string, cwd?: string) => invoke(channels.RUNTIME.EXECUTE_COMMAND, { command, cwd }),
    runTests: (testCommand: string, cwd?: string) => invoke(channels.RUNTIME.RUN_TESTS, { testCommand, cwd }),
  },
  lsp: {
    initialize: (projectPath: string) => invoke(channels.LSP.INITIALIZE, { projectPath }),
    completions: (filePath: string, line: number, char: number) => invoke(channels.LSP.COMPLETIONS, { filePath, line, char }),
    diagnostics: (filePath: string) => invoke(channels.LSP.DIAGNOSTICS, { filePath }),
    definition: (filePath: string, line: number, char: number) => invoke(channels.LSP.DEFINITION, { filePath, line, char }),
    references: (filePath: string, line: number, char: number) => invoke(channels.LSP.REFERENCES, { filePath, line, char }),
    hover: (filePath: string, line: number, char: number) => invoke(channels.LSP.HOVER, { filePath, line, char }),
    symbols: (filePath: string) => invoke(channels.LSP.SYMBOLS, { filePath }),
    workspaceSymbols: (projectPath: string, query: string) => invoke(channels.LSP.WORKSPACE_SYMBOLS, { projectPath, query }),
  },
  workflow: {
    start: (goal: string) => invoke(channels.WORKFLOW.START, { goal }),
    confirm: (taskId: string) => invoke(channels.WORKFLOW.CONFIRM, { taskId }),
    complete: (taskId: string, action: 'apply' | 'discard') => invoke(channels.WORKFLOW.COMPLETE, { taskId, action }),
    getStatus: () => invoke(channels.WORKFLOW.GET_STATUS, {}),
    mergeWorktree: (projectPath: string, taskId: string) => invoke(channels.WORKFLOW.MERGE_WORKTREE, { projectPath, taskId }),
    discardWorktree: (projectPath: string, taskId: string) => invoke(channels.WORKFLOW.DISCARD_WORKTREE, { projectPath, taskId }),
    classify: (goal: string) => invoke(channels.WORKFLOW.CLASSIFY, { goal }),
  },
  search: {
    search: (query: string, options: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean; fileFilter?: string; projectPath: string }) => invoke(channels.SEARCH.SEARCH, { query, options }),
    replaceInFile: (filePath: string, search: string, replace: string, regex?: boolean) => invoke(channels.SEARCH.REPLACE_IN_FILE, { filePath, search, replace, regex }),
  },
  package: {
    detect: (projectPath: string) => invoke(channels.PACKAGE.DETECT, { projectPath }),
    install: (projectPath: string) => invoke(channels.PACKAGE.INSTALL, { projectPath }),
    runScript: (projectPath: string, script: string) => invoke(channels.PACKAGE.RUN_SCRIPT, { projectPath, script }),
  },
  ci: {
    detect: (projectPath: string) => invoke(channels.CI.DETECT, { projectPath }),
    getWorkflows: (projectPath: string) => invoke(channels.CI.GET_WORKFLOWS, { projectPath }),
  },
  delivery: {
    generateCommit: (taskId: string) => invoke(channels.DELIVERY.GENERATE_COMMIT, { taskId }),
    generatePr: (taskId: string) => invoke(channels.DELIVERY.GENERATE_PR, { taskId }),
    createPr: (projectPath: string, branchName: string, prInfo: { title: string; body: string; labels: string[]; reviewers: string[] }) => invoke(channels.DELIVERY.CREATE_PR, { projectPath, branchName, prInfo }),
  },
  debug: {
    start: (projectPath: string, filePath: string) => invoke(channels.DEBUG.START, { projectPath, filePath }),
    stop: (sessionId: string) => invoke(channels.DEBUG.STOP, { sessionId }),
    setBreakpoint: (sessionId: string, filePath: string, line: number) => invoke(channels.DEBUG.SET_BREAKPOINT, { sessionId, filePath, line }),
    continue: (sessionId: string) => invoke(channels.DEBUG.CONTINUE, { sessionId }),
    stepOver: (sessionId: string) => invoke(channels.DEBUG.STEP_OVER, { sessionId }),
    stepInto: (sessionId: string) => invoke(channels.DEBUG.STEP_INTO, { sessionId }),
    stepOut: (sessionId: string) => invoke(channels.DEBUG.STEP_OUT, { sessionId }),
    getVariables: (sessionId: string, frameId?: number) => invoke(channels.DEBUG.GET_VARIABLES, { sessionId, frameId }),
    getCallStack: (sessionId: string) => invoke(channels.DEBUG.GET_CALL_STACK, { sessionId }),
    getBreakpoints: (sessionId: string) => invoke(channels.DEBUG.GET_BREAKPOINTS, { sessionId }),
  },
  memory: {
    generateProposals: (taskId: string) => invoke(channels.MEMORY.GENERATE_PROPOSALS, { taskId }),
    applyProposal: (proposal: any) => invoke(channels.MEMORY.APPLY_PROPOSAL, { proposal }),
    rejectProposal: (proposalId: string) => invoke(channels.MEMORY.REJECT_PROPOSAL, { proposalId }),
  },
  brain: {
    revertTaskUpdates: (taskId: string) => invoke(channels.BRAIN.REVERT_TASK, { taskId }) as Promise<number>,
  },
  sandbox: {
    create: (projectPath: string, config?: any) => invoke(channels.SANDBOX.CREATE, { projectPath, config }),
    execute: (sandboxId: string, command: string, cwd?: string) => invoke(channels.SANDBOX.EXECUTE, { sandboxId, command, cwd }),
    stop: (sandboxId: string) => invoke(channels.SANDBOX.STOP, { sandboxId }),
    status: (sandboxId: string) => invoke(channels.SANDBOX.STATUS, { sandboxId }),
  },
  updater: {
    check: () => invoke(channels.UPDATER.CHECK, {}),
    install: () => invoke(channels.UPDATER.INSTALL, {}),
  },
  lease: {
    requestEscalation: (leaseId: string, resource: string, reason: string) => invoke(channels.LEASE.ESCALATION_REQUEST, { leaseId, resource, reason }),
    respondEscalation: (requestId: string, approved: boolean) => invoke(channels.LEASE.ESCALATION_RESPOND, { requestId, approved }),
  },
  feature: {
    check: (feature: string) => invoke(channels.FEATURE.CHECK, { feature }),
    getTier: () => invoke(channels.FEATURE.TIER_GET, {}),
    setTier: (tier: string) => invoke(channels.FEATURE.TIER_SET, { tier }),
  },
  audit: {
    query: (filters?: { agentId?: string; action?: string; startTime?: string; endTime?: string }) => invoke(channels.AUDIT.QUERY, { filters }),
  },
};

export type Bridge = typeof bridge;
