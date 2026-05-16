import { v4 as uuidv4 } from 'uuid';
import type { TaskCapsule, ReviewPolicy, ModuleInfo, ContractRef } from '@/types/core';
import { TaskCapsuleRepository } from '../../db/repositories/task-capsule-repo';
import { parseRequirementWithModules } from './requirement-parser';
import { deriveScope } from './scope-deriver';
import type { GuardEngine } from '../impact-guard/guard-engine';
import type { BrainService } from '../project-brain/brain-service';

export class CapsuleCompiler {
  private capsuleRepo: TaskCapsuleRepository;
  private guardEngine: GuardEngine | null = null;
  private brainService: BrainService | null = null;

  constructor(capsuleRepo?: TaskCapsuleRepository) {
    this.capsuleRepo = capsuleRepo || new TaskCapsuleRepository();
  }

  setGuardEngine(engine: GuardEngine): void {
    this.guardEngine = engine;
  }

  setBrainService(service: BrainService): void {
    this.brainService = service;
  }

  compileTask(goal: string): TaskCapsule {
    let modules: ModuleInfo[] = [];
    if (this.brainService) {
      const scanResult = this.brainService.getScanResult();
      if (scanResult) {
        modules = scanResult.modules;
      }
    }

    const parsed = parseRequirementWithModules(goal, modules);

    let impactMap = null;
    if (this.guardEngine && parsed.targetModules.length > 0) {
      const targetModule = parsed.targetModules[0];
      impactMap = this.guardEngine.analyzeImpact(uuidv4(), {
        module: targetModule,
        files: parsed.targetModules,
      });
    }

    const scope = impactMap
      ? deriveScope(parsed, impactMap, this.brainService)
      : { writable: parsed.targetModules, readonly: [] as string[], forbidden: [] as string[], mustPreserve: [] as ContractRef[] };

    const affectedModules = parsed.targetModules.map((name) => {
      const mod = modules.find((m) => m.name === name);
      return mod ? { name: mod.name, path: mod.path, type: mod.type as 'package' | 'directory' } : { name, path: name, type: 'directory' as const };
    });

    const requiredTests = impactMap ? impactMap.affectedTests : [];

    const riskLevel = impactMap ? impactMap.risk.level : 'low';
    const reviewPolicy: ReviewPolicy = {
      requireImpactGuard: true,
      requireAllTests: riskLevel === 'critical' || riskLevel === 'high',
      maxRiskLevel: riskLevel === 'critical' ? 'medium' : 'high',
      requireHumanApproval: riskLevel === 'critical',
    };

    const now = new Date().toISOString();
    const capsule: TaskCapsule = {
      id: uuidv4(),
      goal: parsed.parsedGoal,
      nonGoals: [],
      writable: scope.writable,
      readonly: scope.readonly,
      forbidden: scope.forbidden,
      mustPreserve: scope.mustPreserve,
      affectedModules,
      requiredTests,
      reviewPolicy,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.capsuleRepo.insert(capsule);
    return capsule;
  }
}
