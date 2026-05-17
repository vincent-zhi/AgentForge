import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { IMPACT_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';
import type { ImpactMap } from '@/types/core';

export class ImpactAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'architect', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'impact' });

    const staticImpactMap = this.getStaticImpactMap();

    if (!this.modelGateway) {
      this.publishEvent('impact_map_generated', { impactMap: staticImpactMap });
      this.logAction('analyze_impact', 'impact_map');
      return;
    }

    const dependencyInfo = this.buildDependencyContext(staticImpactMap);

    const messages: ChatMessage[] = [
      { role: 'system', content: IMPACT_PROMPT },
      { role: 'user', content: `Analyze the impact of the proposed changes.\n\nDependency Info:\n${dependencyInfo}\n\nStatic Analysis Results:\n${JSON.stringify(staticImpactMap, null, 2)}` },
    ];

    const response = await this.modelGateway.chat(messages);
    const llmAnalysis = this.parseLLMAnalysis(response.content);

    const impactMap = this.combineAnalyses(staticImpactMap, llmAnalysis);

    this.publishEvent('impact_map_generated', { impactMap });
    this.logAction('analyze_impact', 'impact_map');
  }

  private getStaticImpactMap(): ImpactMap {
    return {
      taskId: this.taskId,
      target: { module: '', files: [] },
      upstreamDependencies: [],
      downstreamDependents: [],
      contractsTouched: [],
      affectedTests: [],
      forbiddenChanges: [],
      risk: { level: 'low' as const, reasons: [] },
      reviewFocus: [],
      plannedImpactHash: '',
    };
  }

  private buildDependencyContext(impactMap: ImpactMap): string {
    const parts: string[] = [];
    if (impactMap.upstreamDependencies.length > 0) {
      parts.push(`Upstream: ${impactMap.upstreamDependencies.map((d) => d.name).join(', ')}`);
    }
    if (impactMap.downstreamDependents.length > 0) {
      parts.push(`Downstream: ${impactMap.downstreamDependents.map((d) => d.name).join(', ')}`);
    }
    if (impactMap.contractsTouched.length > 0) {
      parts.push(`Contracts: ${impactMap.contractsTouched.map((c) => c.name).join(', ')}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'No dependency information available.';
  }

  private parseLLMAnalysis(content: string): Record<string, unknown> {
    try {
      return JSON.parse(content);
    } catch {
      return { rawAnalysis: content };
    }
  }

  private combineAnalyses(staticMap: ImpactMap, llmAnalysis: Record<string, unknown>): ImpactMap {
    const additionalRisks: string[] = Array.isArray(llmAnalysis.additionalRisks)
      ? llmAnalysis.additionalRisks as string[]
      : [];
    const additionalReviewFocus: string[] = Array.isArray(llmAnalysis.reviewFocus)
      ? llmAnalysis.reviewFocus as string[]
      : [];

    return {
      ...staticMap,
      risk: {
        level: staticMap.risk.level,
        reasons: [...staticMap.risk.reasons, ...additionalRisks],
      },
      reviewFocus: [...staticMap.reviewFocus, ...additionalReviewFocus],
    };
  }
}
