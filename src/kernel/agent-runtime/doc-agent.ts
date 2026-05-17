import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { DOC_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';

interface DocUpdate {
  filePath: string;
  type: 'inline' | 'api_doc' | 'readme' | 'adr';
  content: string;
}

export class DocAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'doc', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'doc' });

    const docUpdates = await this.generateDocUpdates();

    this.publishEvent('doc_updated', { files: docUpdates, agentId: this.id });
    this.logAction('update_docs', 'documentation');
  }

  private async generateDocUpdates(): Promise<DocUpdate[]> {
    const codeChanges = this.getCodeChanges();
    const spec = this.getSpec();

    if (codeChanges.length === 0 && !spec) {
      return [];
    }

    if (this.modelGateway) {
      return this.generateDocsWithLLM(codeChanges, spec);
    }

    const updates: DocUpdate[] = [];

    for (const change of codeChanges) {
      if (change.action === 'create' || change.action === 'modify') {
        updates.push({
          filePath: this.getDocPath(change.filePath),
          type: 'inline',
          content: `Documentation update needed for ${change.filePath}`,
        });
      }
    }

    return updates;
  }

  private getCodeChanges(): Array<{ filePath: string; action: string }> {
    const events = this.blackboard.getEvents(this.taskId);
    const codeEvent = events.find((e) => e.type === 'code_modified');
    if (codeEvent?.data?.modifications) {
      return (codeEvent.data.modifications as Array<{ filePath: string; action: string }>);
    }
    if (codeEvent?.data?.files) {
      return (codeEvent.data.files as string[]).map((f) => ({ filePath: f, action: 'modify' }));
    }
    return [];
  }

  private getSpec(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    if (specEvent?.data?.spec) {
      return JSON.stringify(specEvent.data.spec);
    }
    return '';
  }

  private getDocPath(sourcePath: string): string {
    const dir = sourcePath.split('/').slice(0, -1).join('/');
    const filename = sourcePath.split('/').pop() || '';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      return `${dir}/README.md`;
    }
    return `${dir}/CHANGELOG.md`;
  }

  private async generateDocsWithLLM(codeChanges: Array<{ filePath: string; action: string }>, spec: string): Promise<DocUpdate[]> {
    const messages: ChatMessage[] = [
      { role: 'system', content: DOC_PROMPT },
      { role: 'user', content: `Code changes: ${JSON.stringify(codeChanges)}\n\nSpecification: ${spec}\n\nGenerate documentation updates for these changes. Respond with a JSON array of doc updates, each with: filePath, type (inline|api_doc|readme|adr), content.` },
    ];

    try {
      const response = await this.modelGateway!.chat(messages);
      return this.parseDocUpdates(response.content);
    } catch {
      return codeChanges.map((c) => ({
        filePath: this.getDocPath(c.filePath),
        type: 'inline' as const,
        content: `Documentation update needed for ${c.filePath}`,
      }));
    }
  }

  private parseDocUpdates(content: string): DocUpdate[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((d) => d.filePath && d.content)
        .map((d) => ({
          filePath: String(d.filePath),
          type: (['inline', 'api_doc', 'readme', 'adr'].includes(d.type) ? d.type : 'inline') as DocUpdate['type'],
          content: String(d.content),
        }));
    } catch {
      return [];
    }
  }
}
