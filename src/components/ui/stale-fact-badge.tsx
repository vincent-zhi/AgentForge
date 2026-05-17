import React from 'react';
import { colors } from '@/theme/tokens';

interface StaleFactBadgeProps {
  isStale: boolean;
  lastVerified?: string;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { fontSize: '0.75rem', iconSize: 12 },
  md: { fontSize: '0.875rem', iconSize: 14 },
};

const StaleFactBadge: React.FC<StaleFactBadgeProps> = React.memo(({ isStale, lastVerified, size = 'sm' }) => {
  const s = sizeMap[size];

  if (isStale) {
    return (
      <span
        style={{ fontSize: s.fontSize, color: colors.emberOrange, display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative' }}
        title="此事实已过期，需要重新验证"
      >
        <span style={{ fontSize: s.iconSize }}>⚠</span>
        {lastVerified && (
          <span style={{ fontSize: '0.625rem', color: colors.forgedSteel }}>
            {lastVerified}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      style={{ fontSize: s.fontSize, color: colors.safeGreen, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <span style={{ fontSize: s.iconSize }}>✓</span>
    </span>
  );
});

StaleFactBadge.displayName = 'StaleFactBadge';

export { StaleFactBadge };
