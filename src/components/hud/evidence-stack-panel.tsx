import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EvidenceCheckmark } from '@/components/ui/evidence-checkmark';
import type { EvidenceEntry } from '@/types/core';

interface EvidenceStackPanelProps {
  entries: EvidenceEntry[];
}

const typeIcons: Record<string, string> = {
  command: '⌨️',
  test: '🧪',
  git: '🔀',
  agent_log: '🤖',
  file_read: '📖',
  file_write: '✏️',
};

const typeLabels: Record<string, string> = {
  command: 'Command',
  test: 'Test',
  git: 'Git',
  agent_log: 'Agent Log',
  file_read: 'File Read',
  file_write: 'File Write',
};

const typeOrder = ['command', 'test', 'git', 'agent_log'] as const;

const EvidenceStackPanel: React.FC<EvidenceStackPanelProps> = React.memo(({ entries }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = (() => {
    const map = new Map<string, EvidenceEntry[]>();
    for (const t of typeOrder) {
      map.set(t, []);
    }
    for (const e of entries) {
      const list = map.get(e.type) ?? [];
      list.push(e);
      if (!map.has(e.type)) map.set(e.type, list);
    }
    return map;
  })();

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No evidence collected yet. Evidence appears as agents execute tasks.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {typeOrder.map((type) => {
        const items = grouped.get(type) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">{typeIcons[type]}</span>
              <span className="text-xs text-forged-steel">{typeLabels[type]}</span>
              <span className="text-[10px] text-forged-steel">({items.length})</span>
            </div>
            <div className="space-y-1">
              {items.map((e) => {
                const isExpanded = expanded.has(e.id);
                return (
                  <div
                    key={e.id}
                    className="px-2 py-1 rounded-sm bg-forge-black/50 cursor-pointer hover:bg-forge-black/80 transition-colors duration-fast"
                    onClick={() => toggleExpand(e.id)}
                  >
                    <div className="flex items-center gap-2">
                      <EvidenceCheckmark verified={e.result === 'pass' || e.result === 'success'} label={e.result} />
                      <span className="text-xs flex-1 text-bright-steel truncate">{e.content}</span>
                      {e.result && (
                        <Badge
                          variant={e.result.includes('pass') || e.result.includes('success') ? 'verified' : 'blocked'}
                          label={e.result}
                        />
                      )}
                    </div>
                    <div className="text-[10px] text-forged-steel mt-0.5">{e.timestamp}</div>
                    {isExpanded && (
                      <div className="mt-1 text-xs text-text-gray whitespace-pre-wrap border-t border-forged-steel/10 pt-1">
                        {e.content}
                        {e.metadata && Object.keys(e.metadata).length > 0 && (
                          <div className="mt-1 text-[10px] text-forged-steel">
                            {JSON.stringify(e.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

EvidenceStackPanel.displayName = 'EvidenceStackPanel';

export { EvidenceStackPanel };
