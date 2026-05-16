import type { TaskCapsule } from '@/types/core';
import { BaseAgent as BaseAgentClass } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class OrchestratorAgent extends BaseAgentClass {
  private capsule: TaskCapsule | null = null;

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'orchestrator', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    if (!this.capsule) {
      throw new Error('No task capsule provided to orchestrator');
    }

    this.publishEvent('task_started', { goal: this.capsule.goal, capsuleId: this.capsule.id });

    const stages = [
      { name: 'architect', event: 'spec_generated' },
      { name: 'impact', event: 'impact_map_generated' },
      { name: 'contract', event: 'contract_checked' },
      { name: 'search', event: 'context_retrieved' },
      { name: 'coder', event: 'code_modified' },
      { name: 'tester', event: 'test_completed' },
      { name: 'reviewer', event: 'review_completed' },
      { name: 'doc', event: 'doc_updated' },
    ];

    for (const stage of stages) {
      try {
        this.publishEvent('stage_started', { stage: stage.name });
        this.publishEvent(stage.event, { stage: stage.name, capsuleId: this.capsule.id });
        this.publishEvent('stage_completed', { stage: stage.name });
      } catch (error) {
        this.publishEvent('agent_error', {
          stage: stage.name,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }

    this.publishEvent('task_completed', { capsuleId: this.capsule.id });
  }

  setCapsule(capsule: TaskCapsule): void {
    this.capsule = capsule;
  }
}
