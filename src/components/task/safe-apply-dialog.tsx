import React, { useMemo } from 'react';
import type { SafeApplyCheck } from '../../kernel/safe-apply/apply-gate';

interface SafeApplyDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  checks: SafeApplyCheck[];
}

const SafeApplyDialog: React.FC<SafeApplyDialogProps> = React.memo(({ open, onClose, onApply, checks }) => {
  const allPassed = useMemo(() => checks.every((c) => c.passed), [checks]);
  const failedCount = useMemo(() => checks.filter((c) => !c.passed).length, [checks]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-forge-black/70" onClick={onClose} />
      <div className="relative bg-graphite rounded-lg shadow-xl border border-forged-steel/20 w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-forged-steel/20">
          <h2 className="text-lg font-semibold text-bright-steel">Safe Apply Checklist</h2>
          <p className="text-xs text-forged-steel mt-1">
            {allPassed
              ? 'All checks passed. Ready to apply.'
              : `${failedCount} check(s) failed. Resolve before applying.`}
          </p>
        </div>

        <div className="px-6 py-4 space-y-2 max-h-[400px] overflow-y-auto">
          {checks.map((check, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-md ${
                check.passed
                  ? 'bg-safe-green/5 border border-safe-green/20'
                  : 'bg-risk-red/5 border border-risk-red/20'
              }`}
            >
              <span className={`text-sm mt-0.5 ${check.passed ? 'text-safe-green' : 'text-risk-red'}`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${check.passed ? 'text-bright-steel' : 'text-bright-steel'}`}>
                  {check.check}
                </div>
                {check.details && (
                  <div className={`text-xs mt-0.5 ${check.passed ? 'text-forged-steel' : 'text-risk-red/80'}`}>
                    {check.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-forged-steel/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-forged-steel hover:text-bright-steel transition-colors duration-fast rounded-md hover:bg-forged-steel/10"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={!allPassed}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-fast ${
              allPassed
                ? 'bg-ember-orange text-forge-black hover:bg-deep-ember'
                : 'bg-forged-steel/20 text-forged-steel cursor-not-allowed'
            }`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
});

SafeApplyDialog.displayName = 'SafeApplyDialog';

export { SafeApplyDialog };
