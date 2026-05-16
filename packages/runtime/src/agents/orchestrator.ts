import { generateImpactMap, type ImpactGuardInput, type TaskCapsule } from '@agentforge/core';
import { createContextLease } from '../context/context-lease.js';
import { AgentTimeline } from '../timeline/agent-timeline.js';

export interface CreateTaskCapsuleInput extends ImpactGuardInput {
  taskId: string;
}

export class Orchestrator {
  constructor(private readonly timeline = new AgentTimeline()) {}

  createTaskCapsule(input: CreateTaskCapsuleInput): TaskCapsule {
    const impactMap = generateImpactMap(input);
    this.timeline.record({ event: 'impact_map_generated', agent: 'impact-agent', taskId: input.taskId, payload: { risk: impactMap.risk.level } });
    const coderLease = createContextLease({
      agent: 'coder',
      taskId: input.taskId,
      canRead: [...input.targetFiles, `${impactMap.changeTarget.module}/**`],
      canWrite: input.targetFiles,
      canUseFacts: [],
      tools: ['read_file', 'edit_file', 'run_test', 'git'],
      requiresApprovalFor: impactMap.forbiddenChanges
    });
    this.timeline.record({ event: 'lease_granted', agent: 'orchestrator', taskId: input.taskId, payload: { leaseId: coderLease.leaseId, agent: coderLease.agent } });
    return {
      taskId: input.taskId,
      goal: input.goal,
      spec: `Deliver the requested goal while preserving impacted contracts: ${input.goal}`,
      plan: ['Understand project facts', 'Generate Impact Map', 'Apply scoped code changes', 'Run required verification', 'Produce Evidence Review Packet'],
      impactMap,
      leases: [coderLease],
      requiredTests: impactMap.requiredVerification,
      reviewFocus: impactMap.risk.reasons
    };
  }

  getTimeline(): AgentTimeline {
    return this.timeline;
  }
}
