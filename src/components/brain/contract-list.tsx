import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContractLockIcon } from '@/components/ui/contract-lock-icon';
import type { ContractRef, ContractType } from '@/types/core';

interface ContractListProps {
  contracts: ContractRef[];
}

const typeOrder: ContractType[] = ['api', 'type', 'behavior', 'ui', 'data'];

const typeLabels: Record<ContractType, string> = {
  api: 'API',
  type: 'Type',
  behavior: 'Behavior',
  ui: 'UI',
  data: 'Data',
};

const typeBadgeVariant: Record<ContractType, 'analyzing' | 'brain' | 'partial' | 'ember' | 'default'> = {
  api: 'analyzing',
  type: 'brain',
  behavior: 'partial',
  ui: 'ember',
  data: 'default',
};

const compatBadgeVariant: Record<string, 'blocked' | 'partial' | 'verified'> = {
  must_preserve: 'blocked',
  should_preserve: 'partial',
  flexible: 'verified',
};

const compatLabels: Record<string, string> = {
  must_preserve: 'Must Preserve',
  should_preserve: 'Should Preserve',
  flexible: 'Flexible',
};

const ContractList: React.FC<ContractListProps> = React.memo(({ contracts }) => {
  const grouped = useMemo(() => {
    const groups = new Map<ContractType, ContractRef[]>();
    for (const type of typeOrder) {
      groups.set(type, []);
    }
    for (const c of contracts) {
      const list = groups.get(c.type) ?? [];
      list.push(c);
      groups.set(c.type, list);
    }
    return groups;
  }, [contracts]);

  if (contracts.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-6">
        No contracts found. Contracts are discovered during project scan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {typeOrder.map((type) => {
        const items = grouped.get(type) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={typeBadgeVariant[type]} label={typeLabels[type]} />
              <span className="text-xs text-forged-steel">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-forge-black/50 hover:bg-forge-black/80 transition-colors duration-fast"
                >
                  <ContractLockIcon isLocked={c.compatibility === 'must_preserve'} contractType={c.compatibility} />
                  <span className="text-sm text-bright-steel flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] text-forged-steel truncate max-w-[80px]">{c.provider}</span>
                  <Badge variant="default" label={`${c.consumers.length}`} />
                  <Badge variant={compatBadgeVariant[c.compatibility]} label={compatLabels[c.compatibility]} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

ContractList.displayName = 'ContractList';

export { ContractList };
