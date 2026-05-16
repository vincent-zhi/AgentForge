import React from 'react';

type ChipVariant = 'default' | 'ember' | 'green' | 'red' | 'amber' | 'blue' | 'purple';
type ChipSize = 'sm' | 'md';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
}

const variantClasses: Record<ChipVariant, string> = {
  default: 'bg-graphite border-forged-steel/30 text-text-gray',
  ember: 'bg-ember-orange/10 border-ember-orange/30 text-ember-orange',
  green: 'bg-safe-green/10 border-safe-green/30 text-safe-green',
  red: 'bg-risk-red/10 border-risk-red/30 text-risk-red',
  amber: 'bg-warning-amber/10 border-warning-amber/30 text-warning-amber',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
};

const sizeClasses: Record<ChipSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
};

const iconSizeClasses: Record<ChipSize, string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
};

const removeSizeClasses: Record<ChipSize, string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
};

const Chip: React.FC<ChipProps> = React.memo(({
  label,
  icon,
  onRemove,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span className={iconSizeClasses[size]}>{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`inline-flex items-center justify-center rounded-full hover:bg-forged-steel/20 transition-colors duration-fast ${removeSizeClasses[size]}`}
        >
          <svg className={removeSizeClasses[size]} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </span>
  );
});

Chip.displayName = 'Chip';

export { Chip };
export type { ChipVariant, ChipSize };
