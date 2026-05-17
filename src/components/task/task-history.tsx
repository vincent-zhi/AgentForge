import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTaskStore } from '@/store/task-store';
import { bridge } from '@/ipc/bridge';
import type { TaskCapsule, TaskStatus, RiskLevel } from '@/types/core';

interface TaskHistoryProps {
  onClose?: () => void;
}

const statusFilters: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'planning', label: 'Planning' },
  { key: 'executing', label: 'Executing' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

const statusVariant: Record<TaskStatus, 'verified' | 'partial' | 'blocked' | 'analyzing' | 'brain' | 'unverified' | 'ember' | 'default'> = {
  draft: 'unverified',
  planning: 'analyzing',
  executing: 'brain',
  reviewing: 'partial',
  completed: 'verified',
  failed: 'blocked',
  cancelled: 'default',
};

const riskVariant: Record<RiskLevel, 'verified' | 'partial' | 'blocked'> = {
  low: 'verified',
  medium: 'partial',
  high: 'blocked',
  critical: 'blocked',
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return new Date(dateStr).toLocaleDateString();
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ onClose }) => {
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');
  const { tasks, setTasks, setCurrentTask, setReviewPacket, currentTaskId } = useTaskStore();

  useEffect(() => {
    bridge.task.list().then((result) => {
      if (Array.isArray(result)) {
        setTasks(result as TaskCapsule[]);
      }
    }).catch(() => {});
  }, [setTasks]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === activeFilter);
  }, [tasks, activeFilter]);

  const handleTaskClick = useCallback(async (task: TaskCapsule) => {
    setCurrentTask(task.id);
    if (task.status === 'completed' || task.status === 'reviewing') {
      try {
        const packet = await bridge.review.generatePacket(task.id) as any;
        if (packet && !packet.error) {
          setReviewPacket(packet);
        }
      } catch {}
    }
  }, [setCurrentTask, setReviewPacket]);

  return (
    <div className="flex flex-col h-full bg-graphite border-l border-forged-steel/20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-forged-steel/20">
        <h2 className="text-sm font-semibold text-bright-steel">任务历史</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-forged-steel hover:text-bright-steel transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-forged-steel/20 overflow-x-auto">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-ember-orange/20 text-ember-orange border border-ember-orange/30'
                : 'bg-forge-black/50 text-forged-steel border border-forged-steel/20 hover:text-bright-steel'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-forged-steel">
            <span className="text-2xl mb-2">📋</span>
            <span className="text-xs">暂无任务历史</span>
          </div>
        ) : (
          <div className="divide-y divide-forged-steel/10">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`w-full text-left px-4 py-3 hover:bg-forge-black/30 transition-colors ${
                  currentTaskId === task.id ? 'bg-ember-orange/5 border-l-2 border-ember-orange' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-bright-steel flex-1 line-clamp-2">{task.goal}</span>
                  <Badge variant={statusVariant[task.status]} label={task.status} />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-forged-steel">{formatRelativeTime(task.createdAt)}</span>
                  {task.reviewPolicy && task.reviewPolicy.maxRiskLevel && (
                    <Badge variant={riskVariant[task.reviewPolicy.maxRiskLevel]} label={task.reviewPolicy.maxRiskLevel} />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

TaskHistory.displayName = 'TaskHistory';

export { TaskHistory };
