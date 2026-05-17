import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { ARCHITECT_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';

export class ArchitectAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'architect', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'architect' });

    if (!this.modelGateway) {
      this.publishEvent('spec_generated', { spec: { approach: 'incremental', steps: [], constraints: [] } });
      this.logAction('generate_spec', 'task_spec');
      return;
    }

    const goal = this.getTaskGoal();
    const projectContext = this.getProjectContext();

    const messages: ChatMessage[] = [
      { role: 'system', content: ARCHITECT_PROMPT },
      { role: 'user', content: `Goal: ${goal}\n\nProject Context:\n${projectContext}` },
    ];

    const response = await this.modelGateway.chat(messages);
    const spec = this.parseSpec(response.content);

    this.publishEvent('spec_generated', { spec });
    this.logAction('generate_spec', 'task_spec');
  }

  private getTaskGoal(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const taskStarted = events.find((e) => e.type === 'task_started');
    return (taskStarted?.data?.goal as string) || '';
  }

  private getProjectContext(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const contextEvents = events.filter((e) => e.type === 'context_retrieved');
    if (contextEvents.length === 0) return 'No project context available.';
    return contextEvents.map((e) => JSON.stringify(e.data)).join('\n');
  }

  private parseSpec(content: string): { approach: string; steps: string[]; constraints: string[] } {
    try {
      const parsed = JSON.parse(content);
      return {
        approach: parsed.approach || 'incremental',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
      };
    } catch {
      return {
        approach: 'incremental',
        steps: [content],
        constraints: [],
      };
    }
  }
}
