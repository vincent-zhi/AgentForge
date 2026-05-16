import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ProjectFact, FactType, Confidence, FactStatus } from '@/types/core';

interface FactSearchProps {
  facts: ProjectFact[];
}

const typeBadgeVariant: Record<FactType, 'analyzing' | 'brain' | 'partial' | 'ember' | 'verified' | 'blocked' | 'default' | 'unverified'> = {
  module: 'analyzing',
  contract: 'partial',
  command: 'ember',
  risk: 'blocked',
  decision: 'brain',
  test: 'verified',
  api: 'default',
  schema: 'unverified',
};

const confidenceBadgeVariant: Record<Confidence, 'verified' | 'partial' | 'blocked'> = {
  high: 'verified',
  medium: 'partial',
  low: 'blocked',
};

const statusBadgeVariant: Record<FactStatus, 'verified' | 'partial' | 'blocked' | 'unverified' | 'ember'> = {
  active: 'verified',
  candidate: 'partial',
  stale: 'unverified',
  rejected: 'blocked',
  replaced: 'ember',
};

const FactSearch: React.FC<FactSearchProps> = React.memo(({ facts }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return facts.filter(
      (f) =>
        f.statement.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [facts, query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search facts..."
        className="input-field text-sm"
      />
      {query.trim() && results.length === 0 && (
        <div className="text-xs text-forged-steel text-center py-4">
          No facts matching "{query}"
        </div>
      )}
      <div className="space-y-1.5">
        {results.map((fact) => (
          <div
            key={fact.id}
            className="px-2 py-1.5 rounded-sm bg-forge-black/50 hover:bg-forge-black/80 transition-colors duration-fast"
          >
            <p className="text-sm text-bright-steel truncate">{fact.statement}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={typeBadgeVariant[fact.type]} label={fact.type} />
              <Badge variant={confidenceBadgeVariant[fact.confidence]} label={fact.confidence} />
              <Badge variant={statusBadgeVariant[fact.status]} label={fact.status} />
            </div>
          </div>
        ))}
      </div>
      {!query.trim() && (
        <div className="text-xs text-forged-steel text-center py-4">
          Type to search across {facts.length} facts
        </div>
      )}
    </div>
  );
});

FactSearch.displayName = 'FactSearch';

export { FactSearch };
