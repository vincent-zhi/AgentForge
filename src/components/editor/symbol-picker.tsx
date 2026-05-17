import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'method';
  filePath: string;
  line: number;
  char: number;
  containerName?: string;
}

interface SymbolPickerProps {
  symbols: SymbolInfo[];
  onSelect: (symbol: SymbolInfo) => void;
  onClose: () => void;
  query: string;
}

const KIND_COLORS: Record<SymbolInfo['kind'], string> = {
  function: 'bg-blue-500/20 text-blue-400',
  method: 'bg-purple-500/20 text-purple-400',
  class: 'bg-ember-orange/20 text-ember-orange',
  interface: 'bg-cyan-500/20 text-cyan-400',
  type: 'bg-cyan-500/20 text-cyan-400',
  enum: 'bg-green-500/20 text-green-400',
  variable: 'bg-yellow-500/20 text-yellow-400',
};

const SymbolPicker: React.FC<SymbolPickerProps> = React.memo(({ symbols, onSelect, onClose, query: initialQuery }) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return symbols;
    const lower = query.toLowerCase();
    return symbols.filter(sym =>
      sym.name.toLowerCase().includes(lower) ||
      sym.containerName?.toLowerCase().includes(lower)
    );
  }, [symbols, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sym = filtered[activeIndex];
      if (sym) {
        onSelect(sym);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, activeIndex, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-forge-black border border-forged-steel/30 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-forged-steel/20 px-4">
          <svg className="w-4 h-4 text-forged-steel shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbols..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm text-bright-steel placeholder:text-forged-steel"
          />
          <kbd className="text-[10px] text-forged-steel bg-graphite px-1.5 py-0.5 rounded-sm border border-forged-steel/20">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filtered.map((sym, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={`${sym.filePath}:${sym.line}:${sym.name}`}
                data-index={idx}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-fast
                  ${isActive ? 'bg-ember-orange/10 text-bright-steel' : 'text-text-gray hover:bg-forged-steel/10'}`}
                onClick={() => onSelect(sym)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${KIND_COLORS[sym.kind]}`}>
                  {sym.kind}
                </span>
                <span className="flex-1 text-sm truncate">
                  {sym.containerName ? (
                    <>
                      <span className="text-forged-steel">{sym.containerName}.</span>
                      {sym.name}
                    </>
                  ) : (
                    sym.name
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-forged-steel truncate max-w-[140px]" title={sym.filePath}>
                  {sym.filePath.split('/').pop()}
                </span>
                <span className="shrink-0 text-[10px] text-forged-steel">
                  :{sym.line}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-forged-steel">No symbols found</div>
          )}
        </div>
      </div>
    </div>
  );
});

SymbolPicker.displayName = 'SymbolPicker';

export { SymbolPicker };
export type { SymbolInfo };
