import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { BlackboardEvent } from '@/types/core';

export class Blackboard extends EventEmitter {
  private events: BlackboardEvent[] = [];

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
