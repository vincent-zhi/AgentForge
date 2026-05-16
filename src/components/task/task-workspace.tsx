import React, { useState, useMemo } from 'react';
import { SpecView } from './spec-view';
import { ReviewPacketView } from './review-packet-view';
import { IntentDiffViewer } from './intent-diff-viewer';
import { useTaskStore } from '@/store';

type TaskTab = 'spec' | 'editor' | 'intentDiff' | 'reviewPacket' | 'preview';

const tabs: { key: TaskTab; label: string }[] = [
  { key: 'spec', label: 'Spec' },
  { key: 'editor', label: 'Editor' },
  { key: 'intentDiff', label: 'Intent Diff' },
  { key: 'reviewPacket', label: 'Review Packet' },
  { key: 'preview', label: 'Preview' },
];

const TaskWorkspace: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TaskTab>('spec');
  const { tasks, currentTaskId, reviewPacket } = useTaskStore();

  const currentTask = useMemo(
    () => tasks.find((t) => t.id === currentTaskId) ?? null,
    [tasks, currentTaskId]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header shrink-0">
        <span>Task Workspace</span>
        {currentTask && (
          <span className="text-xs text-forged-steel ml-2 truncate max-w-[200px]">
            {currentTask.goal}
          </span>
        )}
      </div>
      <div className="flex shrink-0 border-b border-forged-steel/20">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-xs whitespace-nowrap transition-colors duration-fast ${
              activeTab === tab.key
                ? 'text-ember-orange border-b-2 border-ember-orange'
                : 'text-forged-steel hover:text-bright-steel'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!currentTask ? (
          <div className="flex flex-col items-center justify-center h-full text-forged-steel">
            <span className="text-4xl mb-3">📋</span>
            <span className="text-sm">No active task</span>
            <span className="text-xs mt-1">Create or select a task to begin</span>
          </div>
        ) : (
          <>
            {activeTab === 'spec' && <SpecView task={currentTask} />}

            {activeTab === 'editor' && (
              <div className="flex flex-col items-center justify-center h-full text-forged-steel">
                <span className="text-4xl mb-3">💻</span>
                <span className="text-sm font-medium">Monaco Editor - Coming Soon</span>
                <span className="text-xs mt-1">Integrated code editing will be available here</span>
              </div>
            )}

            {activeTab === 'intentDiff' && (
              <IntentDiffViewer diffs={reviewPacket?.intentDiff ?? []} />
            )}

            {activeTab === 'reviewPacket' && reviewPacket ? (
              <ReviewPacketView packet={reviewPacket} />
            ) : (
              activeTab === 'reviewPacket' && (
                <div className="flex flex-col items-center justify-center h-full text-forged-steel">
                  <span className="text-4xl mb-3">📝</span>
                  <span className="text-sm">No review packet available</span>
                  <span className="text-xs mt-1">Review packet is generated after task execution</span>
                </div>
              )
            )}

            {activeTab === 'preview' && (
              <div className="flex flex-col items-center justify-center h-full text-forged-steel">
                <span className="text-4xl mb-3">👁️</span>
                <span className="text-sm">Preview</span>
                <span className="text-xs mt-1">Live preview of changes will appear here</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

TaskWorkspace.displayName = 'TaskWorkspace';

export { TaskWorkspace };
