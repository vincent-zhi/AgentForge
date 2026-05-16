import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';

export class ContractAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'contract', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'contract' });

    const violations: Array<{ contractId: string; name: string; reason: string }> = [];

    if (violations.length > 0) {
      this.publishEvent('contract_risk_found', { violations });
    }

    this.publishEvent('contract_checked', { violations, compatible: violations.length === 0 });
    this.logAction('check_contracts', 'contract_graph');
  }
}
