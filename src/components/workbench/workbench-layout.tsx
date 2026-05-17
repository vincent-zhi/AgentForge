import React, { useCallback, useState } from 'react';
import { useLayoutStore } from '@/store/layout-store';
import { useActivityStore } from '@/store/activity-store';
import { GoalBar } from './goal-bar';
import { PanelResizer } from './panel-resizer';
import { BrainNavigator } from '@/components/brain/brain-navigator';
import { TaskWorkspace } from '@/components/task/task-workspace';
import { IntelligenceHud } from '@/components/hud/intelligence-hud';
import { EvidenceConsole } from '@/components/evidence/evidence-console';
import { SearchPanel } from '@/components/search';
import { ActivityCenter } from '@/components/activity/activity-center';

const BRAIN_MIN = 200;
const BRAIN_MAX = 500;
const HUD_MIN = 240;
const HUD_MAX = 600;
const EVIDENCE_MIN = 100;
const EVIDENCE_MAX = 500;

export const WorkbenchLayout: React.FC = () => {
  const [activityOpen, setActivityOpen] = useState(false);
  const {
    brainPanelWidth,
    hudPanelWidth,
    evidencePanelHeight,
    evidencePanelCollapsed,
    searchPanelOpen,
    setBrainPanelWidth,
    setHudPanelWidth,
    setEvidencePanelHeight,
    toggleEvidencePanel,
  } = useLayoutStore();

  const unreadCount = useActivityStore((s) => s.unreadCount);

  const handleBrainResize = useCallback(
    (delta: number) => {
      setBrainPanelWidth(
        Math.min(BRAIN_MAX, Math.max(BRAIN_MIN, brainPanelWidth + delta)),
      );
    },
    [brainPanelWidth, setBrainPanelWidth],
  );

  const handleHudResize = useCallback(
    (delta: number) => {
      setHudPanelWidth(
        Math.min(HUD_MAX, Math.max(HUD_MIN, hudPanelWidth - delta)),
      );
    },
    [hudPanelWidth, setHudPanelWidth],
  );

  const handleEvidenceResize = useCallback(
    (delta: number) => {
      setEvidencePanelHeight(
        Math.min(EVIDENCE_MAX, Math.max(EVIDENCE_MIN, evidencePanelHeight - delta)),
      );
    },
    [evidencePanelHeight, setEvidencePanelHeight],
  );

  return (
    <div className="h-full flex flex-col bg-forge-black relative">
      <GoalBar />

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-shrink-0 bg-graphite border-r border-forged-steel/20 overflow-auto"
          style={{ width: brainPanelWidth }}
        >
          <BrainNavigator />
        </div>

        <PanelResizer direction="horizontal" onResize={handleBrainResize} minSize={BRAIN_MIN} maxSize={BRAIN_MAX} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-forge-black overflow-auto relative">
              <TaskWorkspace />
              <button
                onClick={() => setActivityOpen(!activityOpen)}
                className="absolute top-3 right-3 z-panel text-forged-steel hover:text-bright-steel transition-colors p-1.5 rounded-md hover:bg-graphite"
                title="活动中心"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-risk-red text-bright-steel text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <PanelResizer direction="horizontal" onResize={handleHudResize} minSize={HUD_MIN} maxSize={HUD_MAX} />

            <div
              className="flex-shrink-0 bg-graphite border-l border-forged-steel/20 overflow-auto"
              style={{ width: hudPanelWidth }}
            >
              <IntelligenceHud />
            </div>
          </div>

          {!evidencePanelCollapsed && (
            <>
              <PanelResizer direction="vertical" onResize={handleEvidenceResize} minSize={EVIDENCE_MIN} maxSize={EVIDENCE_MAX} />

              <div
                className="flex-shrink-0 bg-graphite border-t border-forged-steel/20 overflow-auto"
                style={{ height: evidencePanelHeight }}
              >
                <EvidenceConsole />
              </div>
            </>
          )}

          {evidencePanelCollapsed && (
            <div
              className="flex-shrink-0 bg-graphite border-t border-forged-steel/20 cursor-pointer hover:bg-graphite/80"
              onClick={toggleEvidencePanel}
            >
              <div className="panel-header py-1">
                <span className="text-xs">Evidence Console</span>
                <span className="text-xs text-forged-steel">▶</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchPanelOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-graphite border-l border-forged-steel/20 z-overlay shadow-xl animate-slide-in-right">
          <SearchPanel />
        </div>
      )}

      <ActivityCenter open={activityOpen} onClose={() => setActivityOpen(false)} />
    </div>
  );
};
