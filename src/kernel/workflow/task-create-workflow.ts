import type { TaskCapsule, ImpactMap } from '@/types/core';
import { CapsuleCompiler } from '../task-capsule/capsule-compiler';
import { GuardEngine } from '../impact-guard/guard-engine';
import { BrainService } from '../project-brain/brain-service';
import { ImpactMapRepository } from '../../db/repositories/impact-map-repo';

export class TaskCreateWorkflow {
  private capsuleCompiler: CapsuleCompiler;
  private guardEngine: GuardEngine;
  private brainService: BrainService;
  private impactMapRepo: ImpactMapRepository;

  constructor(capsuleCompiler?: CapsuleCompiler, guardEngine?: GuardEngine, brainService?: BrainService) {
    this.brainService = brainService || new BrainService();
    this.guardEngine = guardEngine || new GuardEngine();
    this.capsuleCompiler = capsuleCompiler || new CapsuleCompiler();
    this.impactMapRepo = new ImpactMapRepository();

    this.capsuleCompiler.setGuardEngine(this.guardEngine);
    this.capsuleCompiler.setBrainService(this.brainService);

    const scanResult = this.brainService.getScanResult();
    if (scanResult) {
      this.guardEngine.setDependencyGraph(this.brainService.getDependencyGraph() || new Map());
      this.guardEngine.setTestMapping(scanResult.testCommands);
    }
  }

  async createTask(goal: string): Promise<TaskCapsule> {
    const parsed = this.parseRequirement(goal);

    const impactMap = this.analyzeImpact(parsed.targetModules, goal);

    const capsule = this.compileTaskCapsule(goal, parsed, impactMap);

    this.generateImpactMap(capsule, impactMap);

    return capsule;
  }

  private parseRequirement(goal: string): { parsedGoal: string; targetModules: string[]; keywords: string[] } {
    const keywords = goal.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];

    const scanResult = this.brainService.getScanResult();
    const targetModules: string[] = [];

    if (scanResult) {
      for (const mod of scanResult.modules) {
        const modLower = mod.name.toLowerCase();
        for (const kw of uniqueKeywords) {
          if (modLower.includes(kw) && !targetModules.includes(mod.name)) {
            targetModules.push(mod.name);
          }
        }
      }
    }

    return {
      parsedGoal: goal.trim(),
      targetModules,
      keywords: uniqueKeywords,
    };
  }

  private analyzeImpact(targetModules: string[], _goal: string): ImpactMap | null {
    if (targetModules.length === 0) return null;

    const targetModule = targetModules[0];
    return this.guardEngine.analyzeImpact(`task-${Date.now()}`, {
      module: targetModule,
      files: targetModules,
    });
  }

  private compileTaskCapsule(goal: string, _parsed: { parsedGoal: string; targetModules: string[]; keywords: string[] }, _impactMap: ImpactMap | null): TaskCapsule {
    return this.capsuleCompiler.compileTask(goal);
  }

  private generateImpactMap(capsule: TaskCapsule, impactMap: ImpactMap | null): void {
    if (impactMap) {
      const storedMap: ImpactMap = {
        ...impactMap,
        taskId: capsule.id,
      };
      this.impactMapRepo.insert(storedMap);
    }
  }
}
