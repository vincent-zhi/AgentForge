import { EVENT_CHANNELS } from './event-channels';
import { useAgentStore } from '@/store/agent-store';
import { useProjectStore } from '@/store/project-store';
import { useTaskStore } from '@/store/task-store';
import { useToastStore } from '@/store/toast-store';
import type { BlackboardEvent } from '@/types/core';

const unsubscribers: (() => void)[] = [];

export function initializeEventListeners(): void {
  const { onEvent } = window.agentForge;

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.BLACKBOARD_EVENT, (data: BlackboardEvent) => {
      useAgentStore.getState().addTimelineEvent(data);
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
    })
  );

  unsubscribers.push(
    onEvent(EVENT_CHANNELS.TASK_STATUS_CHANGE, (data: any) => {
      useTaskStore.getState().updateTaskStatus(data.id, data.status);
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
