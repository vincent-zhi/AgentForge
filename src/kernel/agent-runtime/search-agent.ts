import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { SEARCH_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';
import type { BrainService } from '../project-brain/brain-service';

interface SearchResult {
  facts: Array<{ id: string; statement: string; type: string; confidence: string }>;
  relevantFiles: Array<{ path: string; reason: string }>;
  modules: Array<{ name: string; path: string }>;
  summary: string;
}

export class SearchAgent extends BaseAgent {
  private brainService: BrainService | null = null;

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'search', taskId, blackboard, leaseManager);
  }

  setBrainService(service: BrainService): void {
    this.brainService = service;
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'search' });

    const goal = this.getTaskGoal();
    const context = await this.gatherContext(goal);

    this.publishEvent('context_retrieved', { context });
    this.logAction('search_context', 'project_brain');
  }

  private getTaskGoal(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const taskStarted = events.find((e) => e.type === 'task_started');
    return (taskStarted?.data?.goal as string) || '';
  }

  private async gatherContext(goal: string): Promise<SearchResult> {
    const result: SearchResult = {
      facts: [],
      relevantFiles: [],
      modules: [],
      summary: '',
    };

    if (this.brainService) {
      const facts = this.brainService.getFacts();
      const searchResults = this.brainService.searchFacts(goal);

      for (const fact of searchResults.slice(0, 20)) {
        result.facts.push({
          id: fact.id,
          statement: fact.statement,
          type: fact.type,
          confidence: fact.confidence,
        });
      }

      const modules = this.brainService.getModules();
      const goalLower = goal.toLowerCase();
      const relevantModules = modules.filter((m) =>
        goalLower.includes(m.name.toLowerCase()) ||
        m.path.toLowerCase().includes(goalLower) ||
        m.dependencies.some((d) => goalLower.includes(d.toLowerCase()))
      );

      for (const mod of relevantModules) {
        result.modules.push({ name: mod.name, path: mod.path });
      }

      for (const fact of result.facts) {
        const factRecord = facts.find((f) => f.id === fact.id);
        if (factRecord?.evidence) {
          for (const ev of factRecord.evidence) {
            if (ev.files) {
              for (const file of ev.files) {
                if (!result.relevantFiles.some((f) => f.path === file)) {
                  result.relevantFiles.push({ path: file, reason: `Referenced by fact: ${fact.statement.slice(0, 60)}` });
                }
              }
            }
          }
        }
      }
    }

    if (this.modelGateway && goal) {
      const llmContext = await this.enhanceWithLLM(goal, result);
      result.summary = llmContext;
    } else if (result.facts.length > 0 || result.relevantFiles.length > 0) {
      result.summary = `Found ${result.facts.length} facts, ${result.relevantFiles.length} relevant files, ${result.modules.length} modules`;
    } else {
      result.summary = 'No project brain data available. Agent will operate with limited context.';
    }

    return result;
  }

  private async enhanceWithLLM(goal: string, currentContext: SearchResult): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SEARCH_PROMPT },
      { role: 'user', content: `Goal: ${goal}\n\nCurrent context:\nFacts: ${JSON.stringify(currentContext.facts.slice(0, 10))}\nFiles: ${JSON.stringify(currentContext.relevantFiles.slice(0, 10))}\nModules: ${JSON.stringify(currentContext.modules)}\n\nProvide a concise summary of the relevant code context and what additional files or areas should be examined.` },
    ];

    try {
      const response = await this.modelGateway!.chat(messages);
      return response.content;
    } catch {
      return `Context search for: ${goal}. Found ${currentContext.facts.length} facts and ${currentContext.relevantFiles.length} files.`;
    }
  }
}
