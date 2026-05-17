import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { StaleFactBadge } from '@/components/ui/stale-fact-badge';
import { useProjectStore } from '@/store/project-store';
import { bridge } from '@/ipc/bridge';
import type { FactType, Confidence, FactStatus, ProjectFact } from '@/types/core';

const FACT_TYPES: FactType[] = ['module', 'contract', 'command', 'risk', 'decision', 'test', 'api', 'schema'];
const CONFIDENCE_LEVELS: Confidence[] = ['high', 'medium', 'low'];
const FACT_STATUSES: FactStatus[] = ['candidate', 'active', 'stale', 'rejected', 'replaced'];

const typeBadgeVariant: Record<FactType, 'analyzing' | 'brain' | 'verified' | 'blocked' | 'partial' | 'ember' | 'default' | 'unverified'> = {
  module: 'analyzing',
  contract: 'brain',
  command: 'ember',
  risk: 'blocked',
  decision: 'brain',
  test: 'verified',
  api: 'partial',
  schema: 'default',
};

const confidenceBadgeVariant: Record<Confidence, 'verified' | 'partial' | 'blocked'> = {
  high: 'verified',
  medium: 'partial',
  low: 'blocked',
};

const confidenceNumeric: Record<Confidence, number> = {
  high: 85,
  medium: 55,
  low: 25,
};

const statusBadgeVariant: Record<FactStatus, 'verified' | 'partial' | 'blocked' | 'unverified' | 'default' | 'analyzing' | 'stale'> = {
  candidate: 'analyzing',
  active: 'verified',
  stale: 'stale',
  rejected: 'blocked',
  replaced: 'default',
};

const MemoryPanel: React.FC = React.memo(() => {
  const facts = useProjectStore((s) => s.facts);
  const updateFact = useProjectStore((s) => s.updateFact);
  const [typeFilter, setTypeFilter] = useState<FactType | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FactStatus | 'all'>('all');
  const [revertTaskId, setRevertTaskId] = useState('');

  const filteredFacts = useMemo(() => {
    return facts.filter((f) => {
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (confidenceFilter !== 'all' && f.confidence !== confidenceFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      return true;
    });
  }, [facts, typeFilter, confidenceFilter, statusFilter]);

  const handleAccept = useCallback(async (factId: string) => {
    try {
      await bridge.project.updateFactStatus(factId, 'active');
      updateFact(factId, { status: 'active', updatedAt: new Date().toISOString() });
    } catch {}
  }, [updateFact]);

  const handleReject = useCallback(async (factId: string) => {
    try {
      await bridge.project.updateFactStatus(factId, 'rejected');
      updateFact(factId, { status: 'rejected', updatedAt: new Date().toISOString() });
    } catch {}
  }, [updateFact]);

  const handleMarkStale = useCallback(async (factId: string) => {
    try {
      await bridge.project.updateFactStatus(factId, 'stale');
      updateFact(factId, { status: 'stale', updatedAt: new Date().toISOString() });
    } catch {}
  }, [updateFact]);

  const handleRefresh = useCallback(async (factId: string) => {
    try {
      await bridge.project.refreshFact(factId);
      updateFact(factId, { status: 'active', updatedAt: new Date().toISOString() });
    } catch {}
  }, [updateFact]);

  const handleRevertTaskUpdates = useCallback(async () => {
    if (!revertTaskId.trim()) return;
    try {
      await bridge.brain.revertTaskUpdates(revertTaskId.trim());
      setRevertTaskId('');
    } catch {}
  }, [revertTaskId]);

  const renderActions = (fact: ProjectFact) => {
    switch (fact.status) {
      case 'candidate':
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAccept(fact.id)}
              className="px-2 py-0.5 text-xs rounded-sm bg-ember-orange/20 text-ember-orange hover:bg-ember-orange/30 transition-colors duration-fast"
            >
              Accept
            </button>
            <button
              onClick={() => handleReject(fact.id)}
              className="px-2 py-0.5 text-xs rounded-sm bg-forged-steel/20 text-forged-steel hover:bg-forged-steel/30 transition-colors duration-fast"
            >
              Reject
            </button>
          </div>
        );
      case 'stale':
        return (
          <button
            onClick={() => handleRefresh(fact.id)}
            className="px-2 py-0.5 text-xs rounded-sm bg-ember-orange/20 text-ember-orange hover:bg-ember-orange/30 transition-colors duration-fast"
          >
            Refresh
          </button>
        );
      case 'active':
        return (
          <button
            onClick={() => handleMarkStale(fact.id)}
            className="px-2 py-0.5 text-xs rounded-sm bg-forged-steel/20 text-forged-steel hover:bg-forged-steel/30 transition-colors duration-fast"
          >
            Mark Stale
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FactType | 'all')}
          className="bg-graphite text-bright-steel text-xs rounded-sm px-2 py-1 border border-forged-steel/20 focus:outline-none focus:border-ember-orange"
        >
          <option value="all">All Types</option>
          {FACT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value as Confidence | 'all')}
          className="bg-graphite text-bright-steel text-xs rounded-sm px-2 py-1 border border-forged-steel/20 focus:outline-none focus:border-ember-orange"
        >
          <option value="all">All Confidence</option>
          {CONFIDENCE_LEVELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FactStatus | 'all')}
          className="bg-graphite text-bright-steel text-xs rounded-sm px-2 py-1 border border-forged-steel/20 focus:outline-none focus:border-ember-orange"
        >
          <option value="all">All Status</option>
          {FACT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 ml-2">
          <input
            type="text"
            value={revertTaskId}
            onChange={(e) => setRevertTaskId(e.target.value)}
            placeholder="Task ID"
            className="bg-graphite text-bright-steel text-xs rounded-sm px-2 py-1 border border-forged-steel/20 focus:outline-none focus:border-ember-orange w-28"
          />
          <button
            onClick={handleRevertTaskUpdates}
            className="px-2 py-0.5 text-xs rounded-sm bg-forged-steel/20 text-forged-steel hover:bg-forged-steel/30 transition-colors duration-fast"
          >
            Revert Task Updates
          </button>
        </div>
        <span className="text-xs text-forged-steel ml-auto">
          {filteredFacts.length} fact{filteredFacts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex-1 overflow-auto space-y-1.5">
        {filteredFacts.length === 0 ? (
          <div className="text-xs text-forged-steel text-center py-6">
            No facts match the current filters.
          </div>
        ) : (
          filteredFacts.map((f) => (
            <div
              key={f.id}
              className="px-2 py-1.5 rounded-sm bg-forge-black/50 hover:bg-forge-black/80 transition-colors duration-fast"
            >
              <div className="text-sm text-bright-steel truncate">{f.statement}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <StaleFactBadge isStale={f.status === 'stale'} lastVerified={f.updatedAt} />
                <Badge variant={typeBadgeVariant[f.type]} label={f.type} />
                <Badge variant={confidenceBadgeVariant[f.confidence]} label={f.confidence} confidence={confidenceNumeric[f.confidence]} />
                <Badge variant={statusBadgeVariant[f.status]} label={f.status} />
                <div className="ml-auto">{renderActions(f)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

MemoryPanel.displayName = 'MemoryPanel';

export { MemoryPanel };
