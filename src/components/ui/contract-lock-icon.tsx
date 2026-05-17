import React from 'react';
import { colors } from '@/theme/tokens';

interface ContractLockIconProps {
  isLocked: boolean;
  contractType?: string;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { fontSize: '0.75rem', iconSize: 12 },
  md: { fontSize: '0.875rem', iconSize: 14 },
};

const ContractLockIcon: React.FC<ContractLockIconProps> = React.memo(({ isLocked, contractType, size = 'sm' }) => {
  const s = sizeMap[size];

  if (isLocked) {
    return (
      <span
        style={{ fontSize: s.fontSize, color: colors.emberOrange, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        title={contractType ? `Contract: ${contractType}` : 'Locked contract'}
      >
        <span style={{ fontSize: s.iconSize }}>🔒</span>
      </span>
    );
  }

  return (
    <span
      style={{ fontSize: s.fontSize, color: colors.forgedSteel, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <span style={{ fontSize: s.iconSize }}>🔓</span>
    </span>
  );
});

ContractLockIcon.displayName = 'ContractLockIcon';

export { ContractLockIcon };
