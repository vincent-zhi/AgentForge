import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { TestResultsPanel } from './test-results-panel';
import { WorktreePanel } from './worktree-panel';
import { TerminalInstance } from '@/components/terminal';
import { DebugPanel } from '@/components/debug/debug-panel';
import { useAgentStore } from '@/store';
import { useProjectStore } from '@/store/project-store';
import { bridge } from '@/ipc/bridge';
import type { EvidenceEntry } from '@/types/core';

type EvidenceTab = 'terminal' | 'tests' | 'logs' | 'git' | 'ci' | 'sandbox' | 'debug';

const tabs: { key: EvidenceTab; label: string }[] = [
  { key: 'terminal', label: 'Terminal' },
  { key: 'tests', label: 'Tests' },
  { key: 'logs', label: 'Logs' },
  { key: 'git', label: 'Git' },
  { key: 'ci', label: 'CI' },
  { key: 'sandbox', label: 'Sandbox' },
  { key: 'debug', label: 'Debug' },
];

const EvidenceConsole: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('terminal');
  const { evidenceStack } = useAgentStore();
  const projectPath = useProjectStore((s) => s.rootPath);
  const [ciWorkflows, setCiWorkflows] = useState<Array<{ name: string; type: string; path: string; triggers?: string[] }>>([]);

  useEffect(() => {
    if (activeTab === 'ci' && projectPath) {
      bridge.ci.detect(projectPath).then((result) => {
        if (Array.isArray(result)) {
          setCiWorkflows(result);
        }
      }).catch(() => {});
    }
  }, [activeTab, projectPath]);

  const testResults = useMemo(
    () => evidenceStack.filter((e) => e.type === 'test').map((e) => ({
      type: 'test' as const,
      name: e.content.slice(0, 60),
      passed: e.result?.includes('pass') ?? e.result?.includes('success') ?? false,
      details: e.result,
    })),
    [evidenceStack]
  );

  const logEntries = useMemo(
    () => evidenceStack.filter((e) => e.type === 'agent_log' || e.type === 'command'),
    [evidenceStack]
  );

  const gitEntries = useMemo(
    () => evidenceStack.filter((e) => e.type === 'git'),
    [evidenceStack]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 border-b border-forged-steel/20">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1 text-xs whitespace-nowrap transition-colors duration-fast ${
              activeTab === tab.key
                ? 'text-ember-orange border-b-2 border-ember-orange'
                : 'text-forged-steel hover:text-bright-steel'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {activeTab === 'terminal' && (
          <div className="h-full w-full">
            <TerminalInstance />
          </div>
        )}

        {activeTab === 'tests' && <TestResultsPanel results={testResults} />}

        {activeTab === 'logs' && (
          <div className="space-y-1">
            {logEntries.length === 0 ? (
              <div className="text-xs text-forged-steel text-center py-4">
                No log entries yet.
              </div>
            ) : (
              logEntries.map((e: EvidenceEntry) => (
                <div key={e.id} className="flex items-start gap-2 px-1 py-0.5">
                  <span className="text-[10px] text-forged-steel shrink-0">{e.timestamp}</span>
                  <span className="text-text-gray">{e.content}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'git' && (
          <div className="space-y-3">
            <div className="space-y-1">
              {gitEntries.length === 0 ? (
                <div className="text-xs text-forged-steel text-center py-4">
                  No git activity yet.
                </div>
              ) : (
                gitEntries.map((e: EvidenceEntry) => (
                  <div key={e.id} className="flex items-start gap-2 px-1 py-0.5">
                    <Badge variant="partial" label="git" />
                    <span className="text-text-gray flex-1">{e.content}</span>
                    {e.result && <Badge variant="verified" label={e.result} />}
                  </div>
                ))
              )}
            </div>
            <WorktreePanel />
          </div>
        )}

        {activeTab === 'ci' && (
          <div className="space-y-2">
            {ciWorkflows.length === 0 ? (
              <div className="text-xs text-forged-steel text-center py-4">
                No CI configurations detected.
              </div>
            ) : (
              ciWorkflows.map((wf, idx) => (
                <div key={idx} className="px-2 py-1.5 rounded-sm bg-forge-black/50">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        wf.type === 'github-actions' ? 'analyzing' :
                        wf.type === 'gitlab-ci' ? 'brain' :
                        wf.type === 'jenkins' ? 'partial' :
                        'default'
                      }
                      label={wf.type}
                    />
                    <span className="text-sm text-bright-steel">{wf.name}</span>
                  </div>
                  <div className="text-[10px] text-forged-steel mt-1 font-mono truncate">{wf.path}</div>
                  {wf.triggers && wf.triggers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {wf.triggers.map((trigger) => (
                        <Badge key={trigger} variant="default" label={trigger} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sandbox' && (
          <WorktreePanel />
        )}

        {activeTab === 'debug' && <DebugPanel />}
      </div>
    </div>
  );
});

EvidenceConsole.displayName = 'EvidenceConsole';

export { EvidenceConsole };
