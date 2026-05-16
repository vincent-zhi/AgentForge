import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/types/core';

interface RiskRadarProps {
  risks?: { dimension: string; level: RiskLevel }[];
  overallLevel?: RiskLevel;
}

const defaultDimensions: { dimension: string; level: RiskLevel }[] = [
  { dimension: 'Auth', level: 'low' },
  { dimension: 'API', level: 'low' },
  { dimension: 'Database', level: 'low' },
  { dimension: 'UI', level: 'low' },
  { dimension: 'Test Coverage', level: 'low' },
];

const levelWidth: Record<RiskLevel, string> = {
  low: 'w-1/4',
  medium: 'w-1/2',
  high: 'w-3/4',
  critical: 'w-full',
};

const levelColor: Record<RiskLevel, string> = {
  low: 'bg-safe-green',
  medium: 'bg-warning-amber',
  high: 'bg-risk-red',
  critical: 'bg-risk-red animate-pulse',
};

const overallVariant: Record<RiskLevel, 'verified' | 'partial' | 'blocked'> = {
  low: 'verified',
  medium: 'partial',
  high: 'blocked',
  critical: 'blocked',
};

const RiskRadar: React.FC<RiskRadarProps> = React.memo(({ risks = defaultDimensions, overallLevel }) => {
  const dimensions = risks.length > 0 ? risks : defaultDimensions;
  const overall = overallLevel ?? 'low';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-forged-steel">Overall:</span>
        <Badge variant={overallVariant[overall]} label={overall.toUpperCase()} />
      </div>
      <div className="space-y-2">
        {dimensions.map((d) => (
          <div key={d.dimension}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-text-gray">{d.dimension}</span>
              <span className="text-[10px] text-forged-steel">{d.level}</span>
            </div>
            <div className="h-1.5 bg-forge-black rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${levelWidth[d.level]} ${levelColor[d.level]} transition-all duration-normal`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

RiskRadar.displayName = 'RiskRadar';

export { RiskRadar };
