import { buildEvidenceReviewPacket, buildPullRequestDraft, ProjectBrainFactStore, scanRepository, type EvidenceReviewPacket, type ProjectBrainSnapshot, type PullRequestDraft, type RepoIntelligenceSummary, type TaskCapsule, type VerificationEvidence } from '@agentforge/core';
import { Orchestrator, type CreateTaskCapsuleInput } from '../agents/orchestrator.js';
import { AuditLog } from '../audit/audit-log.js';
import { AgentTimeline } from '../timeline/agent-timeline.js';

export type TaskSessionStatus = 'understanding' | 'planned' | 'changing' | 'proving' | 'ready_for_review' | 'discarded';

export interface TaskSessionSnapshot {
  status: TaskSessionStatus;
  repo: RepoIntelligenceSummary;
  task: TaskCapsule;
  reviewPacket?: EvidenceReviewPacket;
  pullRequestDraft?: PullRequestDraft;
  timeline: ReturnType<AgentTimeline['list']>;
  audit: ReturnType<AuditLog['list']>;
  brain: ProjectBrainSnapshot;
}


export interface StartTaskSessionInput extends Omit<CreateTaskCapsuleInput, 'knownModules' | 'publicContracts' | 'testCommands' | 'highRiskAreas'> {
  rootPath: string;
  actualFiles?: string[];
  verification?: VerificationEvidence[];
}

export class TaskSession {
  private status: TaskSessionStatus = 'understanding';
  private repo?: RepoIntelligenceSummary;
  private task?: TaskCapsule;
  private reviewPacket?: EvidenceReviewPacket;
  private pullRequestDraft?: PullRequestDraft;
  private brainStore?: ProjectBrainFactStore;

  constructor(
    private readonly orchestrator = new Orchestrator(),
    private readonly auditLog = new AuditLog()
  ) {}

  async start(input: StartTaskSessionInput): Promise<TaskSessionSnapshot> {
    this.status = 'understanding';
    this.repo = await scanRepository(input.rootPath, { maxFiles: 1_500 });
    this.brainStore = new ProjectBrainFactStore(this.repo.facts);
    this.orchestrator.getTimeline().record({ event: 'project_brain_scanned', agent: 'search-agent', taskId: input.taskId, payload: { facts: this.repo.facts.length, confidence: this.repo.confidenceScore } });

    this.task = this.orchestrator.createTaskCapsule({
      ...input,
      knownModules: this.repo.modules.length > 0 ? this.repo.modules : ['.'],
      publicContracts: this.repo.publicContracts,
      contractGraph: this.repo.contractGraph,
      testCommands: this.repo.testCommands,
      highRiskAreas: this.repo.highRiskAreas
    });
    for (const lease of this.task.leases) {
      this.auditLog.record({ taskId: input.taskId, agentId: String(lease.agent), action: 'lease_granted', status: 'ok', target: lease.leaseId, payload: { canRead: lease.canRead, canWrite: lease.canWrite, tools: lease.tools } });
    }
    this.status = 'planned';

    this.status = 'proving';
    this.reviewPacket = buildEvidenceReviewPacket({
      taskId: input.taskId,
      goal: input.goal,
      result: `Prepared PRD-governed delivery package for: ${input.goal}`,
      impact: this.task.impactMap,
      actualFiles: input.actualFiles ?? input.targetFiles,
      verification: input.verification ?? this.task.requiredTests.map((command) => ({ command, status: 'skipped' as const, summary: 'Recommended by Impact Guard; not run in this session.' }))
    });
    this.pullRequestDraft = buildPullRequestDraft({ provider: 'github', baseBranch: 'main', headBranch: `agentforge/${input.taskId.toLowerCase()}`, packet: this.reviewPacket });
    const staleFacts = this.brainStore.markChangedFiles(input.actualFiles ?? input.targetFiles);
    if (staleFacts.length > 0) {
      this.orchestrator.getTimeline().record({ event: 'project_brain_facts_staled', agent: 'doc-agent', taskId: input.taskId, payload: { staleFactIds: staleFacts.map((fact) => fact.factId) } });
    }
    this.orchestrator.getTimeline().record({ event: 'ready_for_review', agent: 'reviewer-agent', taskId: input.taskId, payload: { risk: this.reviewPacket.riskLevel, changedFiles: this.reviewPacket.changedFiles.length } });
    this.status = 'ready_for_review';
    return this.snapshot();
  }

  snapshot(): TaskSessionSnapshot {
    if (!this.repo || !this.task || !this.brainStore) throw new Error('Task session has not started');
    return {
      status: this.status,
      repo: this.repo,
      task: this.task,
      reviewPacket: this.reviewPacket,
      pullRequestDraft: this.pullRequestDraft,
      timeline: this.orchestrator.getTimeline().list(this.task.taskId),
      audit: this.auditLog.list({ taskId: this.task.taskId }),
      brain: this.brainStore.snapshot()
    };
  }
}
