import type { AgentTimelineEvent } from '@agentforge/core';

export class AgentTimeline {
  private readonly events: AgentTimelineEvent[] = [];

  record<TPayload extends Record<string, unknown>>(event: Omit<AgentTimelineEvent<TPayload>, 'timestamp'>): AgentTimelineEvent<TPayload> {
    const timelineEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(timelineEvent);
    return timelineEvent;
  }

  list(taskId?: string): AgentTimelineEvent[] {
    return taskId ? this.events.filter((event) => event.taskId === taskId) : [...this.events];
  }
}
