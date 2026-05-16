import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TestResultsPanel } from './test-results-panel';
import { useAgentStore } from '@/store';
import type { EvidenceEntry } from '@/types/core';

type EvidenceTab = 'terminal' | 'tests' | 'logs' | 'git' | 'sandbox';

const tabs: { key: EvidenceTab; label: string }[] = [
  { key: 'terminal', label: 'Terminal' },
  { key: 'tests', label: 'Tests' },
  { key: 'logs', label: 'Logs' },
  { key: 'git', label: 'Git' },
  { key: 'sandbox', label: 'Sandbox' },
];

const EvidenceConsole: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('terminal');
  const { evidenceStack } = useAgentStore();

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
          <div className="flex flex-col items-center justify-center h-full text-forged-steel">
            <span className="text-2xl mb-2">🖥️</span>
            <span className="text-xs">Terminal - Coming Soon</span>
            <span className="text-[10px] mt-1">xterm.js integration will be available here</span>
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
        )}

        {activeTab === 'sandbox' && (
          <div className="flex flex-col items-center justify-center h-full text-forged-steel">
            <span className="text-2xl mb-2">📦</span>
            <span className="text-xs">Sandbox</span>
            <span className="text-[10px] mt-1">Sandbox environment status will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
});

EvidenceConsole.displayName = 'EvidenceConsole';

export { EvidenceConsole };
