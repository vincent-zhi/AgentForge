import React from 'react';
import { colors } from '@/theme/tokens';
import type { IntentType } from '@/types/core';

interface IntentLabelProps {
  intent: IntentType;
  size?: 'sm' | 'md';
}

const intentConfig: Record<IntentType, { label: string; bg: string; color: string }> = {
  business_fix: { label: '业务修复', bg: `${colors.emberOrange}20`, color: colors.emberOrange },
  compatibility: { label: '兼容保护', bg: '#3B82F620', color: '#3B82F6' },
  test_coverage: { label: '测试覆盖', bg: `${colors.safeGreen}20`, color: colors.safeGreen },
  documentation: { label: '文档更新', bg: '#14B8A620', color: '#14B8A6' },
  refactor: { label: '附带重构', bg: '#8B5CF620', color: '#8B5CF6' },
};

const sizeMap = {
  sm: { fontSize: '0.625rem', padding: '2px 6px' },
  md: { fontSize: '0.75rem', padding: '3px 8px' },
};

const IntentLabel: React.FC<IntentLabelProps> = React.memo(({ intent, size = 'sm' }) => {
  const config = intentConfig[intent];
  const s = sizeMap[size];

  return (
    <span
      style={{
        fontSize: s.fontSize,
        padding: s.padding,
        borderRadius: '2px',
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 500,
        lineHeight: 1.25,
      }}
    >
      {config.label}
    </span>
  );
});

IntentLabel.displayName = 'IntentLabel';

export { IntentLabel };
