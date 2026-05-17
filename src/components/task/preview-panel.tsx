import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { DiffView } from '@/components/ui/diff-view';
import { useTaskStore } from '@/store/task-store';

const intentLabels: Record<string, string> = {
  business_fix: '业务修复',
  compatibility: '兼容性保护',
  test_coverage: '测试覆盖',
  documentation: '文档更新',
  refactor: '附带重构',
};

const intentVariant: Record<string, 'ember' | 'analyzing' | 'verified' | 'unverified' | 'brain'> = {
  business_fix: 'ember',
  compatibility: 'analyzing',
  test_coverage: 'verified',
  documentation: 'unverified',
  refactor: 'brain',
};

const PreviewPanel: React.FC = React.memo(() => {
  const reviewPacket = useTaskStore((s) => s.reviewPacket);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const changedFiles = useMemo(() => reviewPacket?.changedFiles ?? [], [reviewPacket]);
  const intentDiffMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!reviewPacket?.intentDiff) return map;
    for (const diff of reviewPacket.intentDiff) {
      map.set(diff.file, diff.hunks.map((h) => h.content).join('\n'));
    }
    return map;
  }, [reviewPacket]);

  if (!reviewPacket || changedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-forged-steel">
        <span className="text-4xl mb-3">👁️</span>
        <span className="text-sm">暂无代码变更预览</span>
      </div>
    );
  }

  const selectedFile = changedFiles.find((f) => f.path === selectedPath);
  const selectedDiffContent = selectedPath ? intentDiffMap.get(selectedPath) ?? '' : '';

  return (
    <div className="flex h-full -m-4">
      <div className="w-64 shrink-0 border-r border-forged-steel/20 overflow-auto bg-[#0B0D10]">
        <div className="px-3 py-2 text-xs text-forged-steel border-b border-forged-steel/20">
          变更文件 ({changedFiles.length})
        </div>
        <div className="divide-y divide-forged-steel/10">
          {changedFiles.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelectedPath(f.path)}
              className={`w-full text-left px-3 py-2 transition-colors duration-fast ${
                selectedPath === f.path
                  ? 'bg-[#1A1D22] border-l-2 border-[#FF7A1A]'
                  : 'hover:bg-[#1A1D22]/50 border-l-2 border-transparent'
              }`}
            >
              <div className="text-xs font-mono text-bright-steel truncate mb-1">{f.path}</div>
              <div className="flex items-center gap-1.5">
                <Badge variant={intentVariant[f.intent] ?? 'default'} label={intentLabels[f.intent] ?? f.intent} />
                <span className="text-[10px] text-safe-green">+{f.additions}</span>
                <span className="text-[10px] text-risk-red">-{f.deletions}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[#0B0D10]">
        {selectedPath && selectedFile ? (
          <div className="p-4">
            <DiffView
              oldCode=""
              newCode={selectedDiffContent}
              fileName={selectedPath}
              intent={intentLabels[selectedFile.intent] ?? selectedFile.intent}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-forged-steel">
            <span className="text-sm">选择文件查看差异</span>
          </div>
        )}
      </div>
    </div>
  );
});

PreviewPanel.displayName = 'PreviewPanel';

export { PreviewPanel };
