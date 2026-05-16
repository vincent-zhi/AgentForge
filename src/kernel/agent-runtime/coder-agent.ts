import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class CoderAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'coder', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'coder' });

    this.publishEvent('file_claimed', { files: [], agentId: this.id });
    this.publishEvent('code_modified', { files: [], agentId: this.id });
    this.logAction('modify_code', 'source_files');
  }
}
