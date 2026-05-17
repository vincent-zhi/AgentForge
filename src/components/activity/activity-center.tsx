import React, { useMemo } from 'react';
import { useActivityStore } from '@/store/activity-store';
import { useLayoutStore } from '@/store/layout-store';
import type { ActivityEvent } from '@/store/activity-store';

interface ActivityCenterProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<ActivityEvent['severity'], { icon: string; color: string }> = {
  info: { icon: 'ℹ', color: 'text-blue-400' },
  warning: { icon: '⚠', color: 'text-warning-amber' },
  error: { icon: '✕', color: 'text-risk-red' },
  success: { icon: '✓', color: 'text-safe-green' },
};

const FILTER_TABS: { label: string; value: ActivityState['filter'] }[] = [
  { label: 'All', value: 'all' },
  { label: 'Agent', value: 'agent' },
  { label: 'Task', value: 'task' },
  { label: 'Risk', value: 'risk' },
  { label: 'System', value: 'system' },
];

type ActivityState = ReturnType<typeof useActivityStore.getState>;

const RELATED_PANEL_MAP: Record<string, string> = {
  brain: 'brain',
  task: 'task',
  hud: 'hud',
  evidence: 'evidence',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export const ActivityCenter: React.FC<ActivityCenterProps> = ({ open, onClose }) => {
  const { events, filter, unreadCount, markAsRead, markAllAsRead, clearEvents, setFilter } =
    useActivityStore();
  const setActivePanel = useLayoutStore((s) => s.setActivePanel);

  const filteredEvents = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  if (!open) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] bg-graphite border-l border-forged-steel/20 z-overlay shadow-xl animate-slide-in-right flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="font-semibold">活动中心</span>
          {unreadCount > 0 && (
            <span className="bg-risk-red text-bright-steel text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="text-xs text-text-gray hover:text-bright-steel transition-colors"
          >
            全部已读
          </button>
          <button
            onClick={clearEvents}
            className="text-xs text-text-gray hover:text-bright-steel transition-colors"
          >
            清空
          </button>
          <button
            onClick={onClose}
            className="text-forged-steel hover:text-bright-steel transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex border-b border-forged-steel/20">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === tab.value
                ? 'text-ember-orange border-b-2 border-ember-orange'
                : 'text-forged-steel hover:text-text-gray'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-forged-steel text-sm">
            暂无活动事件
          </div>
        ) : (
          filteredEvents.map((event) => {
            const severityConfig = SEVERITY_CONFIG[event.severity];
            return (
              <div
                key={event.id}
                onClick={() => {
                  markAsRead(event.id);
                  if (event.relatedPanel && RELATED_PANEL_MAP[event.relatedPanel]) {
                    setActivePanel(RELATED_PANEL_MAP[event.relatedPanel]);
                    onClose();
                  }
                }}
                className={`px-4 py-3 border-b border-forged-steel/10 cursor-pointer hover:bg-forge-black/50 transition-colors ${
                  !event.read ? 'bg-forge-black/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 mt-0.5 text-sm ${severityConfig.color}`}>
                    {severityConfig.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          !event.read ? 'font-semibold text-bright-steel' : 'font-medium text-text-gray'
                        }`}
                      >
                        {event.title}
                      </span>
                      {!event.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-ember-orange" />
                      )}
                    </div>
                    <p className="text-xs text-forged-steel truncate mt-0.5">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-forged-steel/60">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                      <span className="text-xs text-forged-steel/40">
                        {event.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
