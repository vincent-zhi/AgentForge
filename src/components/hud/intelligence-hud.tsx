import React from 'react';
import { Card } from '@/components/ui/card';
import { ImpactGuardPanel } from './impact-guard-panel';
import { RiskRadar } from './risk-radar';
import { AgentTimeline } from './agent-timeline';
import { ContextLeasePanel } from './context-lease-panel';
import { EvidenceStackPanel } from './evidence-stack-panel';
import { BrainUpdatesPanel } from './brain-updates-panel';
import { useTaskStore, useAgentStore } from '@/store';

const IntelligenceHud: React.FC = React.memo(() => {
  const { impactMap, reviewPacket } = useTaskStore();
  const { leases, timeline, evidenceStack } = useAgentStore();

  const memoryUpdates = reviewPacket?.memoryUpdates ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header shrink-0">
        <span>Intelligence HUD</span>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <Card title="Impact Guard" collapsible defaultCollapsed={false}>
          <ImpactGuardPanel impactMap={impactMap} />
        </Card>

        <Card title="Risk Radar" collapsible defaultCollapsed={false}>
          <RiskRadar
            risks={impactMap?.risk ? [{ dimension: 'Overall', level: impactMap.risk.level }] : undefined}
            overallLevel={impactMap?.risk.level}
          />
        </Card>

        <Card title="Agent Timeline" collapsible defaultCollapsed={false}>
          <AgentTimeline events={timeline} />
        </Card>

        <Card title="Context Lease" collapsible defaultCollapsed={true}>
          <ContextLeasePanel leases={leases} />
        </Card>

        <Card title="Evidence Stack" collapsible defaultCollapsed={true}>
          <EvidenceStackPanel entries={evidenceStack} />
        </Card>

        <Card title="Brain Updates" collapsible defaultCollapsed={true}>
          <BrainUpdatesPanel updates={memoryUpdates} />
        </Card>
      </div>
    </div>
  );
});

IntelligenceHud.displayName = 'IntelligenceHud';

export { IntelligenceHud };
