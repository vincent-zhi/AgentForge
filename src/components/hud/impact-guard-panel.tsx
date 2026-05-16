import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ImpactMap, ContractRef } from '@/types/core';

interface ImpactGuardPanelProps {
  impactMap: ImpactMap | null;
}

const compatVariant: Record<string, 'blocked' | 'partial' | 'verified'> = {
  must_preserve: 'blocked',
  should_preserve: 'partial',
  flexible: 'verified',
};

const riskVariant: Record<string, 'verified' | 'partial' | 'blocked'> = {
  low: 'verified',
  medium: 'partial',
  high: 'blocked',
  critical: 'blocked',
};

const ImpactGuardPanel: React.FC<ImpactGuardPanelProps> = React.memo(({ impactMap }) => {
  if (!impactMap) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No impact map available. Run impact analysis to see results.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-forged-steel mb-1">Target Module</div>
        <div className="text-sm text-bright-steel font-medium">{impactMap.target.module}</div>
        {impactMap.target.files.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {impactMap.target.files.map((f, i) => (
              <div key={i} className="text-xs font-mono text-text-gray pl-2">{f}</div>
            ))}
          </div>
        )}
      </div>

      {impactMap.upstreamDependencies.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Upstream Dependencies</div>
          <div className="space-y-0.5">
            {impactMap.upstreamDependencies.map((d, i) => (
              <div key={i} className="text-xs text-text-gray pl-2">
                {d.name} <span className="text-forged-steel">({d.path})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {impactMap.downstreamDependents.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Downstream Dependents</div>
          <div className="space-y-0.5">
            {impactMap.downstreamDependents.map((d, i) => (
              <div key={i} className="text-xs text-text-gray pl-2">
                {d.name} <span className="text-forged-steel">({d.path})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {impactMap.contractsTouched.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Contracts Touched</div>
          <div className="space-y-1">
            {impactMap.contractsTouched.map((c: ContractRef) => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-forge-black/50">
                <span className="text-xs text-bright-steel flex-1 truncate">{c.name}</span>
                <Badge variant={compatVariant[c.compatibility]} label={c.compatibility} />
              </div>
            ))}
          </div>
        </div>
      )}

      {impactMap.affectedTests.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Affected Tests</div>
          <div className="space-y-0.5">
            {impactMap.affectedTests.map((t, i) => (
              <div key={i} className="text-xs font-mono text-text-gray pl-2">{t.command}</div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-forged-steel mb-1">Risk Level</div>
        <div className="flex items-center gap-2">
          <Badge variant={riskVariant[impactMap.risk.level]} label={impactMap.risk.level} />
          {impactMap.risk.reasons.length > 0 && (
            <span className="text-[10px] text-forged-steel">{impactMap.risk.reasons.length} reason(s)</span>
          )}
        </div>
        {impactMap.risk.reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 pl-2">
            {impactMap.risk.reasons.map((r, i) => (
              <li key={i} className="text-xs text-text-gray">• {r}</li>
            ))}
          </ul>
        )}
      </div>

      {impactMap.forbiddenChanges.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Forbidden Changes</div>
          <div className="space-y-0.5">
            {impactMap.forbiddenChanges.map((f, i) => (
              <div key={i} className="text-xs text-risk-red pl-2">🚫 {f}</div>
            ))}
          </div>
        </div>
      )}

      {impactMap.reviewFocus.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Review Focus</div>
          <div className="space-y-0.5">
            {impactMap.reviewFocus.map((f, i) => (
              <div key={i} className="text-xs text-warning-amber pl-2">🔍 {f}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ImpactGuardPanel.displayName = 'ImpactGuardPanel';

export { ImpactGuardPanel };
