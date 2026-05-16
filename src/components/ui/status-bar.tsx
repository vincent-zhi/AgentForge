import React from 'react';

type StatusItemStatus = 'ok' | 'warning' | 'error' | 'info';

interface StatusItem {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  status?: StatusItemStatus;
}

interface StatusBarProps {
  items: StatusItem[];
  className?: string;
}

const statusColorMap: Record<StatusItemStatus, string> = {
  ok: 'text-safe-green',
  warning: 'text-warning-amber',
  error: 'text-risk-red',
  info: 'text-blue-400',
};

const statusDotMap: Record<StatusItemStatus, string> = {
  ok: 'bg-safe-green',
  warning: 'bg-warning-amber',
  error: 'bg-risk-red',
  info: 'bg-blue-400',
};

const StatusBarItem: React.FC<{ item: StatusItem }> = React.memo(({ item }) => {
  const colorClass = item.status ? statusColorMap[item.status] : 'text-text-gray';
  const dotClass = item.status ? statusDotMap[item.status] : 'bg-forged-steel';

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-r border-forged-steel/10 last:border-r-0">
      {item.status && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      )}
      {item.icon && <span className={`shrink-0 ${colorClass}`}>{item.icon}</span>}
      <span className="text-[11px] text-forged-steel">{item.label}</span>
      <span className={`text-[11px] font-medium ${colorClass}`}>{item.value}</span>
    </div>
  );
});

StatusBarItem.displayName = 'StatusBarItem';

const StatusBar: React.FC<StatusBarProps> = React.memo(({ items, className = '' }) => {
  return (
    <div className={`flex items-center bg-graphite border-t border-forged-steel/20 h-7 overflow-x-auto ${className}`}>
      {items.map(item => (
        <StatusBarItem key={item.id} item={item} />
      ))}
    </div>
  );
});

StatusBar.displayName = 'StatusBar';

export { StatusBar };
export type { StatusItem, StatusItemStatus };
