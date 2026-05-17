import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { CODER_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';

interface CodeModification {
  filePath: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

export class CoderAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'coder', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'coder' });

    if (!this.modelGateway) {
      this.publishEvent('file_claimed', { files: [], agentId: this.id });
      this.publishEvent('code_modified', { files: [], agentId: this.id });
      this.logAction('modify_code', 'source_files');
      return;
    }

    const spec = this.getTaskSpec();
    const fileContext = this.getFileContext();
    const scopeConstraints = this.getScopeConstraints();

    const messages: ChatMessage[] = [
      { role: 'system', content: CODER_PROMPT },
      { role: 'user', content: `Specification:\n${spec}\n\nFile Context:\n${fileContext}\n\nScope Constraints:\n${scopeConstraints}` },
    ];

    const response = await this.modelGateway.chat(messages);
    const modifications = this.parseModifications(response.content);

    const files = modifications.map((m) => m.filePath);
    this.publishEvent('file_claimed', { files, agentId: this.id });
    this.publishEvent('code_modified', { files, agentId: this.id, modifications });
    this.logAction('modify_code', 'source_files');
  }

  private getTaskSpec(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    if (specEvent?.data?.spec) {
      return JSON.stringify(specEvent.data.spec);
    }
    return 'No specification available.';
  }

  private getFileContext(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const contextEvent = events.find((e) => e.type === 'context_retrieved');
    if (contextEvent?.data) {
      return JSON.stringify(contextEvent.data);
    }
    return 'No file context available.';
  }

  private getScopeConstraints(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const capsuleEvent = events.find((e) => e.type === 'task_started');
    if (capsuleEvent?.data?.capsuleId) {
      return 'Scope constraints from task capsule apply.';
    }
    return 'No scope constraints specified.';
  }

  private parseModifications(content: string): CodeModification[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.filter((m) => m.filePath && m.content).map((m) => ({
          filePath: String(m.filePath),
          content: String(m.content),
          action: m.action || 'modify',
        }));
      }
      if (parsed.modifications && Array.isArray(parsed.modifications)) {
        return parsed.modifications.filter((m: Record<string, unknown>) => m.filePath && m.content).map((m: Record<string, unknown>) => ({
          filePath: String(m.filePath),
          content: String(m.content),
          action: (m.action as string) || 'modify',
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
}
