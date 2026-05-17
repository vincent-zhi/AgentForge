import React, { useState, useCallback } from 'react';
import type { MemoryUpdateProposal } from '@/types/core';
import { Badge } from '@/components/ui/badge';
import { bridge } from '@/ipc/bridge';

interface MemoryProposalDialogProps {
  open: boolean;
  onClose: () => void;
  proposals: MemoryUpdateProposal[];
}

const actionColors: Record<MemoryUpdateProposal['action'], { bg: string; text: string; border: string }> = {
  create: { bg: 'bg-safe-green/10', text: 'text-safe-green', border: 'border-safe-green/30' },
  update: { bg: 'bg-warning-amber/10', text: 'text-warning-amber', border: 'border-warning-amber/30' },
  stale: { bg: 'bg-ember-orange/10', text: 'text-ember-orange', border: 'border-ember-orange/30' },
  reject: { bg: 'bg-risk-red/10', text: 'text-risk-red', border: 'border-risk-red/30' },
};

const actionLabels: Record<MemoryUpdateProposal['action'], string> = {
  create: 'Create',
  update: 'Update',
  stale: 'Stale',
  reject: 'Reject',
};

const MemoryProposalDialog: React.FC<MemoryProposalDialogProps> = React.memo(({ open, onClose, proposals }) => {
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const handleAccept = useCallback(async (proposal: MemoryUpdateProposal, index: number) => {
    await bridge.memory.applyProposal(proposal);
    setProcessedIds((prev) => new Set(prev).add(String(index)));
  }, []);

  const handleReject = useCallback(async (proposal: MemoryUpdateProposal, index: number) => {
    const proposalId = proposal.factId || String(index);
    await bridge.memory.rejectProposal(proposalId);
    setProcessedIds((prev) => new Set(prev).add(String(index)));
  }, []);

  const handleApplyAll = useCallback(async () => {
    for (let i = 0; i < proposals.length; i++) {
      if (!processedIds.has(String(i))) {
        await bridge.memory.applyProposal(proposals[i]);
      }
    }
    setProcessedIds(new Set(proposals.map((_, i) => String(i))));
  }, [proposals, processedIds]);

  const handleRejectAll = useCallback(async () => {
    for (let i = 0; i < proposals.length; i++) {
      if (!processedIds.has(String(i))) {
        const proposalId = proposals[i].factId || String(i);
        await bridge.memory.rejectProposal(proposalId);
      }
    }
    setProcessedIds(new Set(proposals.map((_, i) => String(i))));
  }, [proposals, processedIds]);

  if (!open) return null;

  const remainingCount = proposals.length - processedIds.size;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-forge-black/70" onClick={onClose} />
      <div className="relative bg-graphite rounded-lg shadow-xl border border-forged-steel/20 w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-forged-steel/20">
          <h2 className="text-lg font-semibold text-bright-steel">Memory Update Proposals</h2>
          <p className="text-xs text-forged-steel mt-1">
            {remainingCount > 0
              ? `${remainingCount} proposal(s) pending review`
              : 'All proposals have been reviewed'}
          </p>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {proposals.map((proposal, index) => {
            const key = String(index);
            const isProcessed = processedIds.has(key);
            const colors = actionColors[proposal.action];

            return (
              <div
                key={key}
                className={`rounded-md border ${colors.border} ${colors.bg} px-4 py-3 ${isProcessed ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className={`${colors.bg} ${colors.text} border ${colors.border} text-xs`}>
                    {actionLabels[proposal.action]}
                  </Badge>
                  {proposal.factId && (
                    <span className="text-xs text-forged-steel font-mono">{proposal.factId}</span>
                  )}
                </div>

                <div className="text-sm text-bright-steel mb-1">
                  {proposal.fact.statement || 'No statement provided'}
                </div>

                <div className="text-xs text-forged-steel mb-3">
                  {proposal.reason}
                </div>

                {!isProcessed && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(proposal, index)}
                      className="px-3 py-1 text-xs font-medium rounded bg-safe-green/20 text-safe-green hover:bg-safe-green/30 transition-colors duration-fast"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(proposal, index)}
                      className="px-3 py-1 text-xs font-medium rounded bg-risk-red/20 text-risk-red hover:bg-risk-red/30 transition-colors duration-fast"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {isProcessed && (
                  <span className="text-xs text-forged-steel italic">Reviewed</span>
                )}
              </div>
            );
          })}

          {proposals.length === 0 && (
            <div className="text-sm text-forged-steel text-center py-4">
              No memory update proposals generated
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-forged-steel/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-forged-steel hover:text-bright-steel transition-colors duration-fast rounded-md hover:bg-forged-steel/10"
          >
            Close
          </button>
          {remainingCount > 0 && (
            <>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium rounded-md bg-risk-red/20 text-risk-red hover:bg-risk-red/30 transition-colors duration-fast"
              >
                Reject All
              </button>
              <button
                onClick={handleApplyAll}
                className="px-4 py-2 text-sm font-medium rounded-md bg-ember-orange text-forge-black hover:bg-deep-ember transition-colors duration-fast"
              >
                Apply All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

MemoryProposalDialog.displayName = 'MemoryProposalDialog';

export { MemoryProposalDialog };
