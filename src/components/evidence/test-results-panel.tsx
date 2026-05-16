import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { VerificationResult } from '@/types/core';

interface TestResultsPanelProps {
  results: VerificationResult[];
}

const TestResultsPanel: React.FC<TestResultsPanelProps> = React.memo(({ results }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (results.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-4">
        No test results yet. Run tests to see results here.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map((r, i) => {
        const key = `${r.type}-${r.name}-${i}`;
        const isExpanded = expanded.has(key);
        return (
          <div
            key={key}
            className="px-2 py-1.5 rounded-sm bg-forge-black/50 cursor-pointer hover:bg-forge-black/80 transition-colors duration-fast"
            onClick={() => toggleExpand(key)}
          >
            <div className="flex items-center gap-2">
              <Badge variant={r.passed ? 'verified' : 'blocked'} label={r.passed ? 'PASS' : 'FAIL'} />
              <span className="text-xs text-bright-steel flex-1 truncate">{r.name}</span>
              <span className="text-[10px] text-forged-steel">{r.type}</span>
            </div>
            {isExpanded && r.details && (
              <div className="mt-1 text-xs text-text-gray whitespace-pre-wrap border-t border-forged-steel/10 pt-1">
                {r.details}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

TestResultsPanel.displayName = 'TestResultsPanel';

export { TestResultsPanel };
