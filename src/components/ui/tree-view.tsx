import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from './badge';

interface TreeItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeItem[];
  badge?: string;
  defaultExpanded?: boolean;
}

interface TreeViewProps {
  items: TreeItem[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  className?: string;
}

const TreeNode: React.FC<{
  item: TreeItem;
  depth: number;
  onSelect?: (id: string) => void;
  selectedId?: string;
  focusedId: string | null;
}> = React.memo(({ item, depth, onSelect, selectedId, focusedId }) => {
  const [expanded, setExpanded] = useState(item.defaultExpanded ?? false);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;
  const isFocused = focusedId === item.id;

  const handleSelect = useCallback(() => {
    onSelect?.(item.id);
    if (hasChildren) {
      setExpanded(prev => !prev);
    }
  }, [onSelect, item.id, hasChildren]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      e.preventDefault();
      setExpanded(true);
    } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      e.preventDefault();
      setExpanded(false);
    }
  }, [handleSelect, hasChildren, expanded]);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-sm cursor-pointer text-sm transition-colors duration-fast
          ${isSelected ? 'bg-ember-orange/15 text-ember-orange' : isFocused ? 'bg-forged-steel/10 text-bright-steel' : 'text-text-gray hover:bg-forged-steel/10 hover:text-bright-steel'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        tabIndex={isFocused ? 0 : -1}
        data-tree-id={item.id}
      >
        {hasChildren ? (
          <svg
            className={`w-3 h-3 shrink-0 text-forged-steel transition-transform duration-normal ${expanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {item.icon && <span className="shrink-0">{item.icon}</span>}
        <span className="truncate flex-1">{item.label}</span>
        {item.badge && (
          <Badge variant="default" label={item.badge} className="shrink-0" />
        )}
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="relative">
          <div
            className="absolute top-0 bottom-0 border-l border-forged-steel/20"
            style={{ left: `${depth * 16 + 16}px` }}
          />
          {item.children!.map(child => (
            <TreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              focusedId={focusedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

TreeNode.displayName = 'TreeNode';

const TreeView: React.FC<TreeViewProps> = React.memo(({ items, onSelect, selectedId, className = '' }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLUListElement>(null);

  const getAllIds = useCallback((treeItems: TreeItem[]): string[] => {
    const ids: string[] = [];
    const traverse = (nodes: TreeItem[]) => {
      for (const node of nodes) {
        ids.push(node.id);
        if (node.children) traverse(node.children);
      }
    };
    traverse(treeItems);
    return ids;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allIds = getAllIds(items);
    const currentIndex = focusedId ? allIds.indexOf(focusedId) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < allIds.length - 1 ? currentIndex + 1 : 0;
      setFocusedId(allIds[nextIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : allIds.length - 1;
      setFocusedId(allIds[prevIndex]);
    }
  }, [items, focusedId, getAllIds]);

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-tree-id="${focusedId}"]`) as HTMLElement | null;
    el?.focus();
  }, [focusedId]);

  return (
    <ul
      ref={containerRef}
      role="tree"
      className={`text-sm ${className}`}
      onKeyDown={handleKeyDown}
    >
      {items.map(item => (
        <TreeNode
          key={item.id}
          item={item}
          depth={0}
          onSelect={onSelect}
          selectedId={selectedId}
          focusedId={focusedId}
        />
      ))}
    </ul>
  );
});

TreeView.displayName = 'TreeView';

export { TreeView };
export type { TreeItem };
