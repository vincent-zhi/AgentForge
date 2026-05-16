import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class ArchitectAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'architect', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'architect' });

    const spec = {
      approach: 'incremental',
      steps: [],
      constraints: [],
    };

    this.publishEvent('spec_generated', { spec });
    this.logAction('generate_spec', 'task_spec');
  }
}
