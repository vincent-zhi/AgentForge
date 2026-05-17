import { v4 as uuidv4 } from 'uuid';
import { Blackboard } from './blackboard';
import { OrchestratorAgent } from './orchestrator';
import { ArchitectAgent } from './architect-agent';
import { ImpactAgent } from './impact-agent';
import { ContractAgent } from './contract-agent';
import { SearchAgent } from './search-agent';
import { CoderAgent } from './coder-agent';
import { TesterAgent } from './tester-agent';
import { ReviewerAgent } from './reviewer-agent';
import { DocAgent } from './doc-agent';
import type { LeaseManager } from '../context-lease/lease-manager';
import type { ModelGateway } from '../model-gateway/model-gateway';
import type { BrainService } from '../project-brain/brain-service';
import type { GuardEngine } from '../impact-guard/guard-engine';
import type { GraphEngine } from '../contract-graph/graph-engine';
import type { TestRunner } from '../runtime/test-runner';
import type { TaskCapsule } from '@/types/core';

export interface AgentRuntimeDeps {
  leaseManager: LeaseManager;
  modelGateway: ModelGateway;
  brainService: BrainService;
  guardEngine: GuardEngine;
  graphEngine: GraphEngine;
  testRunner: TestRunner;
  projectPath: string;
}

export class AgentRuntime {
  private blackboard: Blackboard;
  private leaseManager: LeaseManager;
  private modelGateway: ModelGateway;
  private brainService: BrainService;
  private guardEngine: GuardEngine;
  private graphEngine: GraphEngine;
  private testRunner: TestRunner;
  private projectPath: string;
  private orchestrator: OrchestratorAgent | null = null;

  constructor(deps: AgentRuntimeDeps) {
    this.blackboard = new Blackboard();
    this.leaseManager = deps.leaseManager;
    this.modelGateway = deps.modelGateway;
    this.brainService = deps.brainService;
    this.guardEngine = deps.guardEngine;
    this.graphEngine = deps.graphEngine;
    this.testRunner = deps.testRunner;
    this.projectPath = deps.projectPath;
  }

  getBlackboard(): Blackboard {
    return this.blackboard;
  }

  async startTask(capsule: TaskCapsule): Promise<void> {
    this.blackboard.clear();

    const taskId = capsule.id;
    const orchestrator = new OrchestratorAgent(
      `agent_orch_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    orchestrator.setCapsule(capsule);
    orchestrator.setModelGateway(this.modelGateway);

    const architect = new ArchitectAgent(
      `agent_arch_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    architect.setModelGateway(this.modelGateway);

    const impact = new ImpactAgent(
      `agent_impact_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    impact.setModelGateway(this.modelGateway);
    impact.setGuardEngine(this.guardEngine);

    const contract = new ContractAgent(
      `agent_contract_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    contract.setModelGateway(this.modelGateway);
    contract.setGraphEngine(this.graphEngine);

    const search = new SearchAgent(
      `agent_search_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    search.setModelGateway(this.modelGateway);
    search.setBrainService(this.brainService);

    const coder = new CoderAgent(
      `agent_coder_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    coder.setModelGateway(this.modelGateway);

    const tester = new TesterAgent(
      `agent_tester_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    tester.setModelGateway(this.modelGateway);
    tester.setTestRunner(this.testRunner);
    tester.setProjectPath(this.projectPath);

    const reviewer = new ReviewerAgent(
      `agent_reviewer_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    reviewer.setModelGateway(this.modelGateway);

    const doc = new DocAgent(
      `agent_doc_${uuidv4().slice(0, 8)}`,
      taskId,
      this.blackboard,
      this.leaseManager,
    );
    doc.setModelGateway(this.modelGateway);

    orchestrator.registerAgent('architect', architect, [], 'task_started');
    orchestrator.registerAgent('impact', impact, ['architect'], 'spec_generated');
    orchestrator.registerAgent('contract', contract, ['impact'], 'impact_map_generated');
    orchestrator.registerAgent('search', search, ['architect'], 'spec_generated');
    orchestrator.registerAgent('coder', coder, ['search', 'contract'], 'context_retrieved');
    orchestrator.registerAgent('tester', tester, ['coder'], 'code_modified');
    orchestrator.registerAgent('reviewer', reviewer, ['coder', 'tester'], 'test_completed');
    orchestrator.registerAgent('doc', doc, ['reviewer'], 'review_completed');

    this.orchestrator = orchestrator;

    await this.orchestrator.execute();
  }

  async stopTask(): Promise<void> {
    this.blackboard.clear();
    this.orchestrator = null;
  }
}
