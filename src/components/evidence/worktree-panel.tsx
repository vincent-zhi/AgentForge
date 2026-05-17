import React, { useState, useEffect, useCallback } from 'react';
import { Chip } from '@/components/ui/chip';
import { bridge } from '@/ipc/bridge';
import { useProjectStore } from '@/store/project-store';

interface WorktreeInfo {
  path: string;
  branch: string;
  isCurrent: boolean;
}

const WorktreePanel: React.FC = React.memo(() => {
  const { rootPath } = useProjectStore();
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WorktreeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWorktrees = useCallback(async () => {
    if (!rootPath) return;
    try {
      const result = await bridge.git.listWorktrees(rootPath) as WorktreeInfo[];
      if (Array.isArray(result)) {
        setWorktrees(result);
      }
    } catch {}
  }, [rootPath]);

  useEffect(() => {
    loadWorktrees();
  }, [loadWorktrees]);

  const handleCreate = useCallback(async () => {
    if (!rootPath || !newBranchName.trim()) return;
    setLoading(true);
    try {
      const worktreePath = `${rootPath}-${newBranchName.trim()}`;
      await bridge.git.createWorktree(rootPath, newBranchName.trim(), worktreePath);
      setShowNewDialog(false);
      setNewBranchName('');
      await loadWorktrees();
    } catch {} finally {
      setLoading(false);
    }
  }, [rootPath, newBranchName, loadWorktrees]);

  const handleDelete = useCallback(async (wt: WorktreeInfo) => {
    if (!rootPath) return;
    setLoading(true);
    try {
      await bridge.git.removeWorktree(rootPath, wt.path);
      setDeleteTarget(null);
      await loadWorktrees();
    } catch {} finally {
      setLoading(false);
    }
  }, [rootPath, loadWorktrees]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-forged-steel">Worktrees</span>
        <button
          onClick={() => setShowNewDialog(true)}
          className="px-2 py-0.5 text-[10px] rounded-sm bg-ember-orange/10 text-ember-orange border border-ember-orange/20 hover:bg-ember-orange/20 transition-colors"
        >
          + New Worktree
        </button>
      </div>

      {worktrees.length === 0 ? (
        <div className="text-[10px] text-forged-steel text-center py-2">
          No worktrees found.
        </div>
      ) : (
        <div className="space-y-1">
          {worktrees.map((wt) => (
            <div
              key={wt.path}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-forge-black/50"
            >
              {wt.isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-safe-green flex-shrink-0" />
              )}
              <span className="text-xs font-mono text-bright-steel flex-1 truncate" title={wt.path}>
                {wt.path.split('/').pop()}
              </span>
              <Chip label={wt.branch || 'HEAD'} size="sm" variant={wt.isCurrent ? 'green' : 'default'} />
              {!wt.isCurrent && (
                <button
                  onClick={() => setDeleteTarget(wt)}
                  className="text-forged-steel hover:text-risk-red transition-colors text-xs flex-shrink-0"
                  title="Remove worktree"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forge-black/60">
          <div className="bg-graphite rounded-md p-4 w-80 border border-forged-steel/20 space-y-3">
            <div className="text-sm text-bright-steel font-medium">New Worktree</div>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name"
              className="input-field w-full text-sm py-1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowNewDialog(false); setNewBranchName(''); }}
                className="px-3 py-1 text-xs text-forged-steel hover:text-bright-steel transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newBranchName.trim() || loading}
                className="btn-primary px-3 py-1 text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forge-black/60">
          <div className="bg-graphite rounded-md p-4 w-80 border border-forged-steel/20 space-y-3">
            <div className="text-sm text-bright-steel font-medium">Remove Worktree</div>
            <div className="text-xs text-text-gray">
              Are you sure you want to remove the worktree at <span className="font-mono text-bright-steel">{deleteTarget.path}</span>?
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1 text-xs text-forged-steel hover:text-bright-steel transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={loading}
                className="px-3 py-1 text-xs bg-risk-red/10 text-risk-red border border-risk-red/20 rounded-sm hover:bg-risk-red/20 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WorktreePanel.displayName = 'WorktreePanel';

export { WorktreePanel };
