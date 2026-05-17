import type { TaskCapsule, BlackboardEvent } from '@/types/core';
import { BaseAgent as BaseAgentClass } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import type { ModelGateway } from '../model-gateway/model-gateway';
import { ORCHESTRATOR_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';

type AgentExecuteFn = () => Promise<void>;

interface AgentEntry {
  role: string;
  agent: BaseAgentClass;
  execute: AgentExecuteFn;
  dependsOn: string[];
  eventToWait?: string;
}

export class OrchestratorAgent extends BaseAgentClass {
  private capsule: TaskCapsule | null = null;
  private agents: Map<string, AgentEntry> = new Map();
  private _modelGateway: ModelGateway | null = null;

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'orchestrator', taskId, blackboard, leaseManager);
  }

  setCapsule(capsule: TaskCapsule): void {
    this.capsule = capsule;
  }

  override setModelGateway(gateway: ModelGateway): void {
    this._modelGateway = gateway;
  }

  registerAgent(role: string, agent: BaseAgentClass, dependsOn: string[] = [], eventToWait?: string): void {
    this.agents.set(role, {
      role,
      agent,
      execute: () => agent.execute(),
      dependsOn,
      eventToWait,
    });
  }

  async execute(): Promise<void> {
    if (!this.capsule) {
      throw new Error('No task capsule provided to orchestrator');
    }

    this.publishEvent('task_started', { goal: this.capsule.goal, capsuleId: this.capsule.id });

    if (this._modelGateway) {
      await this.executeWithLLM();
    } else {
      await this.executeWithRules();
    }

    this.publishEvent('task_completed', { capsuleId: this.capsule.id });
  }

  private async executeWithLLM(): Promise<void> {
    const goal = this.capsule!.goal;
    const agentList = Array.from(this.agents.keys());

    const messages: ChatMessage[] = [
      { role: 'system', content: ORCHESTRATOR_PROMPT },
      { role: 'user', content: `Goal: ${goal}\n\nAvailable agents: ${agentList.join(', ')}\n\nDetermine the execution order for these agents. Respond with a JSON array of agent role names in execution order. Only include agents that are relevant to the task.` },
    ];

    let executionOrder: string[];
    try {
      const response = await this._modelGateway!.chat(messages);
      executionOrder = this.parseExecutionOrder(response.content, agentList);
    } catch {
      executionOrder = this.getDefaultExecutionOrder();
    }

    await this.executeAgentSequence(executionOrder);
  }

  private async executeWithRules(): Promise<void> {
    const executionOrder = this.getDefaultExecutionOrder();
    await this.executeAgentSequence(executionOrder);
  }

  private getDefaultExecutionOrder(): string[] {
    return ['architect', 'impact', 'contract', 'search', 'coder', 'tester', 'reviewer', 'doc'];
  }

  private parseExecutionOrder(content: string, availableAgents: string[]): string[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s) => String(s).toLowerCase().trim())
          .filter((s) => availableAgents.includes(s));
      }
    } catch {}
    return this.getDefaultExecutionOrder();
  }

  private async executeAgentSequence(order: string[]): Promise<void> {
    const completedRoles = new Set<string>();

    for (const role of order) {
      const entry = this.agents.get(role);
      if (!entry) continue;

      if (entry.eventToWait) {
        await this.waitForOrchestratorEvent(entry.eventToWait, 60000);
      }

      for (const dep of entry.dependsOn) {
        if (!completedRoles.has(dep)) {
          this.publishEvent('stage_skipped', { stage: role, reason: `Dependency '${dep}' not completed` });
          continue;
        }
      }

      this.publishEvent('stage_started', { stage: role });

      try {
        await entry.execute();
        completedRoles.add(role);
        this.publishEvent('stage_completed', { stage: role });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.publishEvent('agent_error', { stage: role, error: errorMsg });

        if (this.isCriticalAgent(role)) {
          this.publishEvent('task_failed', { reason: `Critical agent '${role}' failed: ${errorMsg}` });
          throw error;
        }

        this.publishEvent('stage_failed_non_critical', { stage: role, error: errorMsg });
      }
    }
  }

  private isCriticalAgent(role: string): boolean {
    return ['architect', 'coder', 'reviewer'].includes(role);
  }

  private waitForOrchestratorEvent(eventType: string, timeoutMs: number): Promise<BlackboardEvent | null> {
    return new Promise((resolve) => {
      const existing = this.blackboard.getEvents(this.taskId).find((e) => e.type === eventType);
      if (existing) {
        resolve(existing);
        return;
      }

      const unsubscribe = this.blackboard.subscribe(eventType, (event) => {
        if (event.taskId === this.taskId) {
          clearTimeout(timer);
          unsubscribe();
          resolve(event);
        }
      });

      const timer = setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, timeoutMs);
    });
  }
}
