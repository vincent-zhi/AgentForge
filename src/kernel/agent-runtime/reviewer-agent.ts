import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class ReviewerAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'reviewer', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'reviewer' });

    const reviewResult = {
      approved: true,
      outOfScope: false,
      issues: [],
    };

    this.publishEvent('review_completed', { review: reviewResult });
    this.logAction('review_changes', 'diff');
  }
}
