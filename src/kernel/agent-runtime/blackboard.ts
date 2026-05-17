import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { BrowserWindow } from 'electron';
import type { BlackboardEvent } from '@/types/core';
import { EVENT_CHANNELS } from '@/ipc/event-channels';

export class Blackboard extends EventEmitter {
  private events: BlackboardEvent[] = [];
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  publish(event: Omit<BlackboardEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const fullEvent: BlackboardEvent = {
      id: event.id || uuidv4(),
      type: event.type,
      agentId: event.agentId,
      taskId: event.taskId,
      data: event.data,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    this.events.push(fullEvent);
    this.emit(event.type, fullEvent);
    this.emit('*', fullEvent);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(EVENT_CHANNELS.BLACKBOARD_EVENT, fullEvent);
    }
  }

  subscribe(eventType: string, handler: (event: BlackboardEvent) => void): () => void {
    this.on(eventType, handler);
    return () => {
      this.off(eventType, handler);
    };
  }

  getEvents(taskId?: string): BlackboardEvent[] {
    if (taskId) {
      return this.events.filter((e) => e.taskId === taskId);
    }
    return [...this.events];
  }

  clear(taskId?: string): void {
    if (taskId) {
      this.events = this.events.filter((e) => e.taskId !== taskId);
    } else {
      this.events = [];
    }
  }
}
