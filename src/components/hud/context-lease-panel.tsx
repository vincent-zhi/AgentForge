import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { bridge } from '@/ipc/bridge';
import type { ContextLease } from '@/types/core';

interface EscalationRequest {
  requestId: string;
  leaseId: string;
  resource: string;
  reason: string;
}

interface ContextLeasePanelProps {
  leases: ContextLease[];
  escalationRequests?: EscalationRequest[];
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

const EscalationDialog: React.FC<{
  requests: EscalationRequest[];
  onClose: () => void;
}> = React.memo(({ requests, onClose }) => {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleApprove = useCallback(async (requestId: string) => {
    await bridge.lease.respondEscalation(requestId, true);
    setResolvedIds((prev) => new Set(prev).add(requestId));
  }, []);

  const handleDeny = useCallback(async (requestId: string) => {
    await bridge.lease.respondEscalation(requestId, false);
    setResolvedIds((prev) => new Set(prev).add(requestId));
  }, []);

  const remainingCount = requests.length - resolvedIds.size;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-forge-black/70" onClick={onClose} />
      <div className="relative bg-graphite rounded-lg shadow-xl border border-forged-steel/20 w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-forged-steel/20">
          <h2 className="text-lg font-semibold text-bright-steel">Permission Escalation Requests</h2>
          <p className="text-xs text-forged-steel mt-1">
            {remainingCount > 0
              ? `${remainingCount} request(s) pending approval`
              : 'All requests have been resolved'}
          </p>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {requests.map((req) => {
            const isResolved = resolvedIds.has(req.requestId);
            return (
              <div
                key={req.requestId}
                className={`rounded-md border border-ember-orange/30 bg-ember-orange/10 px-4 py-3 ${isResolved ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="ember" label="Escalation" />
                  <span className="text-xs text-forged-steel font-mono">{req.leaseId}</span>
                </div>

                <div className="text-sm text-bright-steel mb-1">
                  Resource: <span className="font-mono text-warning-amber">{req.resource}</span>
                </div>

                <div className="text-xs text-forged-steel mb-3">
                  {req.reason}
                </div>

                {!isResolved && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(req.requestId)}
                      className="px-3 py-1 text-xs font-medium rounded bg-safe-green/20 text-safe-green hover:bg-safe-green/30 transition-colors duration-fast"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(req.requestId)}
                      className="px-3 py-1 text-xs font-medium rounded bg-risk-red/20 text-risk-red hover:bg-risk-red/30 transition-colors duration-fast"
                    >
                      Deny
                    </button>
                  </div>
                )}

                {isResolved && (
                  <span className="text-xs text-forged-steel italic">Resolved</span>
                )}
              </div>
            );
          })}

          {requests.length === 0 && (
            <div className="text-sm text-forged-steel text-center py-4">
              No pending escalation requests
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-forged-steel/20 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-forged-steel hover:text-bright-steel transition-colors duration-fast rounded-md hover:bg-forged-steel/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

EscalationDialog.displayName = 'EscalationDialog';

const ContextLeasePanel: React.FC<ContextLeasePanelProps> = React.memo(({ leases, escalationRequests = [] }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (leases.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No active leases. Leases are created when agents are assigned to tasks.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {escalationRequests.length > 0 && (
        <button
          onClick={() => setDialogOpen(true)}
          className="w-full px-3 py-1.5 text-xs font-medium rounded bg-ember-orange/20 text-ember-orange hover:bg-ember-orange/30 transition-colors duration-fast flex items-center justify-center gap-1"
        >
          ⚠ {escalationRequests.length} Permission Escalation Request(s)
        </button>
      )}

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

      {dialogOpen && (
        <EscalationDialog
          requests={escalationRequests}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
});

ContextLeasePanel.displayName = 'ContextLeasePanel';

export { ContextLeasePanel };
export type { EscalationRequest };
