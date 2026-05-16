import React, { useRef, useEffect } from 'react';
import { Timeline } from '@/components/ui/timeline';
import type { TimelineItem } from '@/components/ui/timeline';
import type { BlackboardEvent } from '@/types/core';

interface AgentTimelineProps {
  events: BlackboardEvent[];
}

function toTimelineItems(events: BlackboardEvent[]): TimelineItem[] {
  return events.map((e) => ({
    id: e.id,
    title: e.type,
    description: typeof e.data?.message === 'string' ? e.data.message : undefined,
    timestamp: e.timestamp,
    status: 'completed' as const,
    agentId: e.agentId,
    agentRole: (e.data?.role as string) ?? undefined,
  }));
}

const AgentTimeline: React.FC<AgentTimelineProps> = React.memo(({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = toTimelineItems(events);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No timeline events yet. Events appear as agents perform actions.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-h-64 overflow-auto">
      <Timeline items={items} />
    </div>
  );
});

AgentTimeline.displayName = 'AgentTimeline';

export { AgentTimeline };
