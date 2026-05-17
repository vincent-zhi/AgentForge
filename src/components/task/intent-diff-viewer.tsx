import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { IntentLabel } from '@/components/ui/intent-label';
import { DiffView } from '@/components/ui/diff-view';
import type { IntentDiff, IntentType } from '@/types/core';

interface IntentDiffViewerProps {
  diffs: IntentDiff[];
}

const intentGroups: { type: IntentType; label: string; variant: 'ember' | 'analyzing' | 'verified' | 'unverified' | 'brain' }[] = [
  { type: 'business_fix', label: '业务修复', variant: 'ember' },
  { type: 'compatibility', label: '兼容性保护', variant: 'analyzing' },
  { type: 'test_coverage', label: '测试覆盖', variant: 'verified' },
  { type: 'documentation', label: '文档更新', variant: 'unverified' },
  { type: 'refactor', label: '附带重构', variant: 'brain' },
];

const IntentDiffViewer: React.FC<IntentDiffViewerProps> = React.memo(({ diffs }) => {
  const grouped = useMemo(() => {
    const map = new Map<IntentType, IntentDiff[]>();
    for (const g of intentGroups) {
      map.set(g.type, []);
    }
    for (const diff of diffs) {
      const primaryIntent = diff.hunks[0]?.intent ?? 'refactor';
      const list = map.get(primaryIntent) ?? [];
      list.push(diff);
      map.set(primaryIntent, list);
    }
    return map;
  }, [diffs]);

  if (diffs.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-6">
        No intent diffs available. Diffs appear after code changes are made.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {intentGroups.map(({ type, label, variant }) => {
        const items = grouped.get(type) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={variant} label={label} />
              <span className="text-xs text-forged-steel">{items.length} file{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {items.map((diff) => (
                <div key={diff.file}>
                  <div className="flex items-center gap-2 mb-1">
                    {diff.hunks.map((h, i) => (
                      <IntentLabel key={i} intent={h.intent} />
                    ))}
                  </div>
                  <DiffView
                    oldCode=""
                    newCode={diff.hunks.map((h) => h.content).join('\n')}
                    fileName={diff.file}
                    intent={label}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

IntentDiffViewer.displayName = 'IntentDiffViewer';

export { IntentDiffViewer };
