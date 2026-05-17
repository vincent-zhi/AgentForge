import React, { useRef, useEffect } from 'react';

interface EditorTab {
  id: string;
  path: string;
  name: string;
  modified: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId?: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = React.memo(({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex shrink-0 bg-forge-black/80 border-b border-forged-steel/20 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          data-tab-id={tab.id}
          className={`
            group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer
            border-b-2 shrink-0 transition-colors duration-fast select-none
            ${activeTabId === tab.id
              ? 'text-bright-steel border-ember-orange bg-graphite/50'
              : 'text-forged-steel border-transparent hover:text-bright-steel hover:bg-graphite/30'
            }
          `}
          onClick={() => onTabSelect(tab.id)}
        >
          <span className="truncate max-w-[120px]">{tab.name}</span>
          {tab.modified && (
            <span className="w-1.5 h-1.5 rounded-full bg-ember-orange shrink-0" />
          )}
          <button
            className="ml-1 w-4 h-4 flex items-center justify-center rounded-sm text-forged-steel hover:text-bright-steel hover:bg-forged-steel/20 opacity-0 group-hover:opacity-100 transition-opacity duration-fast shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});

EditorTabs.displayName = 'EditorTabs';

export { EditorTabs };
export type { EditorTab, EditorTabsProps };
