import { getDatabase, closeDatabase, runMigrations } from '../db';
import { BrainService } from './project-brain/brain-service';
import { GraphEngine } from './contract-graph/graph-engine';
import { GuardEngine } from './impact-guard/guard-engine';
import { LeaseManager } from './context-lease/lease-manager';
import { AgentRuntime } from './agent-runtime/agent-runtime';
import { EvidencePipeline } from './evidence-pipeline/pipeline';
import { CapsuleCompiler } from './task-capsule/capsule-compiler';
import { FactGovernor } from './memory-governance/fact-governor';
import { ModelGateway } from './model-gateway/model-gateway';
import { TerminalManager } from './runtime/terminal-manager';
import { GitManager } from './runtime/git-manager';
import { TestRunner } from './runtime/test-runner';
import { AuditLogger } from './security/audit-logger';
import { ProjectOpenWorkflow } from './workflow/project-open-workflow';
import { TaskCreateWorkflow } from './workflow/task-create-workflow';
import { TaskExecuteWorkflow } from './workflow/task-execute-workflow';
import { TaskDeliverWorkflow } from './workflow/task-deliver-workflow';
import { TaskCapsuleRepository } from '../db/repositories/task-capsule-repo';
import { generatePacket } from './review-packet/packet-generator';
import { runSafeApplyChecks } from './safe-apply/apply-gate';

let brainService: BrainService;
let graphEngine: GraphEngine;
let guardEngine: GuardEngine;
let leaseManager: LeaseManager;
let agentRuntime: AgentRuntime;
let evidencePipeline: EvidencePipeline;
let capsuleCompiler: CapsuleCompiler;
let factGovernor: FactGovernor;
let modelGateway: ModelGateway;
let terminalManager: TerminalManager;
let gitManager: GitManager;
let testRunner: TestRunner;
let auditLogger: AuditLogger;
let projectOpenWorkflow: ProjectOpenWorkflow;
let taskCreateWorkflow: TaskCreateWorkflow;
let taskExecuteWorkflow: TaskExecuteWorkflow;
let taskDeliverWorkflow: TaskDeliverWorkflow;
let taskCapsuleRepo: TaskCapsuleRepository;

const packetGenerator = { generatePacket };
const applyGate = { runSafeApplyChecks };

export function initializeKernel(): void {
  const db = getDatabase();
  runMigrations(db);

  brainService = new BrainService();
  graphEngine = new GraphEngine();
  guardEngine = new GuardEngine();
  leaseManager = new LeaseManager();
  evidencePipeline = new EvidencePipeline();
  capsuleCompiler = new CapsuleCompiler();
  factGovernor = new FactGovernor();
  modelGateway = new ModelGateway();
  terminalManager = new TerminalManager();
  gitManager = new GitManager();
  testRunner = new TestRunner();
  auditLogger = new AuditLogger();
  taskCapsuleRepo = new TaskCapsuleRepository();

  capsuleCompiler.setGuardEngine(guardEngine);
  capsuleCompiler.setBrainService(brainService);

  agentRuntime = new AgentRuntime(undefined, leaseManager);

  projectOpenWorkflow = new ProjectOpenWorkflow(brainService, graphEngine);
  taskCreateWorkflow = new TaskCreateWorkflow(capsuleCompiler, guardEngine, brainService);
  taskExecuteWorkflow = new TaskExecuteWorkflow(agentRuntime, leaseManager, evidencePipeline, guardEngine, auditLogger);
  taskDeliverWorkflow = new TaskDeliverWorkflow(guardEngine, factGovernor, auditLogger);
}

export function shutdownKernel(): void {
  closeDatabase();
}

export const kernelServices = {
  get brainService() { return brainService; },
  get graphEngine() { return graphEngine; },
  get guardEngine() { return guardEngine; },
  get leaseManager() { return leaseManager; },
  get agentRuntime() { return agentRuntime; },
  get evidencePipeline() { return evidencePipeline; },
  get capsuleCompiler() { return capsuleCompiler; },
  get factGovernor() { return factGovernor; },
  get modelGateway() { return modelGateway; },
  get terminalManager() { return terminalManager; },
  get gitManager() { return gitManager; },
  get testRunner() { return testRunner; },
  get auditLogger() { return auditLogger; },
  get projectOpenWorkflow() { return projectOpenWorkflow; },
  get taskCreateWorkflow() { return taskCreateWorkflow; },
  get taskExecuteWorkflow() { return taskExecuteWorkflow; },
  get taskDeliverWorkflow() { return taskDeliverWorkflow; },
  get taskCapsuleRepo() { return taskCapsuleRepo; },
  packetGenerator,
  applyGate,
};

export {
  brainService,
  graphEngine,
  guardEngine,
  leaseManager,
  agentRuntime,
  evidencePipeline,
  capsuleCompiler,
  factGovernor,
  modelGateway,
  terminalManager,
  gitManager,
  testRunner,
  auditLogger,
  projectOpenWorkflow,
  taskCreateWorkflow,
  taskExecuteWorkflow,
  taskDeliverWorkflow,
  taskCapsuleRepo,
  packetGenerator,
  applyGate,
};

export { BrainService } from './project-brain/brain-service';
export { GraphEngine } from './contract-graph/graph-engine';
export { GuardEngine } from './impact-guard/guard-engine';
export { LeaseManager } from './context-lease/lease-manager';
export { AgentRuntime } from './agent-runtime/agent-runtime';
export { EvidencePipeline } from './evidence-pipeline/pipeline';
export { CapsuleCompiler } from './task-capsule/capsule-compiler';
export { FactGovernor } from './memory-governance/fact-governor';
export { ModelGateway } from './model-gateway/model-gateway';
export { TerminalManager } from './runtime/terminal-manager';
export { GitManager } from './runtime/git-manager';
export { TestRunner } from './runtime/test-runner';
export { AuditLogger } from './security/audit-logger';
export { isSensitivePath, isHighRiskPath, checkFileAccess, SENSITIVE_PATTERNS, HIGH_RISK_PATTERNS } from './security/file-guard';
export { classifyCommand } from './security/command-classifier';
export { ProjectOpenWorkflow } from './workflow/project-open-workflow';
export { TaskCreateWorkflow } from './workflow/task-create-workflow';
export { TaskExecuteWorkflow } from './workflow/task-execute-workflow';
export { TaskDeliverWorkflow } from './workflow/task-deliver-workflow';
