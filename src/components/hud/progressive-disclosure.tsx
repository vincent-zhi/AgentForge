import React, { useState, useCallback } from 'react';
import type { RiskLevel } from '@/types/core';

interface ProgressiveDisclosureChildren {
  summary?: React.ReactNode;
  standard?: React.ReactNode;
  full?: React.ReactNode;
}

interface ProgressiveDisclosureProps {
  riskLevel: RiskLevel;
  children: ProgressiveDisclosureChildren;
}

const disclosureLevel: Record<RiskLevel, 'summary' | 'standard' | 'full'> = {
  low: 'summary',
  medium: 'standard',
  high: 'full',
  critical: 'full',
};

const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = React.memo(({ riskLevel, children }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const autoLevel = disclosureLevel[riskLevel];

  const showSummary = true;
  const showStandard = expanded || autoLevel === 'standard' || autoLevel === 'full';
  const showFull = expanded || autoLevel === 'full';

  const canExpand = autoLevel === 'summary'
    ? !!(children.standard || children.full)
    : autoLevel === 'standard'
      ? !!children.full
      : false;

  return (
    <div className="space-y-2">
      {showSummary && children.summary}

      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateRows: showStandard ? '1fr' : '0fr',
          opacity: showStandard ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {children.standard}
        </div>
      </div>

      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateRows: showFull ? '1fr' : '0fr',
          opacity: showFull ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {children.full}
        </div>
      </div>

      {canExpand && (
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 hover:opacity-80"
          style={{ color: '#FF7A1A' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{expanded ? 'Show Less' : 'Show More'}</span>
        </button>
      )}
    </div>
  );
});

ProgressiveDisclosure.displayName = 'ProgressiveDisclosure';

export { ProgressiveDisclosure };
