import { v4 as uuid } from 'uuid';
import { CapsuleCompiler } from '../task-capsule/capsule-compiler';
import { GuardEngine } from '../impact-guard/guard-engine';
import { AgentRuntime } from '../agent-runtime/agent-runtime';
import { LeaseManager } from '../context-lease/lease-manager';
import { EvidencePipeline } from '../evidence-pipeline/pipeline';
import { generatePacket } from '../review-packet/packet-generator';
import { runSafeApplyChecks } from '../safe-apply/apply-gate';
import { TaskCapsuleRepository } from '../../db/repositories/task-capsule-repo';
import { ImpactMapRepository } from '../../db/repositories/impact-map-repo';
import { WorktreeManager } from '../runtime/worktree-manager';
import { classifyTask, type TaskClassification } from './task-classifier';
import type { TaskCapsule, TaskStatus } from '@/types/core';
import type { BrowserWindow } from 'electron';
import { EVENT_CHANNELS } from '../../ipc/event-channels';

export type WorkflowStep =
  | 'parsing' | 'analyzing_impact' | 'compiling_capsule'
  | 'awaiting_confirmation' | 'creating_leases' | 'executing_agents'
  | 'collecting_evidence' | 'generating_review' | 'checking_safe_apply'
  | 'completed' | 'failed';

export class WorkflowController {
  private capsuleCompiler: CapsuleCompiler;
  private _guardEngine: GuardEngine;
  private agentRuntime: AgentRuntime;
  private _leaseManager: LeaseManager;
  private pipeline: EvidencePipeline;
  private taskRepo: TaskCapsuleRepository;
  private impactRepo: ImpactMapRepository;
  private worktreeManager: WorktreeManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isIsolated: Map<string, boolean> = new Map();
  private currentTaskId: string | null = null;
  private currentStep: WorkflowStep = 'parsing';
  private projectPath: string = '';
  private taskClassifications: Map<string, TaskClassification> = new Map();

  constructor(
    capsuleCompiler: CapsuleCompiler,
    guardEngine: GuardEngine,
    agentRuntime: AgentRuntime,
    leaseManager: LeaseManager,
    pipeline: EvidencePipeline,
    taskRepo: TaskCapsuleRepository,
    impactRepo: ImpactMapRepository,
  ) {
    this.capsuleCompiler = capsuleCompiler;
    this._guardEngine = guardEngine;
    this.agentRuntime = agentRuntime;
    this._leaseManager = leaseManager;
    this.pipeline = pipeline;
    this.taskRepo = taskRepo;
    this.impactRepo = impactRepo;
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setWorktreeManager(manager: WorktreeManager): void {
    this.worktreeManager = manager;
  }

  setProjectPath(path: string): void {
    this.projectPath = path;
  }

  async start(goal: string): Promise<TaskCapsule> {
    this.currentTaskId = uuid();
    this.setStep('parsing');

    const classification = classifyTask(goal);
    this.taskClassifications.set(this.currentTaskId, classification);
    this.emitEvent('task_classified', { taskId: this.currentTaskId, classification });

    if (classification.complexity === 'lightweight') {
      this.emitTaskStatus('executing');
      this.setStep('compiling_capsule');
      const capsule = this.capsuleCompiler.compileTask(goal);
      capsule.id = this.currentTaskId!;
      capsule.status = 'executing';
      this.taskRepo.insert(capsule);

      this.setStep('analyzing_impact');
      const target = {
        module: capsule.affectedModules[0]?.name || capsule.writable[0] || '',
        files: capsule.writable,
      };
      const impactAnalysis = this._guardEngine.analyzeImpact(this.currentTaskId, target, classification.strategy);

      this.setStep('creating_leases');
      this._leaseManager.createLease(
        this.currentTaskId,
        this.currentTaskId,
        'coder',
        { writable: capsule.writable, readonly: capsule.readonly, forbidden: capsule.forbidden, mustPreserve: capsule.mustPreserve },
      );

      if (this.worktreeManager && this.projectPath) {
        try {
          const worktreePath = await this.worktreeManager.createForTask(this.projectPath, this.currentTaskId);
          this.isIsolated.set(this.currentTaskId!, true);
          this.emitEvent('worktree_created', { taskId: this.currentTaskId, path: worktreePath });
        } catch (err) {
          this.isIsolated.set(this.currentTaskId!, false);
          this.emitEvent('worktree_error', { taskId: this.currentTaskId, error: err instanceof Error ? err.message : String(err) });
        }
      } else {
        this.isIsolated.set(this.currentTaskId!, false);
      }

      this.setStep('executing_agents');
      try {
        await this.agentRuntime.startTask(capsule);
      } catch (err) {
        if (this.isIsolated.get(this.currentTaskId!) && this.worktreeManager && this.projectPath) {
          try {
            await this.worktreeManager.discardWorktree(this.projectPath, this.currentTaskId!);
            this.emitEvent('worktree_discarded', { taskId: this.currentTaskId });
          } catch (discardErr) {
            this.emitEvent('worktree_error', { taskId: this.currentTaskId, error: discardErr instanceof Error ? discardErr.message : String(discardErr) });
          }
        }
        this.updateTaskStatus(this.currentTaskId!, 'failed');
        this.emitTaskStatus('failed');
        this.setStep('failed');
        return capsule;
      }

      this.setStep('collecting_evidence');
      this.setStep('generating_review');
      const evidence = this.pipeline.getEvidenceStack(this.currentTaskId);
      const changedFileEvents = this.agentRuntime.getBlackboard().getEvents(this.currentTaskId)
        .filter((e) => e.type === 'code_modified')
        .flatMap((e) => (e.data.files as string[]) || []);
      const actualImpactMap = changedFileEvents.length > 0
        ? this._guardEngine.computeActualImpact(this.currentTaskId, changedFileEvents)
        : undefined;
      const packet = generatePacket(
        this.currentTaskId, capsule, impactAnalysis, evidence,
        [], [],
        actualImpactMap, this._guardEngine,
      );

      this.setStep('checking_safe_apply');
    const checks = runSafeApplyChecks(this.currentTaskId, packet);

    if (this.isIsolated.get(this.currentTaskId!) && this.worktreeManager && this.projectPath) {
      try {
        await this.worktreeManager.mergeWorktree(this.projectPath, this.currentTaskId!);
        this.emitEvent('worktree_merged', { taskId: this.currentTaskId });
      } catch (mergeErr) {
        this.emitEvent('worktree_error', { taskId: this.currentTaskId, error: mergeErr instanceof Error ? mergeErr.message : String(mergeErr) });
      }
    }

    this.impactRepo.insert(impactAnalysis);

    this.updateTaskStatus(this.currentTaskId!, 'reviewing');
      this.emitTaskStatus('reviewing');
      this.emitEvent('review_ready', { packet, checks });

      this.setStep('completed');
      return capsule;
    }

    if (classification.complexity === 'strict') {
      this.emitTaskStatus('planning');
      this.setStep('analyzing_impact');
      this.setStep('compiling_capsule');
      const capsule = this.capsuleCompiler.compileTask(goal);
      capsule.id = this.currentTaskId!;
      capsule.status = 'planning';
      this.taskRepo.insert(capsule);

      this.setStep('awaiting_confirmation');
      this.emitEvent('plan_ready', { capsule, classification });
      return capsule;
    }

    this.emitTaskStatus('planning');
    this.setStep('analyzing_impact');
    this.setStep('compiling_capsule');
    const capsule = this.capsuleCompiler.compileTask(goal);
    capsule.id = this.currentTaskId!;
    capsule.status = 'planning';
    this.taskRepo.insert(capsule);

    this.setStep('awaiting_confirmation');
    this.emitEvent('plan_ready', { capsule });

    return capsule;
  }

  async confirmAndExecute(taskId: string): Promise<void> {
    this.currentTaskId = taskId;
    const capsule = this.taskRepo.findById(taskId);
    if (!capsule) throw new Error(`Task ${taskId} not found`);

    this.updateTaskStatus(taskId, 'executing');
    this.emitTaskStatus('executing');

    this.setStep('analyzing_impact');
    const target = {
      module: capsule.affectedModules[0]?.name || capsule.writable[0] || '',
      files: capsule.writable,
    };
    const impactAnalysis = this._guardEngine.analyzeImpact(taskId, target, this.taskClassifications.get(taskId)?.strategy);

    this.setStep('creating_leases');
    this._leaseManager.createLease(
      taskId,
      taskId,
      'coder',
      { writable: capsule.writable, readonly: capsule.readonly, forbidden: capsule.forbidden, mustPreserve: capsule.mustPreserve },
    );

    if (this.worktreeManager && this.projectPath) {
      try {
        const worktreePath = await this.worktreeManager.createForTask(this.projectPath, taskId);
        this.isIsolated.set(taskId, true);
        this.emitEvent('worktree_created', { taskId, path: worktreePath });
      } catch (err) {
        this.isIsolated.set(taskId, false);
        this.emitEvent('worktree_error', { taskId, error: err instanceof Error ? err.message : String(err) });
      }
    } else {
      this.isIsolated.set(taskId, false);
    }

    this.setStep('executing_agents');
    try {
      await this.agentRuntime.startTask(capsule);
    } catch (err) {
      if (this.isIsolated.get(taskId) && this.worktreeManager && this.projectPath) {
        try {
          await this.worktreeManager.discardWorktree(this.projectPath, taskId);
          this.emitEvent('worktree_discarded', { taskId });
        } catch (discardErr) {
          this.emitEvent('worktree_error', { taskId, error: discardErr instanceof Error ? discardErr.message : String(discardErr) });
        }
      }
      this.updateTaskStatus(taskId, 'failed');
      this.emitTaskStatus('failed');
      this.setStep('failed');
      return;
    }

    this.setStep('collecting_evidence');

    this.setStep('generating_review');
    const evidence = this.pipeline.getEvidenceStack(taskId);
    const changedFileEvents = this.agentRuntime.getBlackboard().getEvents(taskId)
      .filter((e) => e.type === 'code_modified')
      .flatMap((e) => (e.data.files as string[]) || []);
    const actualImpactMap = changedFileEvents.length > 0
      ? this._guardEngine.computeActualImpact(taskId, changedFileEvents)
      : undefined;
    const packet = generatePacket(
      taskId, capsule, impactAnalysis, evidence,
      [], [],
      actualImpactMap, this._guardEngine,
    );

    this.setStep('checking_safe_apply');
    const checks = runSafeApplyChecks(taskId, packet);

    if (this.isIsolated.get(taskId) && this.worktreeManager && this.projectPath) {
      try {
        await this.worktreeManager.mergeWorktree(this.projectPath, taskId);
        this.emitEvent('worktree_merged', { taskId });
      } catch (mergeErr) {
        this.emitEvent('worktree_error', { taskId, error: mergeErr instanceof Error ? mergeErr.message : String(mergeErr) });
      }
    }

    this.updateTaskStatus(taskId, 'reviewing');
    this.emitTaskStatus('reviewing');
    this.emitEvent('review_ready', { packet, checks });

    this.setStep('completed');
  }

  async completeTask(taskId: string, action: 'apply' | 'discard'): Promise<void> {
    if (this.worktreeManager && this.projectPath) {
      try {
        if (action === 'apply') {
          await this.worktreeManager.mergeWorktree(this.projectPath, taskId);
        } else {
          await this.worktreeManager.discardWorktree(this.projectPath, taskId);
        }
      } catch (err) {
        this.emitEvent('worktree_error', { taskId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (action === 'apply') {
      this.updateTaskStatus(taskId, 'completed');
      this.emitTaskStatus('completed');
    } else {
      this.updateTaskStatus(taskId, 'cancelled');
      this.emitTaskStatus('cancelled');
    }
    this.currentTaskId = null;
    this.setStep('completed');
  }

  getCurrentStep(): WorkflowStep { return this.currentStep; }
  getCurrentTaskId(): string | null { return this.currentTaskId; }

  getTaskClassification(taskId: string): TaskClassification | undefined {
    return this.taskClassifications.get(taskId);
  }

  private setStep(step: WorkflowStep): void {
    this.currentStep = step;
    this.emitEvent('workflow_step', { step, taskId: this.currentTaskId });
  }

  private updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.taskRepo.updateStatus(taskId, status);
  }

  private emitTaskStatus(status: TaskStatus): void {
    this.emitEvent('task_status_change', { taskId: this.currentTaskId, status });
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(EVENT_CHANNELS.TASK_STATUS_CHANGE, {
        type, ...data, timestamp: new Date().toISOString()
      });
    }
  }
}
