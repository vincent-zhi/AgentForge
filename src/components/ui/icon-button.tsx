import React from 'react';

type IconButtonVariant = 'default' | 'ghost' | 'ember';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  title?: string;
  className?: string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'bg-graphite border border-forged-steel/30 text-text-gray hover:text-bright-steel hover:border-forged-steel/50',
  ghost: 'text-text-gray hover:text-bright-steel hover:bg-graphite',
  ember: 'bg-ember-orange/10 border border-ember-orange/30 text-ember-orange hover:bg-ember-orange/20',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-6 h-6 p-1',
  md: 'w-8 h-8 p-1.5',
  lg: 'w-10 h-10 p-2',
};

const iconSizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const IconButton: React.FC<IconButtonProps> = React.memo(({
  icon,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  title,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex items-center justify-center rounded-md
        transition-colors duration-fast
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>
    </button>
  );
});

IconButton.displayName = 'IconButton';

export { IconButton };
export type { IconButtonVariant, IconButtonSize };
