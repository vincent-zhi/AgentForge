import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import type { ContextLease } from '@/types/core';

interface ContextLeasePanelProps {
  leases: ContextLease[];
}

const roleVariant: Record<string, 'ember' | 'brain' | 'analyzing' | 'partial' | 'unverified' | 'verified' | 'blocked'> = {
  orchestrator: 'ember',
  architect: 'brain',
  impact: 'analyzing',
  contract: 'partial',
  search: 'unverified',
  coder: 'verified',
  tester: 'partial',
  reviewer: 'blocked',
  doc: 'unverified',
};

const statusVariant: Record<string, 'verified' | 'unverified' | 'blocked'> = {
  active: 'verified',
  expired: 'unverified',
  revoked: 'blocked',
};

const ContextLeasePanel: React.FC<ContextLeasePanelProps> = React.memo(({ leases }) => {
  if (leases.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No active leases. Leases are created when agents are assigned to tasks.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leases.map((lease) => (
        <div key={lease.id} className="px-2 py-1.5 rounded-sm bg-forge-black/50">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={roleVariant[lease.agentRole] ?? 'default'} label={lease.agentRole} />
            <Badge variant={statusVariant[lease.status]} label={lease.status} />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-forged-steel">
            <span>Read: {lease.canRead.length}</span>
            <span>Write: {lease.canWrite.length}</span>
          </div>
          {lease.tools.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {lease.tools.map((tool) => (
                <Chip key={tool} label={tool} size="sm" variant="default" />
              ))}
            </div>
          )}
          {lease.requiresApprovalFor.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {lease.requiresApprovalFor.map((item, i) => (
                <div key={i} className="text-[10px] text-warning-amber flex items-center gap-1">
                  ⚠️ {item}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

ContextLeasePanel.displayName = 'ContextLeasePanel';

export { ContextLeasePanel };
