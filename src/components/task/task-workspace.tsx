import React, { useState, useMemo, useCallback } from 'react';
import { SpecView } from './spec-view';
import { ReviewPacketView } from './review-packet-view';
import { IntentDiffViewer } from './intent-diff-viewer';
import { EditorTabs, MonacoEditor } from '@/components/editor';
import { useTaskStore, useEditorStore } from '@/store';

type TaskTab = 'spec' | 'editor' | 'intentDiff' | 'reviewPacket' | 'preview';

const taskTabs: { key: TaskTab; label: string }[] = [
  { key: 'spec', label: 'Spec' },
  { key: 'editor', label: 'Editor' },
  { key: 'intentDiff', label: 'Intent Diff' },
  { key: 'reviewPacket', label: 'Review Packet' },
  { key: 'preview', label: 'Preview' },
];

const TaskWorkspace: React.FC = React.memo(() => {
  const [activeTaskTab, setActiveTaskTab] = useState<TaskTab>('spec');
  const { tasks, currentTaskId, reviewPacket } = useTaskStore();
  const { tabs: editorTabs, activeTabId, contents, setActiveTab: setEditorActiveTab, closeTab, saveFile, updateContent } = useEditorStore();

  const currentTask = useMemo(
    () => tasks.find((t) => t.id === currentTaskId) ?? null,
    [tasks, currentTaskId]
  );

  const activeEditorTab = useMemo(
    () => editorTabs.find((t) => t.id === activeTabId) ?? null,
    [editorTabs, activeTabId]
  );

  const activeContent = activeEditorTab ? contents.get(activeEditorTab.path) : undefined;

  const handleEditorSave = useCallback((content: string) => {
    if (!activeTabId) return;
    updateContent(activeTabId, content);
    saveFile(activeTabId);
  }, [activeTabId, updateContent, saveFile]);

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
        {taskTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTaskTab(tab.key)}
            className={`px-4 py-1.5 text-xs whitespace-nowrap transition-colors duration-fast ${
              activeTaskTab === tab.key
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
            {activeTaskTab === 'spec' && <SpecView task={currentTask} />}

            {activeTaskTab === 'editor' && (
              <div className="flex flex-col h-full -m-4">
                <EditorTabs
                  tabs={editorTabs}
                  activeTabId={activeTabId ?? undefined}
                  onTabSelect={setEditorActiveTab}
                  onTabClose={closeTab}
                />
                {activeEditorTab ? (
                  <MonacoEditor
                    filePath={activeEditorTab.path}
                    content={activeContent}
                    onSave={handleEditorSave}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-forged-steel">
                    <span className="text-4xl mb-3">💻</span>
                    <span className="text-sm">No file open</span>
                    <span className="text-xs mt-1">Select a file from Brain Navigator to start editing</span>
                  </div>
                )}
              </div>
            )}

            {activeTaskTab === 'intentDiff' && (
              <IntentDiffViewer diffs={reviewPacket?.intentDiff ?? []} />
            )}

            {activeTaskTab === 'reviewPacket' && reviewPacket ? (
              <ReviewPacketView packet={reviewPacket} />
            ) : (
              activeTaskTab === 'reviewPacket' && (
                <div className="flex flex-col items-center justify-center h-full text-forged-steel">
                  <span className="text-4xl mb-3">📝</span>
                  <span className="text-sm">No review packet available</span>
                  <span className="text-xs mt-1">Review packet is generated after task execution</span>
                </div>
              )
            )}

            {activeTaskTab === 'preview' && (
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
