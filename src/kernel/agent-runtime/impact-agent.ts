import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { IMPACT_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';
import type { GuardEngine } from '../impact-guard/guard-engine';
import type { ImpactMap, ModuleRef } from '@/types/core';

export class ImpactAgent extends BaseAgent {
  private guardEngine: GuardEngine | null = null;

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'impact', taskId, blackboard, leaseManager);
  }

  setGuardEngine(engine: GuardEngine): void {
    this.guardEngine = engine;
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'impact' });

    const goal = this.getTaskGoal();
    const targetModule = this.getTargetModule();
    const targetFiles = this.getTargetFiles();

    let impactMap: ImpactMap;

    if (this.guardEngine && targetModule && targetFiles.length > 0) {
      impactMap = this.guardEngine.analyzeImpact(this.taskId, {
        module: targetModule,
        files: targetFiles,
      });
    } else if (this.modelGateway && goal) {
      impactMap = await this.analyzeWithLLM(goal, targetFiles);
    } else {
      impactMap = this.createEmptyImpactMap(targetModule || 'unknown', targetFiles);
    }

    this.publishEvent('impact_map_generated', { impactMap });
    this.logAction('analyze_impact', 'impact_guard');
  }

  private getTaskGoal(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const taskStarted = events.find((e) => e.type === 'task_started');
    return (taskStarted?.data?.goal as string) || '';
  }

  private getTargetModule(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    const specData = specEvent?.data as { spec?: { affectedModules?: ModuleRef[] } } | undefined;
    if (specData?.spec?.affectedModules) {
      return specData.spec.affectedModules.length > 0 ? specData.spec.affectedModules[0].name : 'unknown';
    }
    return 'unknown';
  }

  private getTargetFiles(): string[] {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    const specData = specEvent?.data as { spec?: { affectedModules?: ModuleRef[] } } | undefined;
    if (specData?.spec?.affectedModules) {
      return specData.spec.affectedModules.map((m) => m.path);
    }
    return [];
  }

  private async analyzeWithLLM(goal: string, targetFiles: string[]): Promise<ImpactMap> {
    const messages: ChatMessage[] = [
      { role: 'system', content: IMPACT_PROMPT },
      { role: 'user', content: `Goal: ${goal}\n\nTarget files: ${JSON.stringify(targetFiles)}\n\nAnalyze the impact of these changes. Respond with a JSON object containing: riskLevel (low|medium|high|critical), upstreamModules (string[]), downstreamModules (string[]), affectedContracts (string[]), reviewFocus (string[]), affectedTestCommands (string[]).` },
    ];

    try {
      const response = await this.modelGateway!.chat(messages);
      return this.parseImpactMap(response.content, targetFiles);
    } catch {
      return this.createEmptyImpactMap('unknown', targetFiles);
    }
  }

  private parseImpactMap(content: string, targetFiles: string[]): ImpactMap {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        taskId: this.taskId,
        target: {
          module: (parsed.upstreamModules?.[0] as string) || 'unknown',
          files: targetFiles,
        },
        upstreamDependencies: (parsed.upstreamModules || []).map((name: string) => ({ name, path: '', type: 'directory' as const })),
        downstreamDependents: (parsed.downstreamModules || []).map((name: string) => ({ name, path: '', type: 'directory' as const })),
        contractsTouched: (parsed.affectedContracts || []).map((name: string) => ({
          id: `contract_${name}`,
          name,
          type: 'api' as const,
          provider: '',
          consumers: [],
          compatibility: 'must_preserve' as const,
        })),
        affectedTests: (parsed.affectedTestCommands || []).map((cmd: string) => ({ command: cmd, module: '' })),
        forbiddenChanges: [],
        risk: {
          level: parsed.riskLevel || 'medium',
          reasons: parsed.reviewFocus || [],
        },
        reviewFocus: parsed.reviewFocus || [],
        plannedImpactHash: '',
      };
    } catch {
      return this.createEmptyImpactMap('unknown', targetFiles);
    }
  }

  private createEmptyImpactMap(module: string, targetFiles: string[]): ImpactMap {
    return {
      taskId: this.taskId,
      target: { module, files: targetFiles },
      upstreamDependencies: [],
      downstreamDependents: [],
      contractsTouched: [],
      affectedTests: [],
      forbiddenChanges: [],
      risk: { level: 'low', reasons: [] },
      reviewFocus: [],
      plannedImpactHash: '',
    };
  }
}
