import React from 'react';
import { colors } from '@/theme/tokens';

interface EvidenceCheckmarkProps {
  verified: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { fontSize: '0.75rem', iconSize: 12 },
  md: { fontSize: '0.875rem', iconSize: 14 },
};

const EvidenceCheckmark: React.FC<EvidenceCheckmarkProps> = React.memo(({ verified, label, size = 'sm' }) => {
  const s = sizeMap[size];

  if (verified) {
    return (
      <span
        style={{ fontSize: s.fontSize, color: colors.safeGreen, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <span style={{ fontSize: s.iconSize }}>✓</span>
        {label && <span>{label}</span>}
      </span>
    );
  }

  return (
    <span
      style={{ fontSize: s.fontSize, color: colors.warningAmber, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <span style={{ fontSize: s.iconSize }}>⚠</span>
      {label && <span>{label}</span>}
    </span>
  );
});

EvidenceCheckmark.displayName = 'EvidenceCheckmark';

export { EvidenceCheckmark };
