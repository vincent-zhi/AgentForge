import type { ReviewPacket, VerificationResult, RiskAssessment, UnverifiedItem, MemoryUpdateProposal, ChangedFile, ImpactMap, SuggestedPr } from '@/types/core';
import { TaskCapsuleRepository } from '../../db/repositories/task-capsule-repo';
import { ImpactMapRepository } from '../../db/repositories/impact-map-repo';
import { FactGovernor } from '../memory-governance/fact-governor';
import { GuardEngine } from '../impact-guard/guard-engine';
import { AuditLogger } from '../security/audit-logger';
import { isHighRiskPath, isSensitivePath } from '../security/file-guard';

export class TaskDeliverWorkflow {
  private capsuleRepo: TaskCapsuleRepository;
  private impactMapRepo: ImpactMapRepository;
  private factGovernor: FactGovernor;
  private guardEngine: GuardEngine;
  private auditLogger: AuditLogger;

  constructor(guardEngine?: GuardEngine, factGovernor?: FactGovernor, auditLogger?: AuditLogger) {
    this.capsuleRepo = new TaskCapsuleRepository();
    this.impactMapRepo = new ImpactMapRepository();
    this.guardEngine = guardEngine || new GuardEngine();
    this.factGovernor = factGovernor || new FactGovernor();
    this.auditLogger = auditLogger || new AuditLogger();
  }

  async deliverTask(taskId: string): Promise<ReviewPacket> {
    const capsule = this.capsuleRepo.findById(taskId);
    if (!capsule) {
      throw new Error(`Task capsule not found: ${taskId}`);
    }

    const impactMap = this.generateReviewPacket(taskId);

    const safeApplyResult = this.runSafeApplyChecks(taskId, impactMap);

    const memoryUpdates = this.generateMemoryUpdateProposals(taskId);

    const suggestedPr = this.generatePrSuggestion(capsule.goal, impactMap);

    const verification = this.collectVerificationResults(impactMap);
    const risks = this.collectRisks(impactMap);
    const unverifiedItems = this.collectUnverifiedItems(impactMap);

    const reviewPacket: ReviewPacket = {
      taskId,
      result: this.determineResult(verification, safeApplyResult),
      changedFiles: this.extractChangedFiles(impactMap),
      intentDiff: [],
      impactMap,
      verification,
      risks,
      reviewerFocus: impactMap.reviewFocus,
      unverifiedItems,
      memoryUpdates,
      suggestedPr,
      isOutOfScope: safeApplyResult.outOfScope,
      hasBreakingChange: safeApplyResult.hasBreakingChange,
    };

    this.capsuleRepo.updateStatus(taskId, 'completed');
    this.auditLogger.logAccess('system', 'task_delivered', taskId, {
      result: reviewPacket.result,
      hasBreakingChange: reviewPacket.hasBreakingChange,
    });

    return reviewPacket;
  }

  private generateReviewPacket(taskId: string): ImpactMap {
    const impactMap = this.impactMapRepo.findByTaskId(taskId);
    if (!impactMap) {
      return {
        taskId,
        target: { module: '', files: [] },
        upstreamDependencies: [],
        downstreamDependents: [],
        contractsTouched: [],
        affectedTests: [],
        forbiddenChanges: [],
        risk: { level: 'low', reasons: [] },
        reviewFocus: [],
        plannedImpactHash: '',
      };
    }
    return impactMap;
  }

  private runSafeApplyChecks(taskId: string, impactMap: ImpactMap): { outOfScope: boolean; hasBreakingChange: boolean } {
    let hasBreakingChange = false;
    let outOfScope = false;

    const comparison = this.guardEngine.comparePlannedVsActual(taskId);
    if (!comparison.match) {
      hasBreakingChange = true;
    }

    for (const contract of impactMap.contractsTouched) {
      if (contract.compatibility === 'must_preserve') {
        hasBreakingChange = true;
      }
    }

    for (const file of impactMap.target.files) {
      if (isSensitivePath(file) || isHighRiskPath(file)) {
        outOfScope = true;
      }
    }

    this.auditLogger.logAccess('system', 'safe_apply_check', taskId, {
      outOfScope,
      hasBreakingChange,
    });

    return { outOfScope, hasBreakingChange };
  }

  private generateMemoryUpdateProposals(taskId: string): MemoryUpdateProposal[] {
    return this.factGovernor.generateMemoryUpdateProposal(taskId);
  }

  private generatePrSuggestion(goal: string, impactMap: ImpactMap): SuggestedPr {
    const labels: string[] = [];
    if (impactMap.risk.level === 'critical' || impactMap.risk.level === 'high') {
      labels.push('high-risk');
    }
    if (impactMap.contractsTouched.length > 0) {
      labels.push('contract-change');
    }

    const reviewers: string[] = [];
    if (impactMap.risk.level === 'critical') {
      reviewers.push('tech-lead');
    }
    if (impactMap.contractsTouched.some((c) => c.compatibility === 'must_preserve')) {
      reviewers.push('architect');
    }

    return {
      title: goal.length > 72 ? goal.slice(0, 69) + '...' : goal,
      body: `## Task\n${goal}\n\n## Impact\n- Risk level: ${impactMap.risk.level}\n- Downstream dependents: ${impactMap.downstreamDependents.length}\n- Contracts touched: ${impactMap.contractsTouched.length}\n- Affected tests: ${impactMap.affectedTests.length}\n\n## Review Focus\n${impactMap.reviewFocus.map((f) => `- ${f}`).join('\n')}`,
      labels,
      reviewers,
    };
  }

  private collectVerificationResults(impactMap: ImpactMap): VerificationResult[] {
    const results: VerificationResult[] = [];

    for (const test of impactMap.affectedTests) {
      results.push({
        type: 'test',
        name: test.command,
        passed: false,
        details: 'Pending execution',
      });
    }

    for (const contract of impactMap.contractsTouched) {
      results.push({
        type: 'contract',
        name: contract.name,
        passed: contract.compatibility !== 'must_preserve',
        details: `Compatibility: ${contract.compatibility}`,
      });
    }

    return results;
  }

  private collectRisks(impactMap: ImpactMap): RiskAssessment[] {
    const risks: RiskAssessment[] = [impactMap.risk];

    for (const contract of impactMap.contractsTouched) {
      if (contract.compatibility === 'must_preserve') {
        risks.push({
          level: 'critical',
          reasons: [`Must-preserve contract "${contract.name}" is affected`],
        });
      }
    }

    return risks;
  }

  private collectUnverifiedItems(impactMap: ImpactMap): UnverifiedItem[] {
    const items: UnverifiedItem[] = [];

    for (const test of impactMap.affectedTests) {
      items.push({
        type: 'test',
        description: `Test: ${test.command}`,
        risk: 'medium',
      });
    }

    for (const contract of impactMap.contractsTouched) {
      if (contract.compatibility === 'must_preserve') {
        items.push({
          type: 'contract',
          description: `Contract: ${contract.name}`,
          risk: 'high',
        });
      }
    }

    return items;
  }

  private extractChangedFiles(impactMap: ImpactMap): ChangedFile[] {
    return impactMap.target.files.map((file) => ({
      path: file,
      intent: 'business_fix',
      additions: 0,
      deletions: 0,
    }));
  }

  private determineResult(verification: VerificationResult[], safeApply: { outOfScope: boolean; hasBreakingChange: boolean }): 'success' | 'partial' | 'failed' {
    if (safeApply.outOfScope) return 'failed';
    if (safeApply.hasBreakingChange) return 'partial';

    const allPassed = verification.every((v) => v.passed);
    if (allPassed) return 'success';

    const anyPassed = verification.some((v) => v.passed);
    if (anyPassed) return 'partial';

    return 'failed';
  }
}
