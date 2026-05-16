import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from './badge';

type DiffViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewProps {
  oldCode: string;
  newCode: string;
  fileName?: string;
  intent?: string;
  className?: string;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        result.push({
          type: 'unchanged',
          content: oldLines[oldIdx],
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      } else if (!newSet.has(oldLines[oldIdx]) || (newSet.has(oldLines[oldIdx]) && !oldSet.has(newLines[newIdx]))) {
        if (!newSet.has(oldLines[oldIdx])) {
          result.push({
            type: 'remove',
            content: oldLines[oldIdx],
            oldLineNumber: oldIdx + 1,
          });
          oldIdx++;
        } else {
          result.push({
            type: 'add',
            content: newLines[newIdx],
            newLineNumber: newIdx + 1,
          });
          newIdx++;
        }
      } else {
        result.push({
          type: 'remove',
          content: oldLines[oldIdx],
          oldLineNumber: oldIdx + 1,
        });
        oldIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      result.push({
        type: 'remove',
        content: oldLines[oldIdx],
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else {
      result.push({
        type: 'add',
        content: newLines[newIdx],
        newLineNumber: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

const UnifiedLine: React.FC<{ line: DiffLine }> = React.memo(({ line }) => {
  const bgClass = line.type === 'add'
    ? 'bg-safe-green/10'
    : line.type === 'remove'
    ? 'bg-risk-red/10'
    : '';
  const textClass = line.type === 'add'
    ? 'text-safe-green'
    : line.type === 'remove'
    ? 'text-risk-red'
    : 'text-text-gray';
  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

  return (
    <div className={`flex font-mono text-xs leading-5 ${bgClass}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-forged-steel select-none border-r border-forged-steel/10">
        {line.oldLineNumber ?? ''}
      </span>
      <span className="w-10 shrink-0 text-right pr-2 text-forged-steel select-none border-r border-forged-steel/10">
        {line.newLineNumber ?? ''}
      </span>
      <span className={`w-5 shrink-0 text-center select-none ${textClass}`}>{prefix}</span>
      <span className={`flex-1 pl-2 whitespace-pre ${textClass}`}>{line.content}</span>
    </div>
  );
});

UnifiedLine.displayName = 'UnifiedLine';

const SplitLine: React.FC<{ line: DiffLine }> = React.memo(({ line }) => {
  const bgClass = line.type === 'add'
    ? 'bg-safe-green/10'
    : line.type === 'remove'
    ? 'bg-risk-red/10'
    : '';
  const textClass = line.type === 'add'
    ? 'text-safe-green'
    : line.type === 'remove'
    ? 'text-risk-red'
    : 'text-text-gray';

  return (
    <div className="flex font-mono text-xs leading-5">
      <div className={`flex-1 flex ${line.type === 'remove' ? bgClass : ''}`}>
        <span className="w-10 shrink-0 text-right pr-2 text-forged-steel select-none border-r border-forged-steel/10">
          {line.oldLineNumber ?? ''}
        </span>
        <span className={`flex-1 pl-2 whitespace-pre ${line.type === 'remove' ? textClass : 'text-text-gray'}`}>
          {line.type !== 'add' ? line.content : ''}
        </span>
      </div>
      <div className={`flex-1 flex border-l border-forged-steel/20 ${line.type === 'add' ? bgClass : ''}`}>
        <span className="w-10 shrink-0 text-right pr-2 text-forged-steel select-none border-r border-forged-steel/10">
          {line.newLineNumber ?? ''}
        </span>
        <span className={`flex-1 pl-2 whitespace-pre ${line.type === 'add' ? textClass : 'text-text-gray'}`}>
          {line.type !== 'remove' ? line.content : ''}
        </span>
      </div>
    </div>
  );
});

SplitLine.displayName = 'SplitLine';

const DiffView: React.FC<DiffViewProps> = React.memo(({ oldCode, newCode, fileName, intent, className = '' }) => {
  const [mode, setMode] = useState<DiffViewMode>('unified');

  const diffLines = useMemo(() => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    return computeDiff(oldLines, newLines);
  }, [oldCode, newCode]);

  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'add').length;
    const removed = diffLines.filter(l => l.type === 'remove').length;
    return { added, removed };
  }, [diffLines]);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'unified' ? 'split' : 'unified');
  }, []);

  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <div className="flex items-center gap-2">
          {fileName && <span className="text-bright-steel font-medium">{fileName}</span>}
          {intent && <Badge variant="ember" label={intent} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-safe-green">+{stats.added}</span>
          <span className="text-xs text-risk-red">-{stats.removed}</span>
          <button
            onClick={toggleMode}
            className="text-xs text-forged-steel hover:text-bright-steel px-2 py-0.5 rounded-sm hover:bg-forged-steel/10 transition-colors duration-fast"
          >
            {mode === 'unified' ? 'Split' : 'Unified'}
          </button>
        </div>
      </div>
      <div className="overflow-auto max-h-96">
        {mode === 'unified' ? (
          diffLines.map((line, i) => <UnifiedLine key={i} line={line} />)
        ) : (
          diffLines.map((line, i) => <SplitLine key={i} line={line} />)
        )}
      </div>
    </div>
  );
});

DiffView.displayName = 'DiffView';

export { DiffView };
