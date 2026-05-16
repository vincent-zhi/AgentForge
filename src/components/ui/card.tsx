import React, { useState, useCallback } from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const Card: React.FC<CardProps> = React.memo(({
  title,
  children,
  className = '',
  actions,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleHeaderClick = useCallback(() => {
    if (collapsible) {
      setCollapsed(prev => !prev);
    }
  }, [collapsible]);

  return (
    <div className={`panel ${className}`}>
      {(title || actions || collapsible) && (
        <div
          className={`panel-header ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={handleHeaderClick}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleHeaderClick();
            }
          } : undefined}
          aria-expanded={collapsible ? !collapsed : undefined}
        >
          <div className="flex items-center gap-2">
            {collapsible && (
              <svg
                className={`w-3 h-3 text-forged-steel transition-transform duration-normal ${collapsed ? '' : 'rotate-90'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6 4l8 6-8 6V4z" />
              </svg>
            )}
            {title && <span>{title}</span>}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </div>
      )}
      {!collapsed && (
        <div className="panel-body">
          {children}
        </div>
      )}
    </div>
  );
});

Card.displayName = 'Card';

export { Card };
