import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  category?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  className?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = React.memo(({ open, onClose, commands, className = '' }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.category?.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      const cat = cmd.category ?? 'Commands';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(flatList.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + flatList.length) % Math.max(flatList.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = flatList[activeIndex];
      if (cmd) {
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [flatList, activeIndex, onClose]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div
        className={`w-full max-w-lg bg-graphite border border-forged-steel/30 rounded-lg shadow-xl overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-forged-steel/20 px-4">
          <svg className="w-4 h-4 text-forged-steel shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm text-bright-steel placeholder:text-forged-steel"
          />
          <kbd className="text-[10px] text-forged-steel bg-forge-black px-1.5 py-0.5 rounded-sm border border-forged-steel/20">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-forged-steel uppercase tracking-wider">
                {category}
              </div>
              {cmds.map((cmd) => {
                const idx = globalIdx++;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={cmd.id}
                    data-index={idx}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-fast
                      ${isActive ? 'bg-ember-orange/10 text-bright-steel' : 'text-text-gray hover:bg-forged-steel/10'}`}
                    onClick={() => {
                      onClose();
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {cmd.icon && <span className="shrink-0">{cmd.icon}</span>}
                    <span className="flex-1 text-sm">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-forged-steel bg-forge-black px-1.5 py-0.5 rounded-sm border border-forged-steel/20">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {flatList.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-forged-steel">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';

export { CommandPalette };
export type { Command };
