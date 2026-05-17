import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ModuleTree } from './module-tree';
import { ContractList } from './contract-list';
import { FactSearch } from './fact-search';
import { FileExplorer } from './file-explorer';
import { MemoryPanel } from './memory-panel';
import { ADRDialog } from './adr-dialog';
import { useProjectStore } from '@/store';
import { bridge } from '@/ipc/bridge';
import type { ContractRef } from '@/types/core';
import type { ADR } from '@/kernel/project-brain/adr-manager';

type BrainTab = 'files' | 'overview' | 'modules' | 'contracts' | 'apis' | 'tests' | 'decisions' | 'memory' | 'search';

const tabs: { key: BrainTab; label: string }[] = [
  { key: 'files', label: 'Files' },
  { key: 'overview', label: 'Overview' },
  { key: 'modules', label: 'Modules' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'apis', label: 'APIs' },
  { key: 'tests', label: 'Tests' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'memory', label: 'Memory' },
  { key: 'search', label: 'Search' },
];

const BrainNavigator: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<BrainTab>('files');
  const [selectedModule, setSelectedModule] = useState<string | undefined>();
  const [adrDialogOpen, setAdrDialogOpen] = useState(false);
  const [editingADR, setEditingADR] = useState<ADR | null>(null);
  const { scanResult, modules, facts } = useProjectStore();

  const contracts = useMemo<ContractRef[]>(() => {
    return facts
      .filter((f) => f.type === 'contract')
      .map((f) => ({
        id: f.id,
        type: (f.scope.modules[0] as ContractRef['type']) || 'api',
        name: f.statement,
        provider: f.scope.modules[0] ?? 'unknown',
        consumers: f.scope.modules.slice(1),
        compatibility: 'flexible' as const,
      }));
  }, [facts]);

  const apiFacts = useMemo(() => facts.filter((f) => f.type === 'api'), [facts]);
  const testFacts = useMemo(() => facts.filter((f) => f.type === 'test'), [facts]);
  const decisionFacts = useMemo(() => facts.filter((f) => f.type === 'decision'), [facts]);

  const stats = useMemo(() => ({
    modules: modules.length,
    contracts: contracts.length,
    tests: testFacts.length,
    risks: facts.filter((f) => f.type === 'risk').length,
  }), [modules.length, contracts.length, testFacts.length, facts]);

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header shrink-0">
        <span>Brain Navigator</span>
      </div>
      <div className="flex shrink-0 border-b border-forged-steel/20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs whitespace-nowrap transition-colors duration-fast ${
              activeTab === tab.key
                ? 'text-ember-orange border-b-2 border-ember-orange'
                : 'text-forged-steel hover:text-bright-steel'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'files' && (
          <FileExplorer />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-forge-black/50 rounded-md p-3">
                <div className="text-xs text-forged-steel">Modules</div>
                <div className="text-lg text-bright-steel font-semibold">{stats.modules}</div>
              </div>
              <div className="bg-forge-black/50 rounded-md p-3">
                <div className="text-xs text-forged-steel">Contracts</div>
                <div className="text-lg text-bright-steel font-semibold">{stats.contracts}</div>
              </div>
              <div className="bg-forge-black/50 rounded-md p-3">
                <div className="text-xs text-forged-steel">Tests</div>
                <div className="text-lg text-bright-steel font-semibold">{stats.tests}</div>
              </div>
              <div className="bg-forge-black/50 rounded-md p-3">
                <div className="text-xs text-forged-steel">Risk Markers</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg text-bright-steel font-semibold">{stats.risks}</span>
                  {stats.risks > 0 && <Badge variant="blocked" label="!" />}
                </div>
              </div>
            </div>
            {scanResult && (
              <div className="bg-forge-black/50 rounded-md p-3 space-y-1">
                <div className="text-xs text-forged-steel">Project</div>
                <div className="text-sm text-bright-steel">{scanResult.name}</div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="analyzing" label={scanResult.language} />
                  {scanResult.framework && <Badge variant="brain" label={scanResult.framework} />}
                  {scanResult.packageManager && <Badge variant="default" label={scanResult.packageManager} />}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'modules' && (
          <ModuleTree
            modules={modules}
            selectedId={selectedModule}
            onSelect={setSelectedModule}
          />
        )}

        {activeTab === 'contracts' && (
          <ContractList contracts={contracts} />
        )}

        {activeTab === 'apis' && (
          <div className="space-y-1.5">
            {apiFacts.length === 0 ? (
              <div className="text-xs text-forged-steel text-center py-6">
                No public APIs discovered yet.
              </div>
            ) : (
              apiFacts.map((f) => (
                <div
                  key={f.id}
                  className="px-2 py-1.5 rounded-sm bg-forge-black/50 hover:bg-forge-black/80 transition-colors duration-fast"
                >
                  <div className="text-sm text-bright-steel truncate">{f.statement}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {f.scope.modules.map((m) => (
                      <Badge key={m} variant="analyzing" label={m} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-2">
            {testFacts.length === 0 ? (
              <div className="text-xs text-forged-steel text-center py-6">
                No test mappings available.
              </div>
            ) : (
              testFacts.map((f) => (
                <div
                  key={f.id}
                  className="px-2 py-1.5 rounded-sm bg-forge-black/50"
                >
                  <div className="text-sm text-bright-steel truncate">{f.statement}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="verified" label="test" />
                    {f.scope.modules.map((m) => (
                      <Badge key={m} variant="default" label={m} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-forged-steel">Architecture Decisions</span>
              <button
                onClick={() => { setEditingADR(null); setAdrDialogOpen(true); }}
                className="text-xs text-ember-orange hover:text-bright-steel transition-colors"
              >
                + New Decision
              </button>
            </div>
            {decisionFacts.length === 0 ? (
              <div className="text-xs text-forged-steel text-center py-6">
                No architecture decisions recorded.
              </div>
            ) : (
              decisionFacts.map((f) => (
                <div
                  key={f.id}
                  className="px-2 py-1.5 rounded-sm bg-forge-black/50"
                >
                  <div className="text-sm text-bright-steel">{f.statement}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="brain" label="decision" />
                    <Badge
                      variant={f.confidence === 'high' ? 'verified' : f.confidence === 'medium' ? 'partial' : 'blocked'}
                      label={f.confidence}
                    />
                  </div>
                </div>
              ))
            )}
            <ADRDialog
              open={adrDialogOpen}
              onClose={() => setAdrDialogOpen(false)}
              editADR={editingADR}
              onSave={(data) => {
                bridge.runtime.executeCommand(
                  `agentforge-adr-create ${JSON.stringify(data)}`
                ).catch(() => {});
              }}
            />
          </div>
        )}

        {activeTab === 'memory' && (
          <MemoryPanel />
        )}

        {activeTab === 'search' && (
          <FactSearch facts={facts} />
        )}
      </div>
    </div>
  );
});

BrainNavigator.displayName = 'BrainNavigator';

export { BrainNavigator };
