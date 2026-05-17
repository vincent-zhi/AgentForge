import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImpactGuardPanel } from './impact-guard-panel';
import { RiskRadar } from './risk-radar';
import { AgentTimeline } from './agent-timeline';
import { ContextLeasePanel } from './context-lease-panel';
import { EvidenceStackPanel } from './evidence-stack-panel';
import { BrainUpdatesPanel } from './brain-updates-panel';
import { ProgressiveDisclosure } from './progressive-disclosure';
import { useTaskStore, useAgentStore } from '@/store';

const riskVariant: Record<string, 'verified' | 'partial' | 'blocked'> = {
  low: 'verified',
  medium: 'partial',
  high: 'blocked',
  critical: 'blocked',
};

const IntelligenceHud: React.FC = React.memo(() => {
  const { impactMap, reviewPacket } = useTaskStore();
  const { leases, timeline, evidenceStack } = useAgentStore();

  const memoryUpdates = reviewPacket?.memoryUpdates ?? [];

  const summaryContent = impactMap ? (
    <Card title="Impact Guard Summary" collapsible defaultCollapsed={false}>
      <div className="flex items-center gap-3 py-1">
        <Badge variant={riskVariant[impactMap.risk.level]} label={impactMap.risk.level} />
        <span className="text-xs text-forged-steel">
          {impactMap.downstreamDependents.length} affected module(s)
        </span>
      </div>
    </Card>
  ) : (
    <Card title="Impact Guard Summary" collapsible defaultCollapsed={false}>
      <div className="text-xs text-forged-steel text-center py-4">
        No impact map available.
      </div>
    </Card>
  );

  const standardContent = (
    <>
      <Card title="Impact Guard" collapsible defaultCollapsed={false}>
        <ImpactGuardPanel impactMap={impactMap} />
      </Card>

      <Card title="Risk Radar" collapsible defaultCollapsed={false}>
        <RiskRadar
          risks={impactMap?.risk ? [{ dimension: 'Overall', level: impactMap.risk.level }] : undefined}
          overallLevel={impactMap?.risk.level}
        />
      </Card>
    </>
  );

  const fullContent = (
    <>
      <Card title="Evidence Stack" collapsible defaultCollapsed={true}>
        <EvidenceStackPanel entries={evidenceStack} />
      </Card>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header shrink-0">
        <span>Intelligence HUD</span>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <ProgressiveDisclosure riskLevel={impactMap?.risk.level ?? 'low'}>
          {{ summary: summaryContent, standard: standardContent, full: fullContent }}
        </ProgressiveDisclosure>

        <Card title="Agent Timeline" collapsible defaultCollapsed={false}>
          <AgentTimeline events={timeline} />
        </Card>

        <Card title="Context Lease" collapsible defaultCollapsed={true}>
          <ContextLeasePanel leases={leases} />
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
