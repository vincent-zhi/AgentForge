import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { CONTRACT_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';
import type { GraphEngine } from '../contract-graph/graph-engine';

interface ContractViolation {
  contractId: string;
  name: string;
  type: string;
  reason: string;
  consumers: string[];
  compatibility: string;
}

interface ContractCheckResult {
  violations: ContractViolation[];
  compatible: boolean;
  checkedContracts: number;
  mustPreserveCount: number;
}

export class ContractAgent extends BaseAgent {
  private graphEngine: GraphEngine | null = null;

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'contract', taskId, blackboard, leaseManager);
  }

  setGraphEngine(engine: GraphEngine): void {
    this.graphEngine = engine;
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'contract' });

    const result = await this.checkContracts();

    if (result.violations.length > 0) {
      this.publishEvent('contract_risk_found', { violations: result.violations });
    }

    this.publishEvent('contract_checked', {
      violations: result.violations,
      compatible: result.compatible,
      checkedContracts: result.checkedContracts,
      mustPreserveCount: result.mustPreserveCount,
    });
    this.logAction('check_contracts', 'contract_graph');
  }

  private async checkContracts(): Promise<ContractCheckResult> {
    const result: ContractCheckResult = {
      violations: [],
      compatible: true,
      checkedContracts: 0,
      mustPreserveCount: 0,
    };

    const targetFiles = this.getTargetFiles();
    const specConstraints = this.getSpecConstraints();

    if (this.graphEngine) {
      const allContracts = this.graphEngine.getAllContracts();
      result.checkedContracts = allContracts.length;

      for (const contract of allContracts) {
        if (contract.compatibility === 'must_preserve') {
          result.mustPreserveCount++;
        }

        const isTargeted = targetFiles.some((f) =>
          contract.consumers.some((c) => c.includes(f)) ||
          contract.provider.includes(f)
        );

        if (isTargeted && contract.compatibility === 'must_preserve') {
          result.violations.push({
            contractId: contract.id,
            name: contract.name,
            type: contract.type,
            reason: `Must-preserve contract '${contract.name}' is touched by the proposed changes`,
            consumers: contract.consumers,
            compatibility: contract.compatibility,
          });
        }
      }
    }

    for (const constraint of specConstraints) {
      result.violations.push({
        contractId: `spec_${constraint}`,
        name: constraint,
        type: 'behavior',
        reason: `Task capsule specifies must-preserve constraint: ${constraint}`,
        consumers: [],
        compatibility: 'must_preserve',
      });
    }

    if (this.modelGateway && (result.violations.length > 0 || targetFiles.length > 0)) {
      const llmViolations = await this.enhanceWithLLM(targetFiles, result.violations);
      for (const v of llmViolations) {
        if (!result.violations.some((existing) => existing.name === v.name)) {
          result.violations.push(v);
        }
      }
    }

    result.compatible = result.violations.length === 0;
    return result;
  }

  private getTargetFiles(): string[] {
    const events = this.blackboard.getEvents(this.taskId);
    const impactEvent = events.find((e) => e.type === 'impact_map_generated');
    const impactData = impactEvent?.data as { impactMap?: { target?: { files?: string[] } } } | undefined;
    if (impactData?.impactMap?.target?.files) {
      return impactData.impactMap.target.files;
    }
    const specEvent = events.find((e) => e.type === 'spec_generated');
    const specData = specEvent?.data as { spec?: { affectedModules?: Array<{ path: string }> } } | undefined;
    if (specData?.spec?.affectedModules) {
      return specData.spec.affectedModules.map((m) => m.path);
    }
    return [];
  }

  private getSpecConstraints(): string[] {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    const specData = specEvent?.data as { spec?: { constraints?: string[] } } | undefined;
    if (specData?.spec?.constraints) {
      return specData.spec.constraints.filter((c) =>
        c.toLowerCase().includes('preserve') || c.toLowerCase().includes('must') || c.toLowerCase().includes('contract')
      );
    }
    return [];
  }

  private async enhanceWithLLM(targetFiles: string[], knownViolations: ContractViolation[]): Promise<ContractViolation[]> {
    const messages: ChatMessage[] = [
      { role: 'system', content: CONTRACT_PROMPT },
      { role: 'user', content: `Target files: ${JSON.stringify(targetFiles)}\n\nKnown violations: ${JSON.stringify(knownViolations.map((v) => v.name))}\n\nAnalyze if any additional contracts (API signatures, type definitions, behavioral invariants, data schemas) would be violated by changes to these files. Respond with a JSON array of violations, each with: name, type, reason.` },
    ];

    try {
      const response = await this.modelGateway!.chat(messages);
      return this.parseViolations(response.content);
    } catch {
      return [];
    }
  }

  private parseViolations(content: string): ContractViolation[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((v) => v.name && v.reason)
        .map((v) => ({
          contractId: v.contractId || `llm_${v.name}`,
          name: String(v.name),
          type: String(v.type || 'behavior'),
          reason: String(v.reason),
          consumers: Array.isArray(v.consumers) ? v.consumers.map(String) : [],
          compatibility: String(v.compatibility || 'must_preserve'),
        }));
    } catch {
      return [];
    }
  }
}
