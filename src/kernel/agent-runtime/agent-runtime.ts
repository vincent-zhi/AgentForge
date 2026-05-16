import { v4 as uuidv4 } from 'uuid';
import type { TaskCapsule, AgentRole, BlackboardEvent } from '@/types/core';
import { Blackboard } from './blackboard';
import { BaseAgent } from './base-agent';
import { OrchestratorAgent } from './orchestrator';
import { ArchitectAgent } from './architect-agent';
import { ImpactAgent } from './impact-agent';
import { ContractAgent } from './contract-agent';
import { SearchAgent } from './search-agent';
import { CoderAgent } from './coder-agent';
import { TesterAgent } from './tester-agent';
import { ReviewerAgent } from './reviewer-agent';
import { DocAgent } from './doc-agent';
import { LeaseManager } from '../context-lease/lease-manager';

interface AgentInfo {
  id: string;
  role: AgentRole;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

const AGENT_ROLES: AgentRole[] = ['orchestrator', 'architect', 'impact', 'contract', 'search', 'coder', 'tester', 'reviewer', 'doc'];

const AGENT_CONSTRUCTORS: Record<AgentRole, new (id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) => BaseAgent> = {
  orchestrator: OrchestratorAgent,
  architect: ArchitectAgent,
  impact: ImpactAgent,
  contract: ContractAgent,
  search: SearchAgent,
  coder: CoderAgent,
  tester: TesterAgent,
  reviewer: ReviewerAgent,
  doc: DocAgent,
};

export class AgentRuntime {
  private blackboard: Blackboard;
  private leaseManager: LeaseManager;
  private agents: Map<string, BaseAgent> = new Map();
  private agentStatuses: Map<string, AgentInfo> = new Map();
  private runningTasks: Map<string, boolean> = new Map();

  constructor(blackboard?: Blackboard, leaseManager?: LeaseManager) {
    this.blackboard = blackboard || new Blackboard();
    this.leaseManager = leaseManager || new LeaseManager();
  }

  async startTask(capsule: TaskCapsule): Promise<void> {
    this.runningTasks.set(capsule.id, true);

    const orchestratorId = `agent-orchestrator-${uuidv4().slice(0, 8)}`;
    const orchestrator = new OrchestratorAgent(orchestratorId, capsule.id, this.blackboard, this.leaseManager);

    const lease = this.leaseManager.createLease(capsule.id, orchestratorId, 'orchestrator', capsule);
    orchestrator.setLease(lease);

    this.agents.set(orchestratorId, orchestrator);
    this.agentStatuses.set(orchestratorId, { id: orchestratorId, role: 'orchestrator', status: 'running' });

    for (const role of AGENT_ROLES) {
      if (role === 'orchestrator') continue;
      const agentId = `agent-${role}-${uuidv4().slice(0, 8)}`;
      const AgentClass = AGENT_CONSTRUCTORS[role];
      const agent = new AgentClass(agentId, capsule.id, this.blackboard, this.leaseManager);
      const agentLease = this.leaseManager.createLease(capsule.id, agentId, role, capsule);
      agent.setLease(agentLease);
      this.agents.set(agentId, agent);
      this.agentStatuses.set(agentId, { id: agentId, role, status: 'idle' });
    }

    orchestrator.setCapsule(capsule);

    try {
      await orchestrator.execute();
      this.agentStatuses.set(orchestratorId, { id: orchestratorId, role: 'orchestrator', status: 'completed' });
    } catch (error) {
      this.agentStatuses.set(orchestratorId, { id: orchestratorId, role: 'orchestrator', status: 'failed' });
      this.blackboard.publish({
        type: 'agent_error',
        agentId: orchestratorId,
        taskId: capsule.id,
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      this.runningTasks.set(capsule.id, false);
      this.leaseManager.expireLeases(capsule.id);
    }
  }

  stopTask(taskId: string): void {
    this.runningTasks.set(taskId, false);
    this.leaseManager.expireLeases(taskId);
    for (const [agentId, info] of this.agentStatuses.entries()) {
      if (info.status === 'running') {
        this.agentStatuses.set(agentId, { ...info, status: 'failed' });
      }
    }
  }

  getStatus(_taskId: string): AgentInfo[] {
    const agents: AgentInfo[] = [];
    for (const info of this.agentStatuses.values()) {
      agents.push(info);
    }
    return agents;
  }

  getTimeline(taskId: string): BlackboardEvent[] {
    return this.blackboard.getEvents(taskId);
  }

  getBlackboard(): Blackboard {
    return this.blackboard;
  }
}
