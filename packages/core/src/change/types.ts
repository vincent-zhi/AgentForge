export interface FilePatch {
  file: string;
  before?: string;
  after?: string;
  intent: string;
}

export interface ChangeSet {
  changeSetId: string;
  taskId: string;
  patches: FilePatch[];
  createdAt: string;
}

export interface ApplyDecision {
  action: 'apply' | 'revise' | 'discard' | 'create_pr';
  reason?: string;
}

export interface RollbackCheckpoint {
  checkpointId: string;
  taskId: string;
  files: Array<{ file: string; content?: string }>;
  createdAt: string;
}
