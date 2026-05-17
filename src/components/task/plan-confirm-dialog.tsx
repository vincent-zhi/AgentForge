import React from 'react';
import type { TaskCapsule, RiskLevel } from '@/types/core';

interface PlanConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  capsule: TaskCapsule | null;
}

const riskBadgeClass: Record<RiskLevel, string> = {
  low: 'bg-safe-green/20 text-safe-green',
  medium: 'bg-amber-500/20 text-amber-500',
  high: 'bg-risk-red/20 text-risk-red',
  critical: 'bg-risk-red/30 text-risk-red font-bold',
};

const riskLabel: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

const PlanConfirmDialog: React.FC<PlanConfirmDialogProps> = React.memo(({ open, onClose, onConfirm, capsule }) => {
  if (!open || !capsule) return null;

  const riskLevel = capsule.reviewPolicy.maxRiskLevel;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-forge-black/70" onClick={onClose} />
      <div className="relative bg-graphite rounded-lg shadow-xl border border-forged-steel/20 w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-forged-steel/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-bright-steel">Plan Confirmation</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${riskBadgeClass[riskLevel]}`}>
              {riskLabel[riskLevel]}
            </span>
          </div>
          <p className="text-sm text-bright-steel mt-2">{capsule.goal}</p>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[400px] overflow-y-auto">
          {capsule.nonGoals.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-forged-steel uppercase tracking-wider mb-1">Non-Goals</h3>
              <ul className="space-y-1">
                {capsule.nonGoals.map((ng, i) => (
                  <li key={i} className="text-sm text-forged-steel line-through">{ng}</li>
                ))}
              </ul>
            </div>
          )}

          {capsule.writable.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-safe-green uppercase tracking-wider mb-1">Writable Scope</h3>
              <div className="flex flex-wrap gap-1.5">
                {capsule.writable.map((w, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs bg-safe-green/10 text-safe-green border border-safe-green/20">{w}</span>
                ))}
              </div>
            </div>
          )}

          {capsule.readonly.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">Readonly Scope</h3>
              <div className="flex flex-wrap gap-1.5">
                {capsule.readonly.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20">{r}</span>
                ))}
              </div>
            </div>
          )}

          {capsule.forbidden.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-risk-red uppercase tracking-wider mb-1">Forbidden Scope</h3>
              <div className="flex flex-wrap gap-1.5">
                {capsule.forbidden.map((f, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs bg-risk-red/10 text-risk-red border border-risk-red/20">{f}</span>
                ))}
              </div>
            </div>
          )}

          {capsule.mustPreserve.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-1">Must-Preserve Contracts</h3>
              <ul className="space-y-1">
                {capsule.mustPreserve.map((c, i) => (
                  <li key={i} className="text-sm text-bright-steel">
                    <span className="text-amber-500 mr-1">🔒</span>
                    {c.name} <span className="text-forged-steel text-xs">({c.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {capsule.requiredTests.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-forged-steel uppercase tracking-wider mb-1">Required Tests</h3>
              <ul className="space-y-1">
                {capsule.requiredTests.map((t, i) => (
                  <li key={i} className="text-sm text-bright-steel font-mono">
                    {t.command} <span className="text-forged-steel text-xs">[{t.module}]</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-forged-steel/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            Confirm & Execute
          </button>
        </div>
      </div>
    </div>
  );
});

PlanConfirmDialog.displayName = 'PlanConfirmDialog';

export { PlanConfirmDialog };
