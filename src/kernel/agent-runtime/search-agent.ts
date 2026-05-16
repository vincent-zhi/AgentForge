import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class SearchAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'search', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'search' });

    const context = {
      facts: [],
      relevantFiles: [],
    };

    this.publishEvent('context_retrieved', { context });
    this.logAction('search_context', 'project_brain');
  }
}
