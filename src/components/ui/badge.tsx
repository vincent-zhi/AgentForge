import React from 'react';

export type BadgeVariant = 'verified' | 'partial' | 'blocked' | 'analyzing' | 'brain' | 'unverified' | 'ember' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  className?: string;
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
};

const Badge: React.FC<BadgeProps> = React.memo(({ variant = 'default', label, children, className = '' }) => {
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {label ?? children}
    </span>
  );
});

Badge.displayName = 'Badge';

export { Badge };
