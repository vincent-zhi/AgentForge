export const IPC_CHANNELS = {
  PROJECT: {
    OPEN: 'project:open',
    SCAN: 'project:scan',
    CLOSE: 'project:close',
    GET_FACTS: 'project:getFacts',
    SEARCH_FACTS: 'project:searchFacts',
    GET_MODULES: 'project:getModules',
    GET_DEPENDENCY_GRAPH: 'project:getDependencyGraph',
  },
  IMPACT: {
    ANALYZE: 'impact:analyze',
    GET_MAP: 'impact:getMap',
    COMPARE_PLANNED_VS_ACTUAL: 'impact:comparePlannedVsActual',
  },
  TASK: {
    CREATE: 'task:create',
    GET_CAPSULE: 'task:getCapsule',
    UPDATE_STATUS: 'task:updateStatus',
    LIST: 'task:list',
  },
  AGENT: {
    START: 'agent:start',
    STOP: 'agent:stop',
    GET_STATUS: 'agent:getStatus',
    GET_TIMELINE: 'agent:getTimeline',
    GET_LEASES: 'agent:getLeases',
  },
  EVIDENCE: {
    GET_STACK: 'evidence:getStack',
    GET_TEST_RESULTS: 'evidence:getTestResults',
  },
  REVIEW: {
    GENERATE_PACKET: 'review:generatePacket',
    SAFE_APPLY_CHECK: 'review:safeApplyCheck',
    APPLY: 'review:apply',
  },
  GIT: {
    STATUS: 'git:status',
    DIFF: 'git:diff',
    COMMIT: 'git:commit',
    LIST_WORKTREES: 'git:listWorktrees',
    CREATE_WORKTREE: 'git:createWorktree',
    REMOVE_WORKTREE: 'git:removeWorktree',
  },
  RUNTIME: {
    EXECUTE_COMMAND: 'runtime:executeCommand',
    RUN_TESTS: 'runtime:runTests',
  },
  FILE: {
    READ: 'file:read',
    WRITE: 'file:write',
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:getAll',
    DELETE: 'settings:delete',
  },
} as const;

export type IpcChannel = typeof IPC_CHANNELS;
