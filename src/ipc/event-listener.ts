import { EVENT_CHANNELS } from './event-channels';
import { useAgentStore } from '@/store/agent-store';
import { useProjectStore } from '@/store/project-store';
import { useTaskStore } from '@/store/task-store';
import { useToastStore } from '@/store/toast-store';
import { useActivityStore } from '@/store/activity-store';
import type { BlackboardEvent, TaskStatus } from '@/types/core';

const unsubscribers: (() => void)[] = [];

const statusToastMessages: Record<string, { type: 'success' | 'warning' | 'error' | 'info'; message: string }> = {
  planning: { type: 'info', message: 'Planning task...' },
  executing: { type: 'warning', message: 'Executing task...' },
  reviewing: { type: 'info', message: 'Review ready for inspection' },
  completed: { type: 'success', message: 'Task completed successfully' },
  failed: { type: 'error', message: 'Task failed' },
};

function mapEventType(channelType: string): 'agent' | 'task' | 'risk' | 'system' {
  if (channelType.startsWith('agent')) return 'agent';
  if (channelType.startsWith('task')) return 'task';
  if (channelType.startsWith('risk')) return 'risk';
  return 'system';
}

function mapSeverity(type: 'success' | 'warning' | 'error' | 'info'): 'info' | 'warning' | 'error' | 'success' {
  return type;
}

export function initializeEventListeners(): void {
  const { onEvent } = window.agentForge;

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.BLACKBOARD_EVENT, (data: BlackboardEvent) => {
      useAgentStore.getState().addTimelineEvent(data);
      useActivityStore.getState().addEvent({
        type: mapEventType(data.type),
        title: data.type,
        description: JSON.stringify(data.data).slice(0, 200),
        source: data.agentId,
        severity: 'info',
        relatedId: data.taskId,
      });
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.FILE_CHANGED, (_data: any) => {
      useProjectStore.getState().setScanning(true);
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.SCAN_PROGRESS, (data: any) => {
      useProjectStore.getState().setScanning(data.scanning ?? false);
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.AGENT_STATUS_CHANGE, (data: any) => {
      useAgentStore.getState().updateAgentStatus(data.id, data.status);
      useActivityStore.getState().addEvent({
        type: 'agent',
        title: `Agent ${data.status}`,
        description: `Agent ${data.id} status changed to ${data.status}`,
        source: data.id,
        severity: data.status === 'failed' ? 'error' : data.status === 'completed' ? 'success' : 'info',
        relatedId: data.id,
      });
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.TASK_STATUS_CHANGE, (data: any) => {
      const taskStore = useTaskStore.getState();

      if (data.type === 'workflow_step') {
        taskStore.setCurrentStep(data.step ?? null);
        return;
      }

      if (data.taskId && data.status) {
        taskStore.updateTaskStatus(data.taskId, data.status as TaskStatus);
      }

      const toastConfig = statusToastMessages[data.status as string];
      if (toastConfig) {
        useToastStore.getState().addToast(toastConfig.type, toastConfig.message);
      }

      useActivityStore.getState().addEvent({
        type: 'task',
        title: `Task ${data.status}`,
        description: data.taskId ? `Task ${data.taskId} status changed to ${data.status}` : `Task status changed to ${data.status}`,
        source: 'workflow',
        severity: toastConfig ? mapSeverity(toastConfig.type) : 'info',
        relatedId: data.taskId,
      });
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.NOTIFICATION, (data: any) => {
      useToastStore.getState().addToast(data.type ?? 'info', data.message ?? '', data.duration);
    })
  );
}

export function cleanupEventListeners(): void {
  for (const unsubscribe of unsubscribers) {
    unsubscribe();
  }
  unsubscribers.length = 0;
}
