import React from 'react';
import { Badge } from './badge';

type TimelineStatus = 'running' | 'completed' | 'failed' | 'pending';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: TimelineStatus;
  agentId?: string;
  agentRole?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const statusDotClasses: Record<TimelineStatus, string> = {
  completed: 'bg-safe-green',
  running: 'bg-blue-400 animate-pulse',
  failed: 'bg-risk-red',
  pending: 'bg-forged-steel',
};

const statusLineClasses: Record<TimelineStatus, string> = {
  completed: 'bg-safe-green/30',
  running: 'bg-blue-400/30',
  failed: 'bg-risk-red/30',
  pending: 'bg-forged-steel/20',
};

const roleVariantMap: Record<string, 'verified' | 'partial' | 'blocked' | 'analyzing' | 'brain' | 'unverified' | 'ember'> = {
  orchestrator: 'ember',
  architect: 'brain',
  impact: 'analyzing',
  contract: 'partial',
  search: 'unverified',
  coder: 'verified',
  tester: 'partial',
  reviewer: 'blocked',
  doc: 'unverified',
};

const TimelineItem: React.FC<{ item: TimelineItem; isLast: boolean }> = React.memo(({ item, isLast }) => {
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${statusDotClasses[item.status]}`} />
        {!isLast && (
          <div className={`w-px flex-1 mt-1 ${statusLineClasses[item.status]}`} />
        )}
      </div>
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-bright-steel font-medium">{item.title}</span>
          {item.agentRole && (
            <Badge variant={roleVariantMap[item.agentRole] ?? 'default'} label={item.agentRole} />
          )}
        </div>
        {item.description && (
          <p className="text-xs text-text-gray mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-forged-steel">{item.timestamp}</span>
          {item.agentId && (
            <span className="text-[10px] text-forged-steel">{item.agentId}</span>
          )}
        </div>
      </div>
    </div>
  );
});

TimelineItem.displayName = 'TimelineItem';

const Timeline: React.FC<TimelineProps> = React.memo(({ items, className = '' }) => {
  return (
    <div className={`py-2 ${className}`}>
      {items.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
      {items.length === 0 && (
        <div className="text-xs text-forged-steel text-center py-4">No timeline events</div>
      )}
    </div>
  );
});

Timeline.displayName = 'Timeline';

export { Timeline };
export type { TimelineItem, TimelineStatus };
