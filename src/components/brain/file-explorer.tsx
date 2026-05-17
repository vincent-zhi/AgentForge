import React, { useEffect, useMemo } from 'react';
import { TreeView, type TreeItem } from '@/components/ui/tree-view';
import { useProjectStore } from '@/store';
import { useEditorStore } from '@/store/editor-store';
import type { TreeNode } from '@/store/project-store';

function getFileIcon(name: string): { icon: string; color: string } {
  if (name === 'package.json') return { icon: '📦', color: 'text-bright-steel' };
  if (/\.(ts|tsx)$/.test(name)) return { icon: '📄', color: 'text-blue-400' };
  if (/\.(js|jsx)$/.test(name)) return { icon: '📄', color: 'text-yellow-400' };
  if (/\.json$/.test(name)) return { icon: '📋', color: 'text-green-400' };
  if (/\.(css|scss|less|sass)$/.test(name)) return { icon: '🎨', color: 'text-purple-400' };
  if (/\.md$/.test(name)) return { icon: '📝', color: 'text-gray-400' };
  if (/^(tsconfig|vite\.config|jest\.config|vitest\.config|webpack\.config|rollup\.config|eslint|prettier|babel\.config|\.eslintrc|\.prettierrc)/.test(name)) {
    return { icon: '⚙️', color: 'text-orange-400' };
  }
  return { icon: '📄', color: 'text-forged-steel' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

function treeNodeToTreeItem(node: TreeNode): TreeItem {
  if (node.type === 'directory') {
    const sortedChildren = [...(node.children || [])].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return {
      id: node.id,
      label: node.label,
      icon: <span>📁</span>,
      defaultExpanded: node.path.split('/').length <= 2,
      children: sortedChildren.map(treeNodeToTreeItem),
    };
  }

  const { icon } = getFileIcon(node.label);
  const badge = node.size ? formatSize(node.size) : undefined;

  return {
    id: node.id,
    label: node.label,
    icon: <span>{icon}</span>,
    badge,
  };
}

const FileExplorer: React.FC = React.memo(() => {
  const { fileTree, rootPath } = useProjectStore();
  const openFile = useEditorStore((s: { openFile: (filePath: string) => void }) => s.openFile);

  useEffect(() => {
    if (rootPath && !fileTree) {
      useProjectStore.getState().loadFileTree(rootPath);
    }
  }, [rootPath, fileTree]);

  const treeItems = useMemo<TreeItem[]>(() => {
    if (!fileTree) return [];
    return [treeNodeToTreeItem(fileTree)];
  }, [fileTree]);

  const handleSelect = React.useCallback(
    (id: string) => {
      if (!fileTree || !rootPath) return;
      const node = findNodeById(fileTree, id);
      if (node && node.type === 'file') {
        const fullPath = rootPath + '/' + node.path;
        openFile(fullPath);
      }
    },
    [fileTree, rootPath, openFile],
  );

  if (!fileTree) {
    return (
      <div className="text-xs text-forged-steel text-center py-6">
        No project loaded.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <TreeView
        items={treeItems}
        onSelect={handleSelect}
        className="py-1"
      />
    </div>
  );
});

function findNodeById(node: TreeNode, id: string): TreeNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

FileExplorer.displayName = 'FileExplorer';

export { FileExplorer };
