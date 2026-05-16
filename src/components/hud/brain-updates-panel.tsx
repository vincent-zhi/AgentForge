import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { MemoryUpdateProposal } from '@/types/core';

interface BrainUpdatesPanelProps {
  updates: MemoryUpdateProposal[];
}

const actionVariant: Record<string, 'verified' | 'partial' | 'unverified' | 'blocked'> = {
  create: 'verified',
  update: 'partial',
  stale: 'unverified',
  reject: 'blocked',
};

const BrainUpdatesPanel: React.FC<BrainUpdatesPanelProps> = React.memo(({ updates }) => {
  if (updates.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No memory updates proposed. Updates appear after task execution.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {updates.map((u, i) => (
        <div key={u.factId ?? i} className="px-2 py-1.5 rounded-sm bg-forge-black/50">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant={actionVariant[u.action]} label={u.action} />
            <span className="text-xs text-bright-steel truncate flex-1">
              {u.fact.statement ?? 'New fact'}
            </span>
          </div>
          <div className="text-[10px] text-forged-steel pl-2">{u.reason}</div>
        </div>
      ))}
    </div>
  );
});

BrainUpdatesPanel.displayName = 'BrainUpdatesPanel';

export { BrainUpdatesPanel };
