import React from 'react';
import { colors } from '@/theme/tokens';

export type BadgeVariant = 'verified' | 'partial' | 'blocked' | 'analyzing' | 'brain' | 'unverified' | 'ember' | 'default' | 'stale';

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  confidence?: number;
}

const variantClasses: Record<BadgeVariant, string> = {
  verified: 'badge-verified',
  partial: 'badge-partial',
  blocked: 'badge-blocked',
  analyzing: 'badge-analyzing',
  brain: 'badge-brain',
  unverified: 'badge-unverified',
  ember: 'badge-ember',
  default: 'badge bg-forged-steel/20 text-forged-steel',
  stale: 'badge-stale',
};

const pulseKeyframes = `@keyframes badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}`;

const Badge: React.FC<BadgeProps> = React.memo(({ variant = 'default', label, children, className = '', confidence }) => {
  const isStale = variant === 'stale';

  return (
    <>
      {isStale && (
        <style>{pulseKeyframes}</style>
      )}
      <span
        className={`${variantClasses[variant]} ${className}`}
        style={isStale ? { animation: 'badge-pulse 2s ease-in-out infinite' } : undefined}
      >
        {label ?? children}
        {confidence !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: '4px',
              gap: '2px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '24px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: `${colors.forgedSteel}40`,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${Math.max(0, Math.min(100, confidence))}%`,
                  height: '100%',
                  borderRadius: '2px',
                  backgroundColor: confidence >= 80 ? colors.safeGreen : confidence >= 50 ? colors.warningAmber : colors.riskRed,
                }}
              />
            </span>
            <span style={{ fontSize: '0.625rem', color: colors.forgedSteel }}>
              {confidence}%
            </span>
          </span>
        )}
      </span>
    </>
  );
});

Badge.displayName = 'Badge';

export { Badge };
