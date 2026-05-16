import React, { useMemo } from 'react';
import { TreeView } from '@/components/ui/tree-view';
import type { TreeItem } from '@/components/ui/tree-view';
import type { ModuleInfo } from '@/types/core';

interface ModuleTreeProps {
  modules: ModuleInfo[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function buildTreeItems(modules: ModuleInfo[]): TreeItem[] {
  const root: TreeItem[] = [];
  const pathMap = new Map<string, TreeItem>();

  const sorted = [...modules].sort((a, b) => a.path.localeCompare(b.path));

  for (const mod of sorted) {
    const parts = mod.path.split('/').filter(Boolean);
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap.has(currentPath)) {
        const isLeaf = i === parts.length - 1;
        const isPackage = isLeaf && mod.type === 'package';
        const isDir = !isLeaf || (isLeaf && mod.type === 'directory');
        const isHighRisk = isLeaf && (mod.riskLevel === 'high' || mod.riskLevel === 'critical');

        const item: TreeItem = {
          id: currentPath,
          label: part,
          icon: <span>{isPackage ? '📦' : isDir ? '📁' : '📄'}</span>,
          badge: isHighRisk ? mod.riskLevel : undefined,
          defaultExpanded: i === 0,
          children: [],
        };

        pathMap.set(currentPath, item);

        if (parentPath && pathMap.has(parentPath)) {
          pathMap.get(parentPath)!.children!.push(item);
        } else {
          root.push(item);
        }
      }
    }
  }

  return root;
}

const ModuleTree: React.FC<ModuleTreeProps> = React.memo(({ modules, selectedId, onSelect }) => {
  const treeItems = useMemo(() => buildTreeItems(modules), [modules]);

  if (modules.length === 0) {
    return (
      <div className="text-xs text-forged-steel text-center py-6">
        No modules loaded. Scan a project to populate the module tree.
      </div>
    );
  }

  return (
    <TreeView
      items={treeItems}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
});

ModuleTree.displayName = 'ModuleTree';

export { ModuleTree };
