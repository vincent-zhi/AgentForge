import type { ImpactMap, ChangeTarget, ModuleRef, ContractRef, TestCommand, RiskLevel } from '@/types/core';
import { ImpactMapRepository } from '../../db/repositories/impact-map-repo';
import { calculateImpact } from './impact-calculator';
import { assessRisk } from './risk-assessor';
import { recommendTests } from './test-recommender';
import type { ProjectPolicy } from '../security/policy-manager';
import { LRUCache } from '../cache/lru-cache';

export class GuardEngine {
  private impactMapRepo: ImpactMapRepository;
  private dependencyGraph: Map<string, string[]> = new Map();
  private contracts: ContractRef[] = [];
  private riskMarkers: Map<string, RiskLevel> = new Map();
  private testMapping: TestCommand[] = [];
  private impactMaps: Map<string, ImpactMap> = new Map();
  private policy: ProjectPolicy | null = null;
  private impactCache: LRUCache<string, ImpactMap> = new LRUCache(30, 3 * 60 * 1000);

  constructor(impactMapRepo?: ImpactMapRepository) {
    this.impactMapRepo = impactMapRepo || new ImpactMapRepository();
  }

  setPolicy(policy: ProjectPolicy): void {
    this.policy = policy;
  }

  setDependencyGraph(graph: Map<string, string[]>): void {
    this.dependencyGraph = graph;
  }

  setContracts(contracts: ContractRef[]): void {
    this.contracts = contracts;
  }

  setRiskMarkers(markers: Map<string, RiskLevel>): void {
    this.riskMarkers = markers;
  }

  setTestMapping(mapping: TestCommand[]): void {
    this.testMapping = mapping;
  }

  analyzeImpact(taskId: string, target: ChangeTarget): ImpactMap {
    const cacheKey = `${taskId}:${target.module}:${target.files.sort().join(',')}`;
    const cached = this.impactCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { upstream, downstream, contractsTouched } = calculateImpact(
      target.module,
      target.files,
      this.dependencyGraph,
      this.contracts
    );

    const risk = assessRisk(target, downstream, contractsTouched, this.riskMarkers);
    const affectedModules = [...upstream, ...downstream];
    const affectedTests = recommendTests(affectedModules, this.testMapping);

    const forbiddenChanges: string[] = [];
    for (const contract of contractsTouched) {
      if (contract.compatibility === 'must_preserve') {
        forbiddenChanges.push(`Contract "${contract.name}" must be preserved`);
      }
    }

    if (this.policy) {
      for (const file of target.files) {
        if (this.policy.forbiddenPatterns.some((pattern) => {
          if (pattern === file) return true;
          const regexStr = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{DOUBLESTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/{{DOUBLESTAR}}/g, '.*');
          try {
            return new RegExp(`^${regexStr}$`).test(file);
          } catch {
            return pattern === file;
          }
        })) {
          forbiddenChanges.push(`File "${file}" matches forbidden pattern in policy`);
        }
      }
      for (const riskPath of this.policy.riskPaths) {
        if (target.files.some((f) => f.startsWith(riskPath))) {
          forbiddenChanges.push(`File in risk path: ${riskPath}`);
        }
      }
    }

    const reviewFocus: string[] = [];
    if (risk.level === 'critical' || risk.level === 'high') {
      reviewFocus.push('Verify no breaking changes to public API');
      reviewFocus.push('Check all downstream consumers are tested');
    }
    if (contractsTouched.length > 0) {
      reviewFocus.push('Validate contract compatibility');
    }

    const impactMap: ImpactMap = {
      taskId,
      target,
      upstreamDependencies: upstream,
      downstreamDependents: downstream,
      contractsTouched,
      affectedTests,
      forbiddenChanges,
      risk,
      reviewFocus,
      plannedImpactHash: this.computeHash(target, downstream, contractsTouched),
    };

    this.impactMaps.set(taskId, impactMap);
    this.impactMapRepo.insert(impactMap);

    this.impactCache.set(cacheKey, impactMap);

    return impactMap;
  }

  getImpactMap(taskId: string): ImpactMap | null {
    return this.impactMaps.get(taskId) || this.impactMapRepo.findByTaskId(taskId);
  }

  comparePlannedVsActual(taskId: string): { match: boolean; differences: string[] } {
    const planned = this.impactMaps.get(taskId) || this.impactMapRepo.findByTaskId(taskId);
    if (!planned) {
      return { match: false, differences: ['No impact map found for task'] };
    }

    const differences: string[] = [];

    if (planned.actualImpactHash && planned.actualImpactHash !== planned.plannedImpactHash) {
      differences.push('Actual impact differs from planned impact');
    }

    if (!planned.actualImpactHash) {
      differences.push('Actual impact has not been recorded yet');
    }

    return {
      match: differences.length === 0,
      differences,
    };
  }

  private computeHash(target: ChangeTarget, downstream: ModuleRef[], contracts: ContractRef[]): string {
    const data = JSON.stringify({
      module: target.module,
      files: target.files.sort(),
      downstream: downstream.map((d) => d.name).sort(),
      contracts: contracts.map((c) => c.id).sort(),
    });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  invalidateCache(): void {
    this.impactCache.clear();
  }
}
